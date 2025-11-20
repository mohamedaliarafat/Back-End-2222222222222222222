// const mongoose = require('mongoose');

// const OrderSchema = new mongoose.Schema({
//   // 🔢 معلومات أساسية
//   orderNumber: { type: String, unique: true },
//   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  
//   // 📦 نوع الخدمة
//   serviceType: {
//     type: String,
//     required: true,
//     enum: ['delivery', 'shipping', 'express', 'sameday']
//   },
//   description: { type: String, required: true },
  
//   // 📍 المواقع
//   pickupLocation: {
//     address: { type: String, required: true },
//     coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
//     contactName: { type: String, default: '' },
//     contactPhone: { type: String, default: '' },
//     instructions: { type: String, default: '' }
//   },
  
//   deliveryLocation: {
//     address: { type: String, required: true },
//     coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
//     contactName: { type: String, default: '' },
//     contactPhone: { type: String, default: '' },
//     instructions: { type: String, default: '' }
//   },
  
//   // 💰 النظام المالي
//   pricing: {
//     estimatedPrice: { type: Number, default: 0 },
//     finalPrice: { type: Number, default: 0 },
//     priceVisible: { type: Boolean, default: false },
//     priceSetBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     priceSetAt: { type: Date }
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
//       accountNumber: { type: String, default: "" },
//       transferDate: { type: Date, default: null },
//       amount: { type: Number, default: 0 }
//     },
//     verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     verifiedAt: { type: Date }
//   },
  
//   // 👥 الموظفين المعنيين
//   approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
//   // 🚚 معلومات التوصيل
//   deliveryCode: { type: String },
  
//   // 📊 حالة الطلب
//   status: {
//     type: String,
//     enum: [
//       "pending", "approved", "waiting_payment", "processing", 
//       "ready_for_delivery", "assigned_to_driver", "picked_up", 
//       "in_transit", "delivered", "cancelled"
//     ],
//     default: "pending"
//   },
  
//   // 📍 معلومات المسافة
//   distanceInfo: {
//     distance: { type: Number, default: 0 },
//     duration: { type: Number, default: 0 },
//     polyline: { type: String, default: "" },
//     calculatedAt: { type: Date, default: null }
//   },
  
//   // 🗓️ التواريخ
//   submittedAt: { type: Date, default: Date.now },
//   approvedAt: { type: Date },
//   pricedAt: { type: Date },
//   paymentSubmittedAt: { type: Date },
//   paymentVerifiedAt: { type: Date },
//   assignedToDriverAt: { type: Date },
//   pickedUpAt: { type: Date },
//   deliveredAt: { type: Date },
  
//   // 📍 تتبع الرحلة
//   tracking: [{
//     status: String,
//     location: { lat: Number, lng: Number },
//     timestamp: { type: Date, default: Date.now },
//     note: String
//   }],
  
//   // 📝 ملاحظات
//   supervisorNotes: { type: String, default: "" },
//   adminNotes: { type: String, default: "" },
//   customerNotes: { type: String, default: "" }

// }, { timestamps: true });

// OrderSchema.pre("save", async function (next) {
//   if (this.isNew) {
//     const count = await mongoose.model("Order").countDocuments();
//     this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
//   }
//   next();
// });

// OrderSchema.index({ customerId: 1 });
// OrderSchema.index({ driverId: 1 });
// OrderSchema.index({ status: 1 });
// OrderSchema.index({ createdAt: -1 });
// OrderSchema.index({ orderNumber: 1 });
// OrderSchema.index({ "pickupLocation.coordinates": "2dsphere" });
// OrderSchema.index({ "deliveryLocation.coordinates": "2dsphere" });

