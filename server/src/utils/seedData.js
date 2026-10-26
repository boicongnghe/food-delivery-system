import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Food from '../models/Food.js';
import Address from '../models/Address.js';
import PromotionRule from '../models/PromotionRule.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to database:', mongoose.connection.name);

    // 1. Seed Customer User
    let customer = await User.findOne({ email: 'customer@demo.com' });
    if (!customer) {
      customer = await User.create({
        fullName: 'Nguyễn Văn Đạt',
        email: 'customer@demo.com',
        password: 'password123',
        phone: '0988776655',
        role: 'customer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        isActive: true,
      });
      console.log('[Seed] Created demo customer:', customer.email);
    }

    // 2. Seed Addresses for Customer (UC12)
    const addressCount = await Address.countDocuments({ user: customer._id });
    if (addressCount === 0) {
      await Address.create([
        {
          user: customer._id,
          recipientName: customer.fullName,
          phone: customer.phone,
          addressLine: 'Số 18, Ngõ 92 Trần Phú, Phường Mộ Lao, Quận Hà Đông, Hà Nội',
          isDefault: true,
          note: 'Giao giờ hành chính, gọi trước khi đến',
        },
        {
          user: customer._id,
          recipientName: customer.fullName,
          phone: '0912345678',
          addressLine: 'Tòa Landmark 72, Phạm Hùng, Quận Nam Từ Liêm, Hà Nội',
          isDefault: false,
          note: 'Giao sảnh lễ tân tầng 1',
        },
      ]);
      console.log('[Seed] Created 2 sample addresses for customer');
    }

    // 3. Seed Restaurant & Foods (UC11)
    let restaurant = await Restaurant.findOne({ name: 'Quán Ăn Ngon Phố Cổ' });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: 'Quán Ăn Ngon Phố Cổ',
        description: 'Chuyên các món ăn truyền thống chuẩn vị Bắc',
        address: '26 Hàng Buồm, Phường Hàng Buồm, Quận Hoàn Kiếm, Hà Nội',
        phone: '02438889999',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        status: 'approved',
      });
      console.log('[Seed] Created demo restaurant:', restaurant.name);
    }

    const foodCount = await Food.countDocuments({ restaurant: restaurant._id });
    if (foodCount === 0) {
      await Food.create([
        {
          restaurant: restaurant._id,
          name: 'Phở Bò Tái Lăn Đặc Biệt',
          description: 'Thịt bò xào lăn thơm lừng tỏi, nước dùng ninh xương đậm đà 24h',
          price: 65000,
          image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
          category: 'Món chính',
          isAvailable: true,
        },
        {
          restaurant: restaurant._id,
          name: 'Bún Chả Hà Nội Nướng Than Hoa',
          description: 'Chả viên và chả miếng nướng thơm phức ăn kèm bún tươi và nước chấm',
          price: 55000,
          image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
          category: 'Món chính',
          isAvailable: true,
        },
        {
          restaurant: restaurant._id,
          name: 'Nem Rán Giòn Rụm (4 Chiếc)',
          description: 'Nem nhân thịt băm, mộc nhĩ, miến dong chiên vàng giòn rụm',
          price: 40000,
          image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
          category: 'Khai vị',
          isAvailable: true,
        },
        {
          restaurant: restaurant._id,
          name: 'Trà Sen Vàng Long Nhãn',
          description: 'Trà thanh mát kết hợp hạt sen bùi bùi và củ năng giòn ngọt',
          price: 35000,
          image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
          category: 'Đồ uống',
          isAvailable: true,
        },
      ]);
      console.log('[Seed] Created sample foods');
    }

    // 4. Seed Promotion Rules (UC14)
    const promoCount = await PromotionRule.countDocuments();
    if (promoCount === 0) {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await PromotionRule.create([
        {
          code: 'FREESHIP',
          title: 'Miễn phí giao hàng 15K',
          description: 'Giảm 15.000đ tiền vận chuyển cho đơn hàng từ 50.000đ',
          discountType: 'fixed',
          discountValue: 15000,
          minOrderValue: 50000,
          maxDiscount: 15000,
          startDate: now,
          endDate: nextMonth,
          usageLimit: 200,
          isActive: true,
        },
        {
          code: 'GIAM20K',
          title: 'Giảm ngay 20K cho đơn từ 100K',
          description: 'Áp dụng cho mọi khách hàng đặt món hôm nay',
          discountType: 'fixed',
          discountValue: 20000,
          minOrderValue: 100000,
          maxDiscount: 20000,
          startDate: now,
          endDate: nextMonth,
          usageLimit: 100,
          isActive: true,
        },
        {
          code: 'BANMOI50',
          title: 'Giảm 50% tối đa 30K',
          description: 'Khuyến mãi đặc biệt dành cho khách hàng mới',
          discountType: 'percentage',
          discountValue: 50,
          minOrderValue: 60000,
          maxDiscount: 30000,
          startDate: now,
          endDate: nextMonth,
          usageLimit: 50,
          isActive: true,
        },
      ]);
      console.log('[Seed] Created 3 sample promotion rules');
    }

    console.log('[Seed] Seed completed successfully!');
  } catch (error) {
    console.error('[Seed] Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
