import Food from '../models/Food.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Cooldown tracker for models that hit 429 quota exhaustion or 503 overload
const modelCooldowns = new Map();

/**
 * Helper to call Gemini GenerateContent with timeout and fallback models
 */
async function callGeminiApi({ apiKey, primaryModel, contents, systemInstruction, timeoutMs = 12000 }) {
  const modelsToTry = [
    primaryModel || 'gemini-3.5-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
  ];

  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];
  const now = Date.now();

  for (const model of uniqueModels) {
    // If model is in cooldown due to quota limit (429) or overload (503), skip it
    if (modelCooldowns.has(model) && modelCooldowns.get(model) > now) {
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const status = res.status;
        const msg = errorData?.error?.message || res.statusText;
        console.warn(`[aiChatService] Model ${model} returned status ${status}: ${msg}`);

        // If quota exceeded (429) or service unavailable (503), cool down for 10 minutes
        if (status === 429 || status === 503) {
          modelCooldowns.set(model, now + 10 * 60 * 1000);
        }
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && (text.includes('experiencing high demand') || text.includes('Please try again later'))) {
        console.warn(`[aiChatService] Model ${model} is overloaded. Trying fallback...`);
        modelCooldowns.set(model, now + 10 * 60 * 1000);
        continue;
      }
      if (text && text.trim()) {
        return { text: text.trim(), modelUsed: model };
      }
    } catch (err) {
      console.warn(`[aiChatService] Model ${model} failed/timed out (${err.message}). Trying fallback...`);
      // Put on short cooldown (2 min) if timed out
      modelCooldowns.set(model, now + 2 * 60 * 1000);
    }
  }

  throw new Error('Tất cả các model Gemini đều không phản hồi trong thời gian quy định.');
}

/**
 * Smart Fallback Engine: Uses database queries and intent parsing when AI is unavailable
 */
