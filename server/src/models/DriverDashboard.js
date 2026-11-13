import mongoose from 'mongoose';

const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    name: { type: String, required: true },
    driverCode: { type: String, required: true },
    restaurant: { type: String, default: '' },
    shiftStart: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    licensePlate: { type: String, default: '' },
    tier: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
  },
  { _id: false },
);

const periodSchema = new Schema(
  {
    totalEarnings: { type: Number, default: 0 },
    baseFare: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    completedTrips: { type: Number, default: 0 },
    tripGoal: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    weeklyEarnings: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    tier: { type: String, default: '' },
    ratingCount: { type: Number, default: 0 },
    consecutiveFiveStarTrips: { type: Number, default: 0 },
    payoutBank: { type: String, default: '' },
    earningsByHour: [{
      hour: { type: String, required: true },
      base: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      surge: { type: Boolean, default: false },
    }],
    forecast: [{
      hour: { type: String, required: true },
      demand: { type: Number, default: 0 },
    }],
    trips: [{
      id: { type: String, required: true },
      time: { type: String, default: '' },
      restaurant: { type: String, default: '' },
      address: { type: String, default: '' },
      distance: { type: String, default: '' },
      baseFare: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      status: { type: String, default: '' },
      surge: { type: Boolean, default: false },
    }],
    reviews: [{
      id: { type: String, required: true },
      quote: { type: String, default: '' },
      customer: { type: String, default: '' },
      stars: { type: Number, min: 1, max: 5, default: 5 },
      isDemo: { type: Boolean, default: false },
    }],
    badges: [{
      id: { type: String, required: true },
      icon: { type: String, default: '' },
      label: { type: String, default: '' },
      count: { type: Number, default: 0 },
      isDemo: { type: Boolean, default: false },
    }],
  },
  { _id: false },
);

const driverDashboardSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    profile: { type: profileSchema, required: true },
    isOnline: { type: Boolean, default: false },
    activeOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    isDemo: { type: Boolean, default: false },
    // Nguồn số dư ví duy nhất của shipper (không dùng User.walletBalance hay periods.*.walletBalance)
    walletBalance: { type: Number, min: 0, default: 0 },
    periods: {
      today: { type: periodSchema },
      week: { type: periodSchema },
      month: { type: periodSchema },
    },
  },
  { timestamps: true },
);

const DriverDashboard = mongoose.model('DriverDashboard', driverDashboardSchema);

export default DriverDashboard;
