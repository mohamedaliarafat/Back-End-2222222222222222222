// const mongoose = require('mongoose');

// const petrolSchema = new mongoose.Schema({
//   orderNumber: { type: String, unique: true },
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
//   // 🚗 معلومات المركبة
//   vehicleInfo: {
//     type: { type: String, default: "" },
//     model: { type: String, default: "" },
//     licensePlate: { type: String, default: "" },
//     color: { type: String, default: "" }
//   },
  
//   // ⛽ معلومات الوقود
//   fuelType: { 
//     type: String, 
//     required: true,
//     enum: ['91', '95', '98', 'diesel', 'premium_diesel']
//   },
//   fuelLiters: { type: Number, required: true, min: 1, max: 100 },
  
//   // 📍 موقع التوصيل
//   deliveryLocation: {
//     address: { type: String, required: true },
//     coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
//     contactName: { type: String, default: "" },
//     contactPhone: { type: String, default: "" },
//     instructions: { type: String, default: "" }
//   },
  
//   // 💰 النظام المالي
//   pricing: {
//     estimatedPrice: { type: Number, default: 0 },
//     finalPrice: { type: Number, default: 0 },
//     priceVisible: { type: Boolean, default: false },
//     priceSetBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     priceSetAt: { type: Date },
//     fuelPricePerLiter: { type: Number, default: 0 },
//     serviceFee: { type: Number, default: 0 }
//   },
  
//   // 💳 نظام الدفع
//   payment: {
//     status: {
//       type: String,
//       enum: ["hidden", "pending", "waiting_proof", "verifying", "verified", "failed"],
//       default: "hidden"
//     },
//     proof: {
//       image: { type: String, default: "" },
//       bankName: { type: String, default: "" },
//       transferDate: { type: Date, default: null },
//       amount: { type: Number, default: 0 }
//     }
//   },
  
//   // 🚚 معلومات التوصيل
//   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
//   deliveryCode: { type: String },
  
//   // 📊 حالة الطلب
//   status: {
//     type: String,
//     enum: [
//       "pending", "approved", "waiting_payment", "processing", 
//       "ready_for_delivery", "assigned_to_driver", "on_the_way", 
//       "fueling", "completed", "cancelled"
//     ],
//     default: "pending"
//   },
  
//   // 📝 ملاحظات
//   notes: { type: String, default: "" },
//   adminNotes: { type: String, default: "" },
//   supervisorNotes: { type: String, default: "" },
  
//   // 👥 الموظفين المعنيين
//   approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
//   // 🗓️ التواريخ
//   submittedAt: { type: Date, default: Date.now },
//   approvedAt: { type: Date },
//   pricedAt: { type: Date },
//   assignedToDriverAt: { type: Date },
//   completedAt: { type: Date },

// }, { timestamps: true });

// petrolSchema.pre("save", async function (next) {
//   if (this.isNew) {
//     const count = await mongoose.model("Petrol").countDocuments();
//     this.orderNumber = `FUEL${String(count + 1).padStart(6, '0')}`;
//   }
//   next();
// });

// petrolSchema.methods.calculateEstimatedPrice = function() {
//   const fuelPrices = { '91': 2.18, '95': 2.33, '98': 2.55, 'diesel': 1.85, 'premium_diesel': 2.10 };
//   const fuelPrice = fuelPrices[this.fuelType] || 2.00;
//   const serviceFee = 15;
//   this.pricing.estimatedPrice = (this.fuelLiters * fuelPrice) + serviceFee;
//   this.pricing.fuelPricePerLiter = fuelPrice;
//   this.pricing.serviceFee = serviceFee;
// };

// petrolSchema.index({ user: 1 });
// petrolSchema.index({ status: 1 });
// petrolSchema.index({ orderNumber: 1 });
// petrolSchema.index({ createdAt: -1 });
// petrolSchema.index({ driverId: 1 });
// petrolSchema.index({ "deliveryLocation.coordinates": "2dsphere" });

// module.exports = mongoose.models.Petrol || mongoose.model('Petrol', petrolSchema);