async function fallbackDatabaseEngine({ message, user, availableItems }) {
  const lowerMsg = (message || '').toLowerCase().trim();

  // 1. Intent: Order Tracking
  if (
    lowerMsg.includes('đơn hàng') ||
    lowerMsg.includes('đơn của tôi') ||
    lowerMsg.includes('tra cứu đơn') ||
    lowerMsg.includes('vận chuyển') ||
    lowerMsg.includes('đang ở đâu')
  ) {
    if (!user) {
      return {
        reply: 'Bạn có thể vào mục "Lịch sử đơn hàng" ở thanh menu góc trên màn hình để kiểm tra tình trạng đơn hàng của mình nhé! Hoặc cho mình biết bạn muốn tìm thêm món ngon nào hôm nay?',
        dishes: availableItems.slice(0, 3),
        quickReplies: ['🔥 Món bán chạy', '🍚 Cơm tấm sườn', '🛵 Freeship đơn đầu'],
      };
    }

    const latestOrder = await Order.findOne({ customer: user._id || user.id })
      .sort({ createdAt: -1 })
      .populate('restaurant', 'name')
      .lean();

    if (!latestOrder) {
      return {
        reply: `Chào ${user.fullName || user.name || 'bạn'}! Bạn chưa có đơn hàng nào trong hệ thống. Hãy chọn vài món ngon để trải nghiệm dịch vụ giao hàng siêu tốc 20 phút của chúng mình nhé!`,
        dishes: availableItems.slice(0, 3),
        quickReplies: ['🔥 Món bán chạy nhất', '🍚 Cơm trưa', '🥤 Trà sữa'],
      };
    }

    const statusMap = {
      pending: 'Đang chờ quán xác nhận ⏳',
      confirmed: 'Quán đã nhận đơn và chuẩn bị 🍳',
      preparing: 'Đang nấu nướng nóng hổi 🍲',
      ready_for_pickup: 'Đã sẵn sàng, chờ shipper lấy hàng 🛵',
      delivering: 'Shipper đang trên đường giao đến bạn 🚀',
      completed: 'Đã giao thành công 🎉',
      cancelled: 'Đã hủy ❌',
    };

    const statusText = statusMap[latestOrder.status] || latestOrder.status;
    const orderCode = latestOrder.orderCode || latestOrder.orderNumber || latestOrder._id.toString().slice(-6);

    return {
      reply: `Đơn hàng gần nhất của bạn là **#${orderCode}** từ quán **${latestOrder.restaurant?.name || 'Đối tác'}**.\n\n📍 Trạng thái hiện tại: **${statusText}**\n💵 Tổng thanh toán: **${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(latestOrder.totalAmount || latestOrder.total || 0)}**. Bạn có thể vào mục *Lịch sử đơn hàng* để theo dõi chi tiết vị trí shipper nhé!`,
      dishes: [],
      quickReplies: ['Xem chi tiết đơn', 'Đặt thêm món khác', 'Cần hỗ trợ đơn hàng'],
    };
  }

  // 2. Intent: Promotion / Freeship
  if (lowerMsg.includes('khuyến mãi') || lowerMsg.includes('mã') || lowerMsg.includes('freeship') || lowerMsg.includes('giảm giá')) {
    return {
      reply: 'Hiện tại FoodDelivery đang có các ưu đãi cực hot:\n- 🛵 **FREESHIP**: Miễn phí giao hàng cho đơn từ 100k.\n- 🎟️ **GIAM25K**: Giảm 25.000đ cho đơn hàng đầu tiên của khách mới.\n- 🎁 **MUA1TANG1**: Mua 1 tặng 1 tại các quán đối tác nổi bật.\n\nBạn có thể nhập mã ngay tại bước thanh toán nhé!',
      dishes: availableItems.filter((d) => d.originalPrice && d.originalPrice > d.price).slice(0, 3),
      quickReplies: ['🔥 Món bán chạy', '🍚 Cơm trưa dưới 50k', '🥤 Trà sữa'],
    };
  }

  // 3. Intent: Price filtering (e.g. dưới 50k, giá rẻ, bình dân)
  let budget = null;
  const priceMatch = lowerMsg.match(/(?:dưới|<|tầm|khoảng|bé hơn|nhỏ hơn)?\s*(\d+)\s*(k|nghìn|ngàn|000)/);
  if (priceMatch) {
    const num = parseInt(priceMatch[1], 10);
    budget = num * 1000;
  } else if (lowerMsg.includes('giá rẻ') || lowerMsg.includes('bình dân') || lowerMsg.includes('tiết kiệm') || lowerMsg.includes('hạt dẻ')) {
    budget = 50000;
  }

  if (budget) {
    let pool = availableItems;
    let labelCategory = '';
    if (lowerMsg.includes('cơm')) {
      pool = availableItems.filter((d) => d.name.toLowerCase().includes('cơm'));
      labelCategory = 'cơm ';
    } else if (lowerMsg.includes('phở') || lowerMsg.includes('bún')) {
      pool = availableItems.filter((d) => d.name.toLowerCase().includes('phở') || d.name.toLowerCase().includes('bún'));
      labelCategory = 'bún/phở ';
    } else if (lowerMsg.includes('trà') || lowerMsg.includes('nước') || lowerMsg.includes('uống')) {
      pool = availableItems.filter((d) => (d.category || '').toLowerCase().includes('đồ uống') || (d.category || '').toLowerCase().includes('trà'));
      labelCategory = 'đồ uống ';
    }

    // Exact items: strictly price <= budget
    const underBudget = pool.filter((d) => d.price <= budget);
    // Upsell items: slightly higher than budget (budget < price <= budget + 15000)
    const slightlyHigher = pool.filter((d) => d.price > budget && d.price <= budget + 15000);

    const budgetLabel = `${budget / 1000}k`;
    let reply = '';
    const resultDishes = [];

    if (underBudget.length > 0) {
      reply = `Dạ, với ngân sách dưới ${budgetLabel}, FoodDelivery gợi ý cho bạn những món ${labelCategory}rất ngon miệng, đầy đặn và tiết kiệm:\n` +
        underBudget.slice(0, 2).map((d) => `• **${d.name}** – ${new Intl.NumberFormat('vi-VN').format(d.price)}đ`).join('\n');
      resultDishes.push(...underBudget.slice(0, 3));
    } else {
      reply = `Hiện tại chưa có món ${labelCategory}dưới ${budgetLabel}. Bạn có thể tham khảo các món có mức giá hợp lý dưới đây nhé:`;
      resultDishes.push(...pool.slice(0, 2));
    }

    // Add polite upsell note for dishes slightly above budget
    if (slightlyHigher.length > 0) {
      const extra = slightlyHigher[0];
      const extraPrice = new Intl.NumberFormat('vi-VN').format(extra.price);
      reply += `\n\n💡 *Ngoài ra, bạn có thể tham khảo thêm món **${extra.name}** với mức giá nhỉnh hơn một chút (${extraPrice}đ) nhưng rất chất lượng và được nhiều khách hàng yêu thích nhé!*`;
      resultDishes.push(extra);
    }

    return {
      reply,
      dishes: resultDishes.length > 0 ? resultDishes : availableItems.slice(0, 3),
      quickReplies: ['🔥 Món bán chạy nhất', '🍚 Cơm sườn 45k', '🥤 Trà sữa', '🛵 Freeship đơn từ 100k'],
    };
  }

  // 4. Intent: Search by food keywords
  const notRice = lowerMsg.includes('ngoài cơm') || lowerMsg.includes('không ăn cơm') || lowerMsg.includes('trừ cơm');

  const keywords = [
    { word: 'cơm', label: 'Cơm ngon', skip: notRice },
    { word: 'phở', label: 'Phở truyền thống' },
    { word: 'bún', label: 'Bún thơm ngon' },
    { word: 'burger', label: 'Burger bò nướng' },
    { word: 'pizza', label: 'Pizza giòn rụm' },
    { word: 'trà sữa', label: 'Trà sữa thanh mát' },
    { word: 'gà', label: 'Gà rán giòn rụm' },
    { word: 'chay', label: 'Món chay thanh tịnh' },
    { word: 'bánh mì', label: 'Bánh mì đặc biệt' },
    { word: 'cà phê', label: 'Cà phê nguyên chất' },
  ];

  for (const kw of keywords) {
    if (!kw.skip && lowerMsg.includes(kw.word)) {
      const matched = availableItems.filter((d) => d.name.toLowerCase().includes(kw.word)).slice(0, 4);
      if (matched.length > 0) {
        return {
          reply: `Tuyệt vời! FoodDelivery có những món **${kw.label}** cực kỳ hấp dẫn dành cho bạn đây:`,
          dishes: matched,
          quickReplies: ['Xem thêm món khác', '🔥 Món bán chạy', '🛵 Freeship đơn từ 100k'],
        };
      }
    }
  }

  // 5. Default General Greeting / Recommendation
  return {
    reply: `Chào bạn! Tôi là **FoodBot** - Trợ lý ẩm thực của FoodDelivery 🍽️.\n\nHôm nay bạn muốn thưởng thức món gì? Bạn có thể hỏi tôi:\n- *"Gợi ý món ăn trưa dưới 50k"*\n- *"Tìm quán phở bò hoặc cơm tấm"*\n- *"Gợi ý các món bán chạy nhất"*\n\nDưới đây là một số món nổi bật đang được nhiều người chọn nhất hôm nay:`,
    dishes: availableItems.slice(0, 4),
    quickReplies: ['🔥 Món bán chạy nhất', '🍚 Cơm trưa dưới 50k', '🥤 Trà sữa trân châu', '🍔 Burger & Gà rán'],
  };
}

