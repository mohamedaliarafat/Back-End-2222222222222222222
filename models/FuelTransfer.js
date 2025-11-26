// models/FuelTransfer.js
const mongoose = require('mongoose');

const fuelTransferSchema = new mongoose.Schema({
  // 🔄 معلومات المستخدم
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🏢 معلومات الشركة
  company: {
    type: String,
    required: true,
    enum: ['إنرجكس', 'نهل', 'بيتروجين']
  },

  // ⛽ معلومات الوقود
  fuelType: {
    type: String,
    default: 'بنزين 95'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  // 💰 التسعير
  pricing: {
    pricePerLiter: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    deliveryFee: {
      type: Number,
      default: 25.0
    },
    vat: {
      type: Number,
      default: 0.0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    finalPrice: {
      type: Number
    },
    priceVisible: {
      type: Boolean,
      default: false
    },
    priceSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    priceSetAt: {
      type: Date
    }
  },

  // 💳 الدفع
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['مدى', 'أبل باي', 'بطاقة بنكية']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },

  // 📍 الموقع
  deliveryLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // 📋 المستندات
  documents: {
    aramcoInvoice: {
      filename: String,
      originalName: String,
      path: String,
      url: String,
      uploadedAt: Date
    },
    additionalFiles: [{
      filename: String,
      originalName: String,
      path: String,
      url: String,
      uploadedAt: Date
    }]
  },

  // 🚚 معلومات التسليم
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,

  // 📊 حالة الطلب
  status: {
    type: String,
    enum: [
      'pending',
      'under_review',
      'approved',
      'rejected',
      'driver_assigned',
      'fueling_from_aramco',
      'out_for_delivery',
      'arrived_at_location',
      'unloading',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },

  // 📝 المراجعة والموافقة
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: String,
    notes: String
  },

  // 🕒 التوقيتات
  estimatedDelivery: Date,
  fuelingStartedAt: Date,
  outForDeliveryAt: Date,
  arrivedAt: Date,
  unloadingStartedAt: Date,
  completedAt: Date,

}, {
  timestamps: true
});

// ✅ الفهارس للأداء
fuelTransferSchema.index({ customer: 1, createdAt: -1 });
fuelTransferSchema.index({ status: 1 });
fuelTransferSchema.index({ company: 1 });
fuelTransferSchema.index({ driver: 1 });
fuelTransferSchema.index({ createdAt: -1 });

// ✅ Virtuals للحسابات
fuelTransferSchema.virtual('orderNumber').get(function() {
  return `FT${this._id.toString().substring(18, 24)}`.toUpperCase();
});

// ✅ Methods
fuelTransferSchema.methods.calculateTotal = function() {
  const subtotal = this.quantity * this.pricing.pricePerLiter;
  const vat = subtotal * 0.15;
  const total = subtotal + this.pricing.deliveryFee + vat;
  
  this.pricing.subtotal = subtotal;
  this.pricing.vat = vat;
  this.pricing.totalAmount = total;
  
  return total;
};

fuelTransferSchema.methods.canBeCancelled = function() {
  const nonCancellableStatuses = [
    'out_for_delivery',
    'arrived_at_location',
    'unloading',
    'completed'
  ];
  return !nonCancellableStatuses.includes(this.status);
};

// ✅ Statics
fuelTransferSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { 
          $sum: { 
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$pricing.finalPrice',
              0
            ]
          }
        }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('FuelTransfer', fuelTransferSchema);