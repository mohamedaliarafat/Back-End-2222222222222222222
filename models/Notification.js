// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, "العنوان مطلوب"],
    trim: true,
    maxlength: [100, "العنوان لا يمكن أن يزيد عن 100 حرف"]
  },
  body: { 
    type: String, 
    required: [true, "النص مطلوب"],
    trim: true,
    maxlength: [500, "النص لا يمكن أن يزيد عن 500 حرف"]
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  broadcast: { 
    type: Boolean, 
    default: false 
  },
  targetGroup: {
    type: String,
  enum: [
  'all_customers', 
  'all_drivers', 
  'all_supervisors', 
  'all_admins', 
  'all_monitoring', 
  'specific_role',
  'customer',
  'admin',
  'driver',
  'supervisor',
  'all',
  'assign-driver',
  'admins'   // ✅ تمت الإضافة هنا
],

    required: function() {
      return this.broadcast;
    },
    validate: {
      validator: function(value) {
        if (this.broadcast && !value) return false; 
        if (!this.broadcast && value) return false; 
        return true;
      },
      message: 'targetGroup مطلوب عندما يكون broadcast = true ويجب ألا يتم تمريره عندما broadcast = false'
    }
  },
  type: {
    type: String,
    enum: [
    'system', 'auth', 'register_success', 'login_success', 'profile_updated',
    'order_new', 'order_confirmed', 'order_price_set', 'order_price',
    'order_waiting_payment', 'order_payment_verified', 'order_processing',
    'order_ready_for_delivery', 'order_assigned_to_driver', 'order_picked_up',
    'order_in_transit', 'order_delivered', 'order_completed', 'order_cancelled',
    'order_status_updated',
    'payment_pending', 'payment_verified', 'payment_failed', 'payment_refunded',
    'payment_under_review',   // ✅ تمت الإضافة هنا
    'driver_assignment', 'driver_location', 'driver_arrived',
    'chat_message', 'incoming_call', 'call_missed',
    'profile_approved', 'profile_rejected', 'profile_needs_correction',
    'document_uploaded', 'document_approved', 'document_rejected',
    'admin_alert', 'supervisor_alert', 'monitoring_alert',
    'low_stock', 'new_registration', 'system_maintenance',
    'fuel_order_new', 'fuel_order_status', 'fuel_delivery_started', 
    'fuel_delivery_completed', 'fuel_price_updated',
    'new_offer', 'special_discount', 'loyalty_reward',
    'price_update', 'status_update', 'general',
    'order', 'assign-driver'
  ],
    default: "system",
    index: true
  },
  data: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    callId: { type: String, default: "" },
    amount: { type: Number, default: 0, min: [0, "المبلغ لا يمكن أن يكون سالب"] },
    location: { 
      lat: { type: Number, default: 0, min: -90, max: 90 }, 
      lng: { type: Number, default: 0, min: -180, max: 180 } 
    },
    code: { type: String, default: "", uppercase: true, trim: true },
    status: { type: String, default: "", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  routing: {
    screen: { type: String, default: "", trim: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    action: { type: String, default: "", trim: true }
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentViaFcm: { type: Boolean, default: false },
  sentViaSms: { type: Boolean, default: false },
  sentViaEmail: { type: Boolean, default: false },
  scheduledFor: { 
    type: Date, 
    default: null,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return value > new Date();
      },
      message: 'وقت الجدولة يجب أن يكون في المستقبل'
    }
  },
  isScheduled: { type: Boolean, default: false },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal',
    index: true
  },

  sound: {
    type: String,
    default: function() {
      if (this.type === 'system') return 'default_system_sound.mp3';
      return 'default_notification.mp3';
    },
    trim: true
  },

  expiresAt: { 
    type: Date, 
    default: null,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return value > new Date();
      },
      message: 'وقت الانتهاء يجب أن يكون في المستقبل'
    }
  },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 🔹 Middleware قبل الحفظ
notificationSchema.pre('save', function(next) {
  if (!this.broadcast) delete this.targetGroup;
  if (this.broadcast && !this.targetGroup) {
    const error = new mongoose.Error.ValidationError(this);
    error.errors.targetGroup = new mongoose.Error.ValidatorError({
      message: 'targetGroup مطلوب عندما يكون broadcast = true',
      path: 'targetGroup',
      value: this.targetGroup
    });
    return next(error);
  }

  this.isScheduled = !!this.scheduledFor;

  if (!this.expiresAt) {
    const expiryDays = ['urgent','high'].includes(this.priority) ? 7 : 30;
    this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  }

  next();
});

// 🔹 Middleware قبل التحديث
notificationSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.broadcast === false && update.targetGroup) delete update.targetGroup;
  if (update.broadcast === true && !update.targetGroup) return next(new Error('targetGroup مطلوب عندما يكون broadcast = true'));
  next();
});

// 🔹 Virtuals
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('ar-SA', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
});
notificationSchema.virtual('isExpired').get(function() { return this.expiresAt && this.expiresAt < new Date(); });
notificationSchema.virtual('isRead').get(function() { return this.readBy && this.readBy.length > 0; });

// 🔹 Methods
notificationSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.includes(userId)) this.readBy.push(userId);
  return this.save();
};
notificationSchema.methods.markAsUnread = function(userId) {
  this.readBy = this.readBy.filter(id => id.toString() !== userId.toString());
  return this.save();
};
notificationSchema.methods.isReadByUser = function(userId) {
  return this.readBy.some(id => id.toString() === userId.toString());
};

// 🔹 Statics
notificationSchema.statics.getTargetGroupsForUser = function(userType) {
  const groups = ['all'];
  switch(userType) {
    case 'customer': groups.push('all_customers','customer'); break;
    case 'driver': groups.push('all_drivers','driver'); break;
    case 'approval_supervisor': groups.push('all_supervisors','supervisor'); break;
    case 'admin': groups.push('all_admins','admin'); break;
    case 'monitoring': groups.push('all_monitoring'); break;
  }
  return groups;
};

notificationSchema.statics.getUserNotifications = async function(userId, userType, options={}) {
  const { page=1, limit=20, read=null, type=null, priority=null } = options;
  const skip = (page-1)*limit;
  const filter = {
    isActive: true,
    $or: [
      { user: userId },
      { broadcast:true, targetGroup: { $in: this.getTargetGroupsForUser(userType) } }
    ]
  };
  if (read !== null) filter.readBy = read ? userId : { $ne: userId };
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  try {
    const notifications = await this.find(filter)
      .sort({ createdAt:-1 })
      .skip(skip)
      .limit(limit)
      .populate('user','name phone')
      .populate('data.orderId','orderNumber status')
      .populate('data.driverId','name phone')
      .populate('data.customerId','name phone')
      .lean();
    return Array.isArray(notifications) ? notifications : [];
  } catch(err) {
    console.error('❌ Error fetching user notifications:', err);
    return [];
  }
};

notificationSchema.statics.cleanExpiredNotifications = async function() {
  const result = await this.updateMany(
    { expiresAt: { $lt: new Date() }, isActive:true },
    { isActive:false }
  );
  console.log(`🧹 Deactivated ${result.modifiedCount} expired notifications`);
  return result;
};

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
