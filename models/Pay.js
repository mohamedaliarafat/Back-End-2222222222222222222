// models/Payment.js
const mongoose = require('mongoose');

const paySchema = new mongoose.Schema({
  // 🔗 مرتبط بالطلب
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FuelTransfer',
    required: true
  },

  // 👤 مرتبط بالمستخدم
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 💰 معلومات المبلغ
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR',
    uppercase: true
  },

  // 💳 معلومات الدفع
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'apple_pay', 'mada', 'stripe']
  },
  
  // 🆔 معرّفات Stripe
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  stripeClientSecret: {
    type: String,
    sparse: true
  },

  // 📊 حالة الدفع
  status: {
    type: String,
    enum: [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'requires_capture',
      'canceled',
      'succeeded',
      'failed'
    ],
    default: 'requires_payment_method'
  },

  // 📝 تفاصيل البطاقة (مشفرة)
  cardDetails: {
    last4: String,
    brand: String,
    country: String,
    funding: String
  },

  // ⏰ التوقيتات
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date,

  // 📋 معلومات الاسترداد
  refund: {
    amount: Number,
    reason: String,
    requestedAt: Date,
    processedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled']
    }
  },

  // 📊 التحليلات
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String
  }

}, {
  timestamps: true
});

// 🎯 الفهارس للأداء
paySchema.index({ customer: 1, createdAt: -1 });
paySchema.index({ order: 1 }, { unique: true });
paySchema.index({ stripePaymentIntentId: 1 });
paySchema.index({ status: 1 });
paySchema.index({ createdAt: 1 });

// 🎯 Virtuals
paySchema.virtual('isSuccessful').get(function() {
  return this.status === 'succeeded';
});

paySchema.virtual('isRefunded').get(function() {
  return this.refund.status === 'succeeded';
});

paySchema.virtual('canBeRefunded').get(function() {
  return this.status === 'succeeded' && 
         (!this.refund.status || this.refund.status === 'canceled');
});

// 🎯 Methods
paySchema.methods.toJSON = function() {
  const payment = this.toObject();
  delete payment.stripeClientSecret;
  delete payment.metadata;
  return payment;
};

paySchema.methods.markAsPaid = function(stripePaymentIntentId) {
  this.status = 'succeeded';
  this.stripePaymentIntentId = stripePaymentIntentId;
  this.paidAt = new Date();
  return this.save();
};

paySchema.methods.initiateRefund = async function(amount, reason) {
  this.refund = {
    amount: amount || this.amount,
    reason: reason || 'طلب من العميل',
    requestedAt: new Date(),
    status: 'pending'
  };
  return this.save();
};

// 🎯 Statics
paySchema.statics.findByOrderId = function(orderId) {
  return this.findOne({ order: orderId })
    .populate('customer', 'name email phone')
    .populate('order', 'orderNumber company quantity totalAmount');
};

paySchema.statics.getCustomerPayments = function(customerId, page = 1, limit = 10) {
  return this.find({ customer: customerId })
    .populate('order', 'orderNumber company quantity')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

module.exports = mongoose.model('Pay', paySchema);