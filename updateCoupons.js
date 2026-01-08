import mongoose from 'mongoose';
import Coupon from './src/models/Coupon.js';
import dotenv from 'dotenv';

dotenv.config();

const updateExpiredCoupons = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Update expiry dates for expired coupons
    const updates = [
      {
        code: 'SAVE10',
        valid_to: new Date('2026-12-31T23:59:59.999Z')
      },
      {
        code: 'FLAT50',
        valid_to: new Date('2026-12-31T23:59:59.999Z')
      },
      {
        code: 'WEEKEND100',
        valid_to: new Date('2026-12-31T23:59:59.999Z')
      }
    ];

    for (const update of updates) {
      const result = await Coupon.updateOne(
        { code: update.code },
        { $set: { valid_to: update.valid_to, updated_at: new Date() } }
      );
      console.log(`✅ Updated ${update.code}:`, result.modifiedCount > 0 ? 'Success' : 'Not found');
    }

    // Display all active coupons
    const activeCoupons = await Coupon.find({
      is_active: true,
      valid_to: { $gte: new Date() }
    });
    
    console.log('\n📋 Active Coupons:');
    activeCoupons.forEach(coupon => {
      console.log(`- ${coupon.code}: ${coupon.description} (Expires: ${coupon.valid_to.toDateString()})`);
    });

    mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateExpiredCoupons();
