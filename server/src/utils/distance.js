import ApiError from './ApiError.js';

export const MAX_DELIVERY_DISTANCE_KM = 10; // Giới hạn tối đa 10km
export const BASE_DISTANCE_KM = 2; // 2km đầu tiên
export const BASE_SHIPPING_FEE = 15000; // 15.000 VNĐ cho 2km đầu
export const PER_KM_FEE = 5000; // 5.000 VNĐ cho mỗi km tiếp theo

// Tọa độ trung tâm mặc định tại khu vực Hòa Lạc (Đại học FPT Hà Nội)
export const DEFAULT_HOA_LAC_COORDINATES = { lat: 21.0131, lng: 105.5255 };

/**
 * Tự động tìm tọa độ GPS từ chuỗi địa chỉ bằng OpenStreetMap Nominatim Geocoding API.
 * Hoàn toàn động, không fix cứng bất kỳ danh sách hay từ khóa regex nào.
 * @param {string} addressString Địa chỉ dạng text
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export const resolveLocationFromAddress = async (addressString) => {
  if (!addressString || typeof addressString !== 'string' || !addressString.trim()) {
    return DEFAULT_HOA_LAC_COORDINATES;
  }

  const cleanText = addressString.trim();

  // Gọi OpenStreetMap Nominatim Geocoding API động
  try {
    const query = /Thạch Thất|Hòa Lạc|Hà Nội/i.test(cleanText) ? cleanText : `${cleanText}, Thạch Thất, Hà Nội`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FoodDeliverySystem/1.0',
        'Accept-Language': 'vi',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    }
  } catch {
    // Nếu mạng chậm hoặc timeout, fallback về tọa độ trung tâm
  }

  // Fallback mặc định khu vực trung tâm Hòa Lạc
  return DEFAULT_HOA_LAC_COORDINATES;
};

/**
 * Lấy lộ trình đường đi thực tế từ OSRM (Open Source Routing Machine) của OpenStreetMap.
 * Trả về quãng đường thực tế từng mét theo đường sá xe chạy (km) và thời gian ước tính (phút).
 *
 * @param {number} lat1 Vĩ độ điểm đi (Nhà hàng)
 * @param {number} lon1 Kinh độ điểm đi (Nhà hàng)
 * @param {number} lat2 Vĩ độ điểm đến (Khách hàng)
 * @param {number} lon2 Kinh độ điểm đến (Khách hàng)
 * @returns {Promise<{ distanceKm: number, durationMinutes: number }>}
 */
export const getRouteDistanceAndDuration = async (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    throw new ApiError(400, 'Thiếu tọa độ GPS của nhà hàng hoặc địa chỉ nhận hàng để tìm đường.');
  }

  // OSRM format yêu cầu: {longitude},{latitude};{longitude},{latitude}
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;

  let res;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'Dịch vụ bản đồ OSRM phản hồi quá lâu. Vui lòng thử lại sau.');
    }
    throw new ApiError(503, `Không thể kết nối đến máy chủ bản đồ OSRM: ${err.message}`);
  }

  if (!res.ok) {
    throw new ApiError(res.status, 'Không thể lấy thông tin lộ trình từ máy chủ OSRM');
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new ApiError(400, 'Không tìm thấy lộ trình đường bộ phù hợp giữa hai điểm này.');
  }

  const route = data.routes[0];
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const durationMinutes = Math.max(1, Math.round(route.duration / 60));

  return {
    distanceKm,
    durationMinutes,
  };
};

/**
 * Tính cước phí vận chuyển dựa trên khoảng cách (km)
 * - Tối đa 10km
 * - 2km đầu: 15.000đ
 * - Mỗi km tiếp theo: +5.000đ / km (làm tròn lên theo km)
 * @param {number} distanceKm
 * @returns {number} Phí vận chuyển (VNĐ)
 */
export const calculateShippingFee = (distanceKm) => {
  const dist = Number(distanceKm) || 0;

  if (dist > MAX_DELIVERY_DISTANCE_KM) {
    throw new ApiError(
      400,
      `Khoảng cách giao hàng theo đường thực tế là ${dist} km, vượt quá bán kính giao hàng tối đa cho phép (${MAX_DELIVERY_DISTANCE_KM} km). Vui lòng chọn địa chỉ khác gần hơn.`,
    );
  }

  if (dist <= BASE_DISTANCE_KM) {
    return BASE_SHIPPING_FEE;
  }

  const extraKm = Math.ceil(dist - BASE_DISTANCE_KM);
  return BASE_SHIPPING_FEE + extraKm * PER_KM_FEE;
};