/**
 * Main function: Process incoming chat message
 */
export const processChatMessage = async ({ message, history = [], user = null }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // 1. Query available dishes from MongoDB (Food model) to provide accurate ground truth context
  let availableItems = [];
  try {
    // Primary customer food catalog
    availableItems = await Food.find({ isAvailable: true })
      .populate('restaurant', 'name address rating image')
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    // Fallback to MenuItem if Food is empty
    if (!availableItems || availableItems.length === 0) {
      availableItems = await MenuItem.find({ isAvailable: true })
        .populate('restaurant', 'name address rating image')
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(40)
        .lean();
    }
  } catch (dbErr) {
    console.warn('[aiChatService] DB fetch availableItems warning:', dbErr.message);
  }

  // Format dishes for LLM context (names, prices, and descriptions - without technical IDs)
  const menuContext = (availableItems && availableItems.length > 0)
    ? availableItems
        .map(
          (item) =>
            `- Món: "${item.name}" | Giá: ${item.price.toLocaleString('vi-VN')}đ${
              item.originalPrice ? ` (Giá gốc: ${item.originalPrice.toLocaleString('vi-VN')}đ)` : ''
            } | Quán: "${item.restaurant?.name || 'Đối tác'}" | Danh mục: "${item.category || ''}" | Mô tả: "${item.description || ''}"`
        )
        .join('\n')
    : 'Hệ thống đang đồng bộ thực đơn các món ăn.';

  // Customer context (if authenticated)
  let customerContext = 'Khách vãng lai chưa đăng nhập.';
  if (user) {
    customerContext = `Khách hàng đã đăng nhập: Tên "${user.fullName || user.name || 'Bạn'}", Email: "${user.email || ''}".`;
    try {
      const recentOrder = await Order.findOne({ customer: user._id || user.id })
        .sort({ createdAt: -1 })
        .populate('restaurant', 'name')
        .lean();
      if (recentOrder) {
        const orderCode = recentOrder.orderCode || recentOrder.orderNumber || recentOrder._id.toString().slice(-6);
        customerContext += ` Đơn hàng gần nhất: Mã #${orderCode}, Quán "${recentOrder.restaurant?.name || ''}", Trạng thái: "${recentOrder.status}", Tổng tiền: ${recentOrder.totalAmount || recentOrder.total} VND.`;
      }
    } catch {
      // Ignore order lookup errors
    }
  }

  // If no Gemini API key configured, use the smart fallback DB engine directly
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    console.log('[aiChatService] No valid GEMINI_API_KEY found, using Smart Database NLP Engine.');
    return fallbackDatabaseEngine({ message, user, availableItems });
  }

  // 2. Prepare System Instruction and Conversation Contents for Gemini
  const systemInstruction = `Bạn là FoodBot - Trợ lý ẩm thực AI thông minh, nhanh nhẹn và cực kỳ chu đáo của nền tảng FoodDelivery.
Thông tin khách hàng: ${customerContext}

DANH SÁCH THỰC ĐƠN THỰC TẾ TRONG HỆ THỐNG:
${menuContext}

QUY TẮC BẮT BUỘC KHÔNG ĐƯỢC VI PHẠM:
1. Tên nền tảng duy nhất là FoodDelivery (TUYỆT ĐỐI KHÔNG gọi là CraveDash, Cash hay bất kỳ tên nào khác).
2. Trả lời bằng tiếng Việt thân thiện, tự nhiên, lịch thiệp, dùng emoji phong phú (🍜, 🍚, 🍕, 🍔, 🥤, 🛵, ✨).
3. ĐÚNG MÓN & ĐÚNG GIÁ TIỀN (CỰC KỲ QUAN TRỌNG):
   - Khi khách yêu cầu món theo mức giá (ví dụ: "dưới 50k", "tầm 40k", "giá rẻ", "bình dân"):
     + Bạn BẮT BUỘC phải ưu tiên các món CÓ GIÁ NHỎ HƠN HOẶC BẰNG mức ngân sách của khách trước (ví dụ: khách hỏi "dưới 50k", các món phù hợp là <= 50.000đ như Cơm Tấm Sườn Nướng 45k, Cơm Gà Xé Phay 48k, Cơm Chiên Dương Châu 50k).
     + NẾU bạn muốn gợi ý thêm món có giá cao hơn ngân sách của khách (ví dụ món 55k hoặc 65k): BẮT BUỘC phải nói rõ ràng, lịch sự rằng đây là món tham khảo thêm với mức giá nhỉnh hơn một chút, ví dụ:
       "Ngoài ra, bạn có thể tham khảo thêm món [Tên món] với mức giá nhỉnh hơn một chút ([Giá]k) nhưng [lý do ngon/hấp dẫn] nhé!"
     + TUYỆT ĐỐI KHÔNG được giới thiệu món vượt ngân sách như thể nó nằm dưới mức giá khách yêu cầu.
4. BẢO MẬT & TRÌNH BÀY SẠCH SẼ:
   - TUYỆT ĐỐI KHÔNG viết bất kỳ chuỗi ID hay mã số kỹ thuật nào vào câu trả lời gửi khách hàng.
   - TUYỆT ĐỐI KHÔNG dùng dấu backtick (\`) trong câu trả lời văn bản.
5. TUYỆT ĐỐI KHÔNG giục khách đăng nhập và KHÔNG đưa nút đăng nhập vào danh sách gợi ý. Khách có thể thoải mái hỏi món và tham khảo thực đơn tự do.
6. Khi khách hỏi về đơn hàng của mình: nếu khách đã có thông tin đơn hàng ở trên, giải thích rõ trạng thái cho khách. Nếu chưa có đơn hoặc chưa đăng nhập, hướng dẫn khách xem mục Lịch sử đơn hàng trên thanh menu.
7. ĐỊNH DẠNG ĐẦU RA:
- Trả lời bằng văn bản tự nhiên, ngắn gọn, súc tích (khoảng 2-4 câu).
- Ở CUỐI CÙNG của câu trả lời, hãy đính kèm một khối JSON duy nhất nằm trong cặp thẻ \`\`\`json và \`\`\` chứa:
  - "suggestedDishNames": danh sách mảng tên chính xác của các món bạn vừa gợi ý (tối đa 3-4 món, lấy đúng tên trong danh sách thực đơn).
  - "quickReplies": mảng 3-4 câu gợi ý ngắn gọn tiếp theo về món ăn (ví dụ: ["🍚 Cơm sườn 45k", "🍜 Phở bò tái lăn", "🥤 Trà sữa", "🔥 Bán chạy nhất"]). TUYỆT ĐỐI KHÔNG chứa từ khóa hay nút đăng nhập.

Ví dụ định dạng phần cuối:
\`\`\`json
{
  "suggestedDishNames": ["Cơm Tấm Sườn Nướng Mật Ong", "Cơm Chiên Dương Châu Xá Xíu"],
  "quickReplies": ["🍚 Cơm sườn 45k", "🥤 Trà sữa", "🍔 Burger phô mai"]
}
\`\`\``;

  // Build chat contents from history (last 4 turns) + current message
  const contents = [];
  if (Array.isArray(history)) {
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      if (h.sender === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else if (h.sender === 'bot') {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const { text: geminiRawOutput, modelUsed } = await callGeminiApi({
      apiKey,
      primaryModel,
      contents,
      systemInstruction,
      timeoutMs: 12000,
    });

    // 3. Parse JSON block from Gemini output
    let cleanReply = geminiRawOutput;
    let suggestedDishNames = [];
    let quickReplies = ['🔥 Món bán chạy nhất', '🍚 Cơm trưa dưới 50k', '🥤 Trà sữa', '📦 Đơn của tôi'];

    const jsonMatch = geminiRawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.suggestedDishNames)) {
          suggestedDishNames = parsed.suggestedDishNames;
        } else if (Array.isArray(parsed.suggestedDishIds)) {
          suggestedDishNames = parsed.suggestedDishIds;
        }
        if (Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0) {
          quickReplies = parsed.quickReplies.filter(
            (r) =>
              !r.toLowerCase().includes('đăng nhập') &&
              !r.toLowerCase().includes('login') &&
              !r.toLowerCase().includes('tài khoản')
          );
        }
        if (!quickReplies || quickReplies.length === 0) {
          quickReplies = ['🔥 Món bán chạy nhất', '🍚 Cơm trưa dưới 50k', '🥤 Trà sữa trân châu', '🍔 Burger & Gà rán'];
        }
      } catch {
        // Parsing failed, ignore
      }
      cleanReply = geminiRawOutput.replace(jsonMatch[0], '').trim();
    } else {
      // In case json block was cut off or malformed
      cleanReply = cleanReply.replace(/```(?:json)?[\s\S]*$/i, '').trim();
    }

    // --- AGGRESSIVE DEFENSE-IN-DEPTH SANITIZATION ---
    // A. Strip any MongoDB ObjectIds or labeled IDs (16 to 32 hex chars)
    cleanReply = cleanReply.replace(/(?:[-*•]\s*)?(?:MÃ_HỆ_THỐNG|ID_NOI_BO|ID|Mã|Mã món|Mã số)?\s*[:：\-]?\s*[`'"]?[0-9a-fA-F]{16,32}[`'"]?/gi, '');
    cleanReply = cleanReply.replace(/\b[0-9a-fA-F]{16,32}\b/gi, '');

    // B. Strip any stray backticks completely
    cleanReply = cleanReply.replace(/`+/g, '');

    // C. Clean up empty bullets, leftover trailing colons/dashes, empty parentheses `()`, or stray punctuation lines
    cleanReply = cleanReply
      .split('\n')
      .map((line) => line.trim().replace(/[:：\-—\s]+$/, ''))
      .filter((line) => line && !/^[-*•—_=+~#\s]+$/.test(line) && !/^\(\s*\)$/.test(line))
      .join('\n')
      .trim();

    // 4. Retrieve full dish objects matching suggestedDishNames or suggestedDishIds
    let matchedDishes = [];
    if (suggestedDishNames.length > 0) {
      matchedDishes = availableItems.filter((item) =>
        suggestedDishNames.some((nameOrId) => {
          const s = String(nameOrId).toLowerCase().trim();
          return item.name.toLowerCase().includes(s) || s.includes(item.name.toLowerCase()) || item._id.toString() === s;
        })
      );
    }

    // If still empty, search by dish names in the clean reply text
    if (matchedDishes.length === 0) {
      const lowerReply = cleanReply.toLowerCase();
      matchedDishes = availableItems.filter((item) => lowerReply.includes(item.name.toLowerCase())).slice(0, 4);
    }

    // If still empty, search based on keywords in user message (e.g. "cơm", "phở", "trà sữa", "burger")
    if (matchedDishes.length === 0) {
      const lowerMsg = (message || '').toLowerCase();
      const keywords = ['cơm', 'phở', 'bún', 'burger', 'gà', 'trà sữa', 'trà', 'khoai', 'salad', 'bánh mì', 'nem'];
      const matchedKw = keywords.find((k) => lowerMsg.includes(k));
      if (matchedKw) {
        matchedDishes = availableItems.filter((item) => item.name.toLowerCase().includes(matchedKw)).slice(0, 4);
      }
    }

    // If user asks for general recommendations, provide top dishes
    if (
      matchedDishes.length === 0 &&
      (lowerMsg.includes('gợi ý') || lowerMsg.includes('món') || lowerMsg.includes('ăn gì') || lowerMsg.includes('bán chạy') || lowerMsg.includes('hot'))
    ) {
      matchedDishes = availableItems.slice(0, 3);
    }

    // 5. Smart Budget & Ordering Validation
    const lowerUserMsg = (message || '').toLowerCase();
    let userBudget = null;
    const bMatch = lowerUserMsg.match(/(?:dưới|<|tầm|khoảng|bé hơn|nhỏ hơn)?\s*(\d+)\s*(k|nghìn|ngàn|000)/);
    if (bMatch) {
      const bNum = parseInt(bMatch[1], 10);
      userBudget = bNum * 1000;
    } else if (lowerUserMsg.includes('dưới 50k')) {
      userBudget = 50000;
    }

    if (userBudget) {
      // Sort so dishes <= userBudget are shown first
      matchedDishes.sort((a, b) => {
        const aUnder = a.price <= userBudget ? 0 : 1;
        const bUnder = b.price <= userBudget ? 0 : 1;
        return aUnder - bUnder || a.price - b.price;
      });

      // If no dish under budget was returned, automatically prepend suitable under-budget dishes
      const hasUnderBudget = matchedDishes.some((d) => d.price <= userBudget);
      if (!hasUnderBudget) {
        let matchingUnderBudget = [];
        if (lowerUserMsg.includes('cơm')) {
          matchingUnderBudget = availableItems.filter((d) => d.name.toLowerCase().includes('cơm') && d.price <= userBudget);
        } else if (lowerUserMsg.includes('phở') || lowerUserMsg.includes('bún')) {
          matchingUnderBudget = availableItems.filter(
            (d) => (d.name.toLowerCase().includes('phở') || d.name.toLowerCase().includes('bún')) && d.price <= userBudget
          );
        } else {
          matchingUnderBudget = availableItems.filter((d) => d.price <= userBudget);
        }
        if (matchingUnderBudget.length > 0) {
          matchedDishes = [...matchingUnderBudget.slice(0, 2), ...matchedDishes.slice(0, 2)];
        }
      }
    }

    return {
      reply: cleanReply,
      dishes: matchedDishes,
      quickReplies,
    };
  } catch (err) {
    console.warn('[aiChatService] Gemini API error, falling back to Smart Database Engine:', err.message);
    return fallbackDatabaseEngine({ message, user, availableItems });
  }
};
