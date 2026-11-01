import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import Food from '../models/Food.js';
import Address from '../models/Address.js';
import User from '../models/User.js';

const HOA_LAC_RESTAURANTS = [
  {
    name: 'Cơm Gà Nướng & Cơm Rang 99 - Tân Xã',
    address: 'Thôn 2, Xã Tân Xã, Huyện Thạch Thất, Hà Nội',
    phone: '0981123456',
    description: 'Cơm gà nướng sốt cay, cơm rang dưa bò giòn rụm cho sinh viên FPT & VNU Hòa Lạc',
    rating: 4.9,
    ratingCount: 340,
    categories: ['Cơm & Mì Phở'],
    location: { lat: 21.018, lng: 105.535 },
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Cơm Gà Nướng Than Hoa Sốt Cay',
        description: 'Đùi gà nướng sốt ướp mật ong cay nồng, ăn kèm cơm dẻo, dưa góp và canh rong biển.',
        price: 45000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Cơm Rang Dưa Bò Giòn Rụm',
        description: 'Cơm chiên hạt tơi giòn tan, thịt bò mềm xào cùng dưa chua giòn ngọt đậm đà.',
        price: 40000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Cơm Sườn Nướng Mật Ong',
        description: 'Cốt lết sườn tảng ướp mật ong rừng nướng thơm lừng, kèm trứng ốp la béo ngậy.',
        price: 45000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
  {
    name: 'Bún Bò Huế & Bún Đậu O Mai - Cổng FPT',
    address: 'Cổng số 1, ĐH FPT Hà Nội, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
    phone: '0972345678',
    description: 'Bún bò Huế đầy đặn, bún đậu mắm tôm chuẩn vị ngay cổng trường FPT',
    rating: 4.8,
    ratingCount: 512,
    categories: ['Cơm & Mì Phở'],
    location: { lat: 21.0131, lng: 105.5255 },
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Bún Bò Huế Đặc Biệt Giò Chả Bò',
        description: 'Nước dùng ninh xương cay thơm sả ớt, đầy đặn bắp bò hoa, chả cua, giò heo mềm ngậy.',
        price: 45000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Mẹt Bún Đậu Đầy Đủ Chả Cốm Nem Chua',
        description: 'Đậu mơ rán giòn vỏ mềm ruột, chả cốm Làng Vòng, thịt chân giò luộc chấm mắm tôm chuẩn vị.',
        price: 50000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Bún Bò Tái Nạm Hoa',
        description: 'Thịt bò tái mềm thái mỏng chần nước dùng nóng hổi, nạm bò giòn sần sật.',
        price: 40000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
  {
    name: 'Tiệm Trà Sữa & Ăn Vặt Hola Tea - Ngã 3 Thạch Hòa',
    address: 'Ngã 3 Thạch Hòa, Quốc Lộ 21, Thạch Thất, Hà Nội',
    phone: '0912987654',
    description: 'Trà sữa nướng, trà hoa quả tươi và đồ ăn vặt tuổi học trò',
    rating: 4.9,
    ratingCount: 680,
    categories: ['Trà Sữa & Cà Phê', 'Đồ Ăn Vặt'],
    location: { lat: 21.0085, lng: 105.531 },
    image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Trà Sữa Trân Châu Đường Đen Hola (Size L)',
        description: 'Vị trà Ô long thơm đậm đà, sữa tươi béo ngậy cùng trân châu đen dẻo dai nấu đường nâu.',
        price: 32000,
        category: 'do-uong',
        image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Trà Đào Cam Sả Tươi Mát',
        description: 'Trà thảo mộc thơm lừng hương sả tươi, đào miếng giòn ngọt giải nhiệt ngày nắng nóng.',
        price: 30000,
        category: 'do-uong',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Mẹt Xiên Bẩn Chiên Giòn Đầy Đủ',
        description: 'Cá viên, bò viên, xúc xích, nem chua rán và khoai tây lắc phô mai giòn rụm.',
        price: 45000,
        category: 'an-vat',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
  {
    name: 'Phở Bò Gia Truyền Cụ Chiêu - Hòa Lạc',
    address: 'Km30, Quốc Lộ 21A, Xã Thạch Hòa, Huyện Thạch Thất, Hà Nội',
    phone: '0988776655',
    description: 'Phở bò tái lăn, nạm gầu gia truyền nước dùng ninh xương 12 tiếng',
    rating: 4.7,
    ratingCount: 420,
    categories: ['Cơm & Mì Phở'],
    location: { lat: 21.0062, lng: 105.5285 },
    image: 'https://images.unsplash.com/photo-1503764654157-72d979d9af2f?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Phở Bò Tái Lăn Hành Hoa',
        description: 'Thịt bò tươi xào lăn lửa lớn ngập tỏi thơm nức, bánh phở mềm mướt nước dùng ngọt tủy.',
        price: 45000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1503764654157-72d979d9af2f?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Phở Bò Nạm Gầu Giòn Bát Đá',
        description: 'Nạm gầu vàng giòn sần sật, nước dùng sôi sùng sục trong bát đá giữ nhiệt đậm đà.',
        price: 50000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
  {
    name: 'Hola Fastfood - Burger & Gà Rán F-Ville',
    address: 'FPT Software Hola Park, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
    phone: '0966554433',
    description: 'Burger bò phô mai, gà rán sốt cay Hàn Quốc giao nhanh trong 15 phút',
    rating: 4.8,
    ratingCount: 390,
    categories: ['Burger & Gà Rán'],
    location: { lat: 21.0155, lng: 105.532 },
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Combo Burger Bò Phô Mai + Khoai Tây Chiên',
        description: 'Bò nướng than mềm thơm, phô mai Cheddar béo ngậy kèm khoai tây chiên vàng giòn.',
        price: 65000,
        category: 'fast-food',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Gà Rán Giòn Cay Sốt Mật Ong Hàn Quốc',
        description: 'Má đùi gà tẩm bột chiên giòn tan, phủ sốt mật ong tỏi cay ngọt chuẩn vị Hàn.',
        price: 60000,
        category: 'fast-food',
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
  {
    name: 'Tiệm Bánh Mì Chảo & Cơm Niêu Sinh Viên',
    address: 'Thôn 3, Xã Tân Xã, Huyện Thạch Thất, Hà Nội',
    phone: '0977889900',
    description: 'Bánh mì chảo xèo xèo, cơm niêu cháy giòn thơm ngon bổ rẻ',
    rating: 4.9,
    ratingCount: 460,
    categories: ['Cơm & Mì Phở', 'Đồ Ăn Vặt'],
    location: { lat: 21.0205, lng: 105.5385 },
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
    dishes: [
      {
        name: 'Chảo Bánh Mì Đầy Đủ Pate Trứng Lòng Đào',
        description: 'Pate nhà làm thơm béo, xúc xích rán, trứng lòng đào sóng sánh ăn cùng sốt chua ngọt đậm đà.',
        price: 40000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Cơm Niêu Bò Sốt Tiêu Đen Cháy Giòn',
        description: 'Lớp cơm cháy đáy niêu giòn tan thơm nức, bò xào nấm tiêu đen cay the đậm vị.',
        price: 55000,
        category: 'com-mi',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80',
      },
    ],
  },
];

const HOA_LAC_CUSTOMER_ADDRESSES = [
  {
    title: 'KTX FPT',
    recipientName: 'Nguyễn Văn Khách',
    phone: '0901234567',
    addressLine: 'Phòng 305, Ký túc xá Dom A, Trường Đại học FPT, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
    isDefault: true,
    location: { lat: 21.0131, lng: 105.5262 },
  },
  {
    title: 'Tòa Alpha',
    recipientName: 'Nguyễn Văn Khách',
    phone: '0901234567',
    addressLine: 'Sảnh Tầng 1, Tòa nhà Alpha, Trường Đại học FPT, Km29 Đại lộ Thăng Long, Thạch Thất, Hà Nội',
    isDefault: false,
    location: { lat: 21.0135, lng: 105.5248 },
  },
  {
    title: 'Trọ Tân Xã',
    recipientName: 'Nguyễn Văn Khách',
    phone: '0901234567',
    addressLine: 'Nhà trọ Hoa Hồng, Thôn 2, Xã Tân Xã, Huyện Thạch Thất, Hà Nội',
    isDefault: false,
    location: { lat: 21.0185, lng: 105.536 },
  },
  {
    title: 'KTX VNU',
    recipientName: 'Nguyễn Văn Khách',
    phone: '0901234567',
    addressLine: 'Tòa KTX QG01, Ký túc xá ĐHQGHN, Thạch Hòa, Thạch Thất, Hà Nội',
    isDefault: false,
    location: { lat: 21.0028, lng: 105.5097 },
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Seed Hòa Lạc] Đã kết nối MongoDB thành công');

  // 1. Tìm hoặc tạo chủ quán mặc định
  let owner = await User.findOne({ email: 'chuquan@fooddelivery.vn' });
  if (!owner) {
    owner = await User.findOne({ role: 'restaurant_owner' });
  }
  if (!owner) {
    owner = await User.findOne();
  }

  // 2. Xóa toàn bộ món ăn cũ & nhà hàng cũ
  const deletedFoods = await Food.deleteMany({});
  const deletedRestaurants = await Restaurant.deleteMany({});
  console.log(`[Seed Hòa Lạc] Đã xóa ${deletedRestaurants.deletedCount} quán cũ và ${deletedFoods.deletedCount} món cũ`);

  // 3. Tạo các quán ăn mới tại Hòa Lạc
  for (const resData of HOA_LAC_RESTAURANTS) {
    const restaurant = await Restaurant.create({
      owner: owner._id,
      name: resData.name,
      address: resData.address,
      phone: resData.phone,
      description: resData.description,
      categories: resData.categories,
      rating: resData.rating,
      ratingCount: resData.ratingCount,
      location: resData.location,
      image: resData.image,
      coverImage: resData.image,
      isVerified: true,
      status: 'approved',
      openingHours: resData.openingHours || [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        isOpen: true,
        shifts: [{ open: '06:00', close: '23:59' }],
      })),
    });

    console.log(`[Seed Hòa Lạc] Đã tạo quán: "${restaurant.name}" tại Hòa Lạc (${restaurant.location.lat}, ${restaurant.location.lng})`);

    // Tạo các món ăn cho quán này
    for (const d of resData.dishes) {
      await Food.create({
        restaurant: restaurant._id,
        name: d.name,
        description: d.description,
        price: d.price,
        category: d.category,
        image: d.image,
        isAvailable: true,
      });
    }
    console.log(`  -> Đã tạo ${resData.dishes.length} món ăn cho quán "${restaurant.name}"`);
  }

  // 4. Dọn sạch và tạo địa chỉ Hòa Lạc cho Address collection
  await Address.deleteMany({});
  for (const addr of HOA_LAC_CUSTOMER_ADDRESSES) {
    await Address.create({
      user: owner._id,
      recipientName: addr.recipientName,
      phone: addr.phone,
      addressLine: addr.addressLine,
      isDefault: addr.isDefault,
      location: addr.location,
    });
  }
  console.log(`[Seed Hòa Lạc] Đã nạp ${HOA_LAC_CUSTOMER_ADDRESSES.length} địa chỉ nhận hàng tại Hòa Lạc vào Address collection`);

  // 5. Cập nhật user.addresses cho tài khoản khách hàng
  const customers = await User.find({
    $or: [{ role: 'customer' }, { email: 'khachhang@fooddelivery.vn' }],
  });

  for (const c of customers) {
    c.addresses = HOA_LAC_CUSTOMER_ADDRESSES.map((a) => ({
      title: a.title,
      receiverName: a.recipientName,
      receiverPhone: a.phone,
      street: a.addressLine,
      city: 'Hà Nội',
      district: 'Thạch Thất',
      ward: 'Hòa Lạc',
      isDefault: a.isDefault,
      location: a.location,
    }));
    await c.save();
    console.log(`[Seed Hòa Lạc] Đã cập nhật 4 địa chỉ Hòa Lạc cho tài khoản khách: ${c.email}`);
  }

  console.log('[Seed Hòa Lạc] Hoàn tất toàn bộ dữ liệu Hòa Lạc!');
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed Hòa Lạc] Lỗi:', err);
  process.exit(1);
});

