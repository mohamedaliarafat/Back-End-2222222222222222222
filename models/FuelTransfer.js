const mongoose = require('mongoose');

const fuelTransferSchema = new mongoose.Schema({
  // 🔢 رقم الطلب الفريد
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },

  // 👤 معلومات المستخدم
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🏢 معلومات الشركة
  company: {
    type: String,
    required: true,
    enum: ['إنرجكس', 'نهل', 'بيتروجين', 'ارامكو'] // ⬅️ أضف ارامكو
  },

  // ⛽ معلومات الوقود
  fuelType: {
    type: String,
    enum: ['بنزين 91', 'بنزين 95', 'ديزل'],
    default: 'بنزين 95'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  invoice_url: {
    type: String,
    default: null
  },
  
  invoice_uploaded_at: {
    type: Date,
    default: null
  },
  unit: {
    type: String,
    enum: ['لتر', 'جالون'],
    default: 'لتر'
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
    },
    discount: {
      type: Number,
      default: 0
    }
  },

  // 💳 الدفع - ⬅️ أضف stripe
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['stripe', 'apple_pay', 'mada', 'بطاقة بنكية', 'نقدي', 'تحويل بنكي']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    stripePaymentIntentId: String,
    paidAt: Date,
    paymentMethodDetails: {
      last4: String,
      brand: String,
      country: String
    }
  },

  // 📍 الموقع
  deliveryLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    apartment: String,
    building: String,
    floor: String,
    additionalInstructions: String
  },

  // 🏷️ معلومات إضافية
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'express'],
    default: 'normal'
  },
  notes: String,

  // 📋 المستندات
  documents: {
    aramcoInvoice: {
      filename: String,
      originalName: String,
      path: String,
      url: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false }
    },
    additionalFiles: [{
      filename: String,
      originalName: String,
      path: String,
      url: String,
      uploadedAt: Date,
      description: String
    }]
  },

  // 🚚 معلومات التسليم
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverName: String,
  driverPhone: String,
  vehicleInfo: {
    plateNumber: String,
    vehicleType: String,
    capacity: Number
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
      'cancelled',
      'on_hold'
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
    notes: String,
    attachments: [String]
  },

  // 🕒 التوقيتات
  estimatedDelivery: Date,
  actualDelivery: Date,
  fuelingStartedAt: Date,
  outForDeliveryAt: Date,
  arrivedAt: Date,
  unloadingStartedAt: Date,
  completedAt: Date,

  // 📞 التواصل
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },

  // ⚠️ المشاكل والإشعارات
  issues: [{
    type: String,
    description: String,
    reportedAt: Date,
    resolvedAt: Date,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // 🏷️ وسوم
  tags: [String],

  // 📊 التحليلات
  source: {
    type: String,
    enum: ['web', 'mobile', 'whatsapp', 'phone'],
    default: 'mobile'
  },
  rating: {
    stars: { type: Number, min: 1, max: 5 },
    comment: String,
    ratedAt: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ الفهارس للأداء
fuelTransferSchema.index({ customer: 1, createdAt: -1 });
fuelTransferSchema.index({ status: 1 });
fuelTransferSchema.index({ company: 1 });
fuelTransferSchema.index({ driver: 1 });
fuelTransferSchema.index({ createdAt: -1 });
fuelTransferSchema.index({ orderNumber: 1 });
fuelTransferSchema.index({ 'deliveryLocation.coordinates': '2dsphere' });
fuelTransferSchema.index({ 'payment.status': 1 });
fuelTransferSchema.index({ 'payment.paidAt': 1 });

// ✅ Virtuals
fuelTransferSchema.virtual('isPaid').get(function() {
  return this.payment.status === 'paid';
});

fuelTransferSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

fuelTransferSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

fuelTransferSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

fuelTransferSchema.virtual('deliveryTime').get(function() {
  if (this.outForDeliveryAt && this.arrivedAt) {
    return (this.arrivedAt - this.outForDeliveryAt) / (1000 * 60); // دقائق
  }
  return null;
});

fuelTransferSchema.virtual('formattedTotal').get(function() {
  const amount = this.pricing.finalPrice || this.pricing.totalAmount || 0;
  return `${amount.toFixed(2)} ريال`;
});

// ✅ Middleware لحساب المجموع التلقائي
fuelTransferSchema.pre('save', function(next) {
  // إذا لم يكن subtotal محسوباً، احسبه
  if (!this.pricing.subtotal && this.quantity && this.pricing.pricePerLiter) {
    this.pricing.subtotal = this.quantity * this.pricing.pricePerLiter;
  }

  // إذا كان subtotal موجوداً ولكن totalAmount ليس موجوداً
  if (this.pricing.subtotal && !this.pricing.totalAmount) {
    const vat = this.pricing.vat || (this.pricing.subtotal * 0.15);
    const deliveryFee = this.pricing.deliveryFee || 25.0;
    this.pricing.totalAmount = this.pricing.subtotal + vat + deliveryFee;
  }

  // إذا كان finalPrice غير محدد، استخدم totalAmount
  if (!this.pricing.finalPrice && this.pricing.totalAmount) {
    this.pricing.finalPrice = this.pricing.totalAmount;
  }

  // توليد orderNumber إذا لم يكن موجوداً
  if (!this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }

  next();
});

// ✅ Methods
fuelTransferSchema.methods.generateOrderNumber = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FT${timestamp}${random}`;
};

fuelTransferSchema.methods.calculateTotal = function() {
  const subtotal = this.quantity * (this.pricing.pricePerLiter || 0);
  const vat = subtotal * 0.15;
  const deliveryFee = this.pricing.deliveryFee || 25.0;
  const total = subtotal + deliveryFee + vat;
  
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

fuelTransferSchema.methods.markAsPaid = function(paymentDetails) {
  this.payment.status = 'paid';
  this.payment.paidAt = new Date();
  
  if (paymentDetails) {
    Object.assign(this.payment, paymentDetails);
  }
  
  return this.save();
};

fuelTransferSchema.methods.addIssue = function(issue, reportedBy) {
  if (!this.issues) {
    this.issues = [];
  }
  
  this.issues.push({
    type: issue.type || 'other',
    description: issue.description,
    reportedAt: new Date(),
    reportedBy: reportedBy
  });
  
  return this.save();
};

// ✅ Statics
fuelTransferSchema.statics.getStats = async function(userId = null) {
  const match = userId ? { customer: mongoose.Types.ObjectId(userId) } : {};
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$pricing.finalPrice',
              0
            ]
          }
        },
        avgDeliveryTime: {
          $avg: {
            $cond: [
              { $and: [
                { $ne: ['$outForDeliveryAt', null] },
                { $ne: ['$arrivedAt', null] }
              ]},
              { $divide: [
                { $subtract: ['$arrivedAt', '$outForDeliveryAt'] },
                1000 * 60 // تحويل لـ دقائق
              ]},
              null
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    avgDeliveryTime: 0
  };
};

fuelTransferSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber })
    .populate('customer', 'name email phone')
    .populate('driver', 'name phone')
    .populate('review.reviewedBy', 'name');
};

module.exports = mongoose.model('FuelTransfer', fuelTransferSchema);