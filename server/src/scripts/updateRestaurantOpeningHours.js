import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';

const SCHEDULES = {
  // 3 quán ĐANG MỞ CỬA (để test đặt hàng và tính khoảng cách, phí ship)
  'Cơm Gà Nướng & Cơm Rang 99 - Tân Xã': [
    { open: '00:00', close: '23:59' }, // 24/7
  ],
  'Tiệm Trà Sữa & Ăn Vặt Hola Tea - Ngã 3 Thạch Hòa': [
    { open: '00:00', close: '23:59' }, // 24/7
  ],
  'Hola Fastfood - Burger & Gà Rán F-Ville': [
    { open: '00:00', close: '23:59' }, // 24/7
  ],

  // 3 quán ĐÃ ĐÓNG CỬA lúc đêm / sáng sớm (để thấy rõ trạng thái Đã đóng cửa và nút bị vô hiệu hóa)
  'Bún Bò Huế & Bún Đậu O Mai - Cổng FPT': [
    { open: '06:00', close: '14:00' }, // Phục vụ sáng, trưa
  ],
  'Phở Bò Gia Truyền Cụ Chiêu - Hòa Lạc': [
    { open: '05:30', close: '13:30' }, // Phục vụ ăn sáng
  ],
  'Tiệm Bánh Mì Chảo & Cơm Niêu Sinh Viên': [
    { open: '06:30', close: '21:30' }, // Nghỉ đêm
  ],
};

const createWeekHours = (shifts) => {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
    shifts,
  }));
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    for (const [name, shifts] of Object.entries(SCHEDULES)) {
      const openingHours = createWeekHours(shifts);
      const res = await Restaurant.updateOne(
        { name },
        { $set: { openingHours } }
      );
      console.log(`Updated "${name}":`, res.modifiedCount, 'shift:', shifts[0].open, '-', shifts[0].close);
    }

    console.log('Finished updating opening hours successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating hours:', err);
    process.exit(1);
  }
};

run();
