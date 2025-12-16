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

//
// 🔹 Counter Schema (Atomic – Safe)
//
const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

//
// 🔹 Order Schema
//
const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  serviceType: {
    type: String,
    required: true,
    default: 'fuel',
    enum: ['fuel']
  },

  description: { type: String, required: true },

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

  vehicleInfo: {
    type: { type: String, default: "" },
    model: { type: String, default: "" },
    licensePlate: { type: String, default: "" },
    color: { type: String, default: "" }
  },

  pricing: {
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    priceVisible: { type: Boolean, default: false },
    fuelPricePerLiter: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 }
  },

  payment: {
    status: {
      type: String,
      enum: ["hidden", "pending", "waiting_proof", "verifying", "verified", "failed"],
      default: "hidden"
    }
  },
  approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

approvedAt: {
  type: Date,
  default: null
},

confirmedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

confirmedAt: {
  type: Date,
  default: null
},


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

  submittedAt: { type: Date, default: Date.now }

}, { timestamps: true });

//
// 🔹 Middleware لتوليد orderNumber (Race-condition FREE)
//
OrderSchema.pre("save", async function (next) {
  try {
    // 🔒 لو الرقم موجود خلاص → لا تعيد توليده
    if (this.orderNumber) return next();

    // ✅ Atomic upsert + increment (آمن 100%)
    const counter = await Counter.findOneAndUpdate(
      { name: 'FUEL_ORDER' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.orderNumber = `FUEL${String(counter.seq).padStart(6, '0')}`;

    // وصف تلقائي
    if (!this.description) {
      this.description =
        `طلب وقود ${this.fuelDetails.fuelType} - ${this.fuelDetails.fuelLiters} لتر`;
    }

    // اسم نوع الوقود
    if (!this.fuelDetails.fuelTypeName) {
      this.fuelDetails.fuelTypeName =
        this.getFuelTypeName(this.fuelDetails.fuelType);
    }

    next();
  } catch (err) {
    next(err);
  }
});



//
// 🔹 Methods
//
OrderSchema.methods.calculateEstimatedPrice = function () {
  if (!this.fuelDetails?.fuelType || !this.fuelDetails?.fuelLiters) return;

  const fuelPrices = {
    '91': 0,
    '95': 0,
    '98': 0,
    'diesel': 0,
    'premium_diesel': 0,
    'كيروسين': 0
  };

  const pricePerLiter = fuelPrices[this.fuelDetails.fuelType] ?? 2.0;
  const serviceFee = 15;

  this.pricing.estimatedPrice =
    (this.fuelDetails.fuelLiters * pricePerLiter) + serviceFee;

  this.pricing.fuelPricePerLiter = pricePerLiter;
  this.pricing.serviceFee = serviceFee;
};

OrderSchema.methods.getFuelTypeName = function (fuelType) {
  const map = {
    '91': 'بنزين 91',
    '95': 'بنزين 95',
    '98': 'بنزين 98',
    'diesel': 'ديزل',
    'premium_diesel': 'ديزل ممتاز',
    'كيروسين': 'كيروسين'
  };
  return map[fuelType] || fuelType;
};

//
// 🔹 Indexes
//
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);