// module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // 🔢 معلومات أساسية
  orderNumber: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  
  // 📦 نوع الخدمة (دائماً وقود)
  serviceType: {
    type: String,
    required: true,
    default: 'fuel',
    enum: ['fuel']
  },
  description: { type: String, required: true },
  
  // 📍 موقع التسليم
  deliveryLocation: {
    address: { type: String, required: true },
    coordinates: { 
      lat: { type: Number, required: true }, 
      lng: { type: Number, required: true } 
    },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    instructions: { type: String, default: '' }
  },
  
  // ⛽ معلومات الوقود
  fuelDetails: {
    fuelType: { 
      type: String, 
      required: true,
      enum: ['91', '95', '98', 'diesel', 'premium_diesel', 'كيروسين']
    },
    fuelLiters: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 100000 
    },
    fuelTypeName: { type: String, default: '' }
  },
  
  // 🚗 معلومات المركبة
  vehicleInfo: {
    type: { type: String, default: "" },
    model: { type: String, default: "" },
    licensePlate: { type: String, default: "" },
    color: { type: String, default: "" }
  },
  
  // 💰 النظام المالي
  pricing: {
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    priceVisible: { type: Boolean, default: false },
    priceSetBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priceSetAt: { type: Date },
    fuelPricePerLiter: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 }
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
      "in_transit", "delivered", "completed", "cancelled",
      "on_the_way", "fueling"
    ],
    default: "pending"
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
  completedAt: { type: Date },
  
  // 📍 تتبع الرحلة
  tracking: [{
    status: String,
    location: { 
      lat: { type: Number, default: 0 }, 
      lng: { type: Number, default: 0 } 
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: "" }
  }],
  
  // 📝 ملاحظات
  supervisorNotes: { type: String, default: "" },
  adminNotes: { type: String, default: "" },
  customerNotes: { type: String, default: "" },
  notes: { type: String, default: "" }

}, { 
  timestamps: true,
  // 🔹 إخفاء الحقول غير المستخدمة في طلبات الوقود
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔹 Middleware لإنشاء رقم الطلب
OrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `FUEL${String(count + 1).padStart(6, '0')}`;
    
    // إنشاء الوصف تلقائياً إذا لم يتم توفيره
    if (!this.description) {
      this.description = `طلب وقود ${this.fuelDetails.fuelType} - ${this.fuelDetails.fuelLiters} لتر`;
    }
    
    // تعبئة اسم نوع الوقود تلقائياً
    if (!this.fuelDetails.fuelTypeName) {
      this.fuelDetails.fuelTypeName = this.getFuelTypeName(this.fuelDetails.fuelType);
    }
  }
  next();
});

// 🔹 دالة لحساب السعر التقديري لطلبات الوقود
OrderSchema.methods.calculateEstimatedPrice = function() {
  if (this.fuelDetails && this.fuelDetails.fuelType && this.fuelDetails.fuelLiters) {
    const fuelPrices = { 
      '91': 0, 
      '95': 0, 
      '98': 0, 
      'diesel': 0, 
      'premium_diesel': 0,
      'كيروسين':0 
    };
    const fuelPrice = fuelPrices[this.fuelDetails.fuelType] || 2.00;
    const serviceFee = 15;
    
    this.pricing.estimatedPrice = (this.fuelDetails.fuelLiters * fuelPrice) + serviceFee;
    this.pricing.fuelPricePerLiter = fuelPrice;
    this.pricing.serviceFee = serviceFee;
  }
};

// 🔹 دالة للحصول على اسم نوع الوقود
OrderSchema.methods.getFuelTypeName = function(fuelType) {
  const fuelNames = {
    '91': 'بنزين 91',
    '95': 'بنزين 95', 
    '98': 'بنزين 98',
    'diesel': 'ديزل',
    'premium_diesel': 'ديزل ممتاز',
    'كيروسين': 'كيروسين'
  };
  return fuelNames[fuelType] || fuelType;
};

// 🔹 Virtual للحصول على بيانات الوقود بطريقة مريحة
OrderSchema.virtual('fuelType').get(function() {
  return this.fuelDetails?.fuelType;
});

OrderSchema.virtual('fuelLiters').get(function() {
  return this.fuelDetails?.fuelLiters;
});

OrderSchema.virtual('fuelTypeName').get(function() {
  return this.fuelDetails?.fuelTypeName;
});

// 🔹 Virtual للسعر الكلي
OrderSchema.virtual('totalPrice').get(function() {
  return this.pricing.finalPrice > 0 ? this.pricing.finalPrice : this.pricing.estimatedPrice;
});

// 🔹 Virtual لمعرفة إذا كان الطلب يحتاج دفع
OrderSchema.virtual('requiresPayment').get(function() {
  return this.pricing.finalPrice > 0 && this.status === 'waiting_payment';
});

// 🔹 Indexes
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ driverId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ "deliveryLocation.coordinates": "2dsphere" });
OrderSchema.index({ "fuelDetails.fuelType": 1 });
OrderSchema.index({ "fuelDetails.fuelLiters": 1 });
OrderSchema.index({ "pricing.finalPrice": 1 });

// 🔹 Static methods
OrderSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

OrderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

OrderSchema.statics.findPendingOrders = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

OrderSchema.statics.findByDriver = function(driverId) {
  return this.find({ driverId }).sort({ createdAt: -1 });
};

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);