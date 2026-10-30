import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import Food from '../models/Food.js';

const DISHES_TO_SEED = [
  {
    name: 'Cơm Tấm Sườn Bì Chả Đặc Biệt',
    restaurantName: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
    category: 'Cơm & Mì Phở',
    price: 65000,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
    description: 'Sườn cốt lết nướng than hoa thơm lừng, ướp đậm đà, chả trứng béo ngậy, bì giòn dai ăn kèm mỡ hành và nước mắm kẹo đặc trưng.',
  },
  {
    name: 'Cơm Gà Xối Mỡ Da Giòn',
    restaurantName: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
    category: 'Cơm & Mì Phở',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
    description: 'Đùi gà góc tư chiên xối mỡ vàng ươm da giòn rụm, thịt bên trong mềm ngọt mọng nước ăn cùng cơm chiên cà chua đỏ au thơm nức mũi.',
  },
  {
    name: 'Cơm Chiên Dương Châu Xá Xíu',
    restaurantName: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
    category: 'Cơm & Mì Phở',
    price: 50000,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=700&q=80',
    description: 'Hạt cơm tơi vàng óng chiên lửa lớn cùng xá xíu đậm đà, lạp xưởng tôm tươi, đậu Hà Lan và cà rốt giòn ngọt bùi béo.',
  },
  {
    name: 'Cơm Tấm Sườn Nướng Mật Ong',
    restaurantName: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
    category: 'Cơm & Mì Phở',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
    description: 'Cơm tấm dẻo thơm ăn cùng miếng sườn nướng mật ong vàng óng đậm đà, mỡ hành tép mỡ giòn rụm và dưa chua giải ngấy.',
  },
  {
    name: 'Cơm Gà Xé Phay Trộn Rau Răm',
    restaurantName: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
    category: 'Cơm & Mì Phở',
    price: 48000,
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
    description: 'Thịt gà ta thả vườn xé phay bóp chua ngọt cùng hành tây, rau răm tiêu sọ, cơm nấu nước luộc gà béo thơm.',
  },
  {
    name: 'Phở Bò Tái Nạm Gầu Bát Đá',
    restaurantName: 'Phở Thìn Lò Đúc Hà Nội',
    restaurantAddress: '13 Lò Đúc, Q.Hai Bà Trưng, Hà Nội',
    category: 'Cơm & Mì Phở',
    price: 70000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
    description: 'Nước dùng ninh từ xương bò hầm 18 tiếng ngọt thanh đậm đà, thịt bò tái lăn mềm ngậy ăn kèm bánh quẩy giòn rụm.',
  },
  {
    name: 'Bún Bò Huế Chả Cua Thịt Chân Giò',
    restaurantName: 'Phở Thìn Lò Đúc Hà Nội',
    restaurantAddress: '13 Lò Đúc, Q.Hai Bà Trưng, Hà Nội',
    category: 'Cơm & Mì Phở',
    price: 65000,
    image: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?auto=format&fit=crop&w=700&q=80',
    description: 'Nước dùng cay nồng mùi sả và mắm ruốc Huế đặc trưng, sợi bún to dai mềm, chả cua thơm bùi cùng khoanh chân giò hầm mềm rục.',
  },
  {
    name: 'Bún Chả Hà Nội Nướng Than Hoa',
    restaurantName: 'Phở Thìn Lò Đúc Hà Nội',
    restaurantAddress: '13 Lò Đúc, Q.Hai Bà Trưng, Hà Nội',
    category: 'Cơm & Mì Phở',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
    description: 'Chả viên và chả miếng nướng thơm phức ăn kèm bún tươi và nước chấm chua ngọt.',
  },
  {
    name: 'Burger Bò Nướng Phô Mai Double Cheesy',
    restaurantName: 'The Grill Burger House',
    restaurantAddress: '45 Lê Duẩn, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Burger & Gà Rán',
    price: 89000,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80',
    description: '2 lớp bò Úc nướng lửa hồng mềm mọng nước phủ 2 lớp phô mai Cheddar tan chảy, sốt BBQ khói và rau củ tươi sạch.',
  },
  {
    name: 'Gà Rán Giòn Cay Sốt Phô Mai Hàn Quốc',
    restaurantName: 'The Grill Burger House',
    restaurantAddress: '45 Lê Duẩn, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Burger & Gà Rán',
    price: 75000,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=700&q=80',
    description: 'Miếng gà tươi tẩm bột chiên 2 lần giòn tan rôm rốp, phủ đẫm sốt cay ngọt Gochujang rắc mè trắng và sốt phô mai kéo sợi ngậy béo.',
  },
  {
    name: 'Khoai Tây Lắc Phô Mai BBQ Giòn Rụm',
    restaurantName: 'The Grill Burger House',
    restaurantAddress: '45 Lê Duẩn, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Đồ Ăn Vặt',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80',
    description: 'Khoai tây cọng Bỉ chiên vàng ươm ráo dầu, lắc đều với bột phô mai mặn ngọt thơm lừng hương khói BBQ hấp dẫn.',
  },
  {
    name: 'Trà Sữa Đường Đen Trân Châu Hoàng Kim',
    restaurantName: 'The Alley & Tea House',
    restaurantAddress: '68 Nguyễn Huệ, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Trà Sữa & Cà Phê',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1558857563-b37cfb8cb042?auto=format&fit=crop&w=700&q=80',
    description: 'Sữa tươi thanh trùng DalatMilk béo mịn kết hợp siro đường đen Okinawa thơm nồng và trân châu hoàng kim dai dẻo chuẩn vị.',
  },
  {
    name: 'Trà Đào Cam Sả Hạt Chia',
    restaurantName: 'The Alley & Tea House',
    restaurantAddress: '68 Nguyễn Huệ, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Trà Sữa & Cà Phê',
    price: 38000,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=700&q=80',
    description: 'Trà đen ủ lạnh thanh mát quyện cùng nước cốt đào thơm lừng, sả tươi đập dập, lát cam vàng mọng nước và hạt chia bổ dưỡng.',
  },
  {
    name: 'Salad Ức Gà Áp Chảo Sốt Mè Rang',
    restaurantName: 'The Grill Burger House',
    restaurantAddress: '45 Lê Duẩn, P.Bến Nghé, Quận 1, TP.HCM',
    category: 'Món Chay Healthy',
    price: 59000,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80',
    description: 'Ức gà phi lê ướp thảo mộc áp chảo xém cạnh mềm mọng, xà lách Romaine, cà chua bi, trứng luộc và sốt mè rang Nhật Bản đậm đà.',
  },
];

import User from '../models/User.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB. Seeding foods catalog...');

  // Find any restaurant owner user
  let owner = await User.findOne({ role: 'restaurant_owner' });
  if (!owner) {
    owner = await User.findOne();
  }

  for (const item of DISHES_TO_SEED) {
    // 1. Find or create restaurant
    let res = await Restaurant.findOne({ name: item.restaurantName });
    if (!res) {
      res = await Restaurant.create({
        owner: owner._id,
        user: owner._id,
        name: item.restaurantName,
        address: item.restaurantAddress,
        phone: '0912345678',
        description: item.restaurantName,
        rating: 4.9,
        status: 'approved',
      });
      console.log(`Created restaurant: ${res.name}`);
    }

    // 2. Check if food already exists by name
    const existing = await Food.findOne({ name: item.name });
    if (!existing) {
      await Food.create({
        restaurant: res._id,
        name: item.name,
        price: item.price,
        image: item.image,
        description: item.description,
        category: item.category,
        isAvailable: true,
      });
      console.log(`+ Seeded food: ${item.name} (${item.price} VND)`);
    } else {
      // Ensure it is available and has restaurant attached
      existing.isAvailable = true;
      existing.restaurant = res._id;
      existing.price = item.price;
      existing.image = item.image;
      existing.description = item.description;
      await existing.save();
      console.log(`~ Updated food: ${item.name}`);
    }
  }

  const total = await Food.countDocuments();
  console.log(`\nAll done! Total foods in database: ${total}`);
  await mongoose.disconnect();
}

seed().catch(console.error);
