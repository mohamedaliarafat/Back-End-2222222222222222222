const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // 🔢 معلومات أساسية
  orderNumber: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  
  // 📦 نوع الخدمة
  serviceType: {
    type: String,
    required: true,
    enum: ['delivery', 'shipping', 'express', 'sameday']
  },
  description: { type: String, required: true },
  
  // 📍 المواقع
  pickupLocation: {
    address: { type: String, required: true },
    coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    instructions: { type: String, default: '' }
  },
  
  deliveryLocation: {
    address: { type: String, required: true },
    coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    instructions: { type: String, default: '' }
  },
  
  // 💰 النظام المالي
  pricing: {
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    priceVisible: { type: Boolean, default: false },
    priceSetBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priceSetAt: { type: Date }
  },
  
  // 💳 نظام الدفع
  payment: {
    status: {
      type: String,
      enum: ["hidden", "pending", "waiting_proof", "verifying", "verified", "failed"],
      default: "hidden"
    },
    proof: {
      image: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      transferDate: { type: Date, default: null },
      amount: { type: Number, default: 0 }
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date }
  },
  
  // 👥 الموظفين المعنيين
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  // 🚚 معلومات التوصيل
  deliveryCode: { type: String },
  
  // 📊 حالة الطلب
  status: {
    type: String,
    enum: [
      "pending", "approved", "waiting_payment", "processing", 
      "ready_for_delivery", "assigned_to_driver", "picked_up", 
      "in_transit", "delivered", "cancelled"
    ],
    default: "pending"
  },
  
  // 📍 معلومات المسافة
  distanceInfo: {
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    polyline: { type: String, default: "" },
    calculatedAt: { type: Date, default: null }
  },
  
  // 🗓️ التواريخ
  submittedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  pricedAt: { type: Date },
  paymentSubmittedAt: { type: Date },
  paymentVerifiedAt: { type: Date },
  assignedToDriverAt: { type: Date },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  
  // 📍 تتبع الرحلة
  tracking: [{
    status: String,
    location: { lat: Number, lng: Number },
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  
  // 📝 ملاحظات
  supervisorNotes: { type: String, default: "" },
  adminNotes: { type: String, default: "" },
  customerNotes: { type: String, default: "" }

}, { timestamps: true });

OrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

OrderSchema.index({ customerId: 1 });
OrderSchema.index({ driverId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ "pickupLocation.coordinates": "2dsphere" });
OrderSchema.index({ "deliveryLocation.coordinates": "2dsphere" });

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);