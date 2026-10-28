import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User.js';
import Restaurant from './models/Restaurant.js';

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    const demoUsers = [
      {
        fullName: 'Nguyễn Văn Khách',
        email: 'khachhang@fooddelivery.vn',
        password: 'password123',
        phone: '0901234567',
        role: 'customer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      },
      {
        fullName: 'Trần Văn Quán Ăn',
        email: 'chuquan@fooddelivery.vn',
        password: 'password123',
        phone: '0912345678',
        role: 'restaurant_owner',
        avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80',
      },
      {
        fullName: 'Lê Văn Tài Xế',
        email: 'taixe@fooddelivery.vn',
        password: 'password123',
        phone: '0923456789',
        role: 'shipper',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      },
      {
        fullName: 'Hệ Thống Quản Trị Viên',
        email: 'admin@fooddelivery.vn',
        password: 'password123',
        phone: '0999999999',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      },
    ];

    for (const u of demoUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create({ ...u, isVerified: true });
        console.log(`Created demo user: ${u.email} (${u.role})`);
      } else {
        // update role and ensure password
        exists.fullName = u.fullName;
        exists.role = u.role;
        exists.phone = u.phone;
        exists.avatar = u.avatar;
        exists.isActive = true;
        exists.isVerified = true;
        exists.verificationToken = null;
        exists.verificationTokenExpires = null;
        exists.password = u.password; // will be hashed by pre('save')
        await exists.save();
        console.log(`Updated demo user: ${u.email} (${u.role})`);
      }
    }

    // Đảm bảo nhà hàng mẫu cho chuquan@fooddelivery.vn tồn tại
    const chuquan = await User.findOne({ email: 'chuquan@fooddelivery.vn' });
    if (chuquan) {
      const existsRestaurant = await Restaurant.findOne({ owner: chuquan._id });
      if (!existsRestaurant) {
        await Restaurant.create({
          owner: chuquan._id,
          name: 'Phở Bò Gia Truyền 1986',
          description: 'Hương vị phở bò gia truyền 40 năm tại phố cổ.',
          address: '48 Hàng Đồng, P. Hàng Bồ, Q. Hoàn Kiếm, Hà Nội',
          phone: '0912345678',
          categories: ['Phở Bò', 'Món Ăn Kèm', 'Đồ Uống'],
          status: 'approved',
          openingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            isOpen: true,
            shifts: [{ open: '06:00', close: '22:00' }],
          })),
        });
        console.log('Created demo restaurant for chuquan@fooddelivery.vn');
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedUsers();
