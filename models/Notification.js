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
      'all'
    ],
    required: function() {
      return this.broadcast;
    },
    default: null,
    validate: {
      validator: function(value) {
        // إذا كان broadcast = true يجب أن يكون targetGroup موجود
        if (this.broadcast && !value) return false;
        // إذا كان broadcast = false يجب أن يكون targetGroup null
        if (!this.broadcast && value) return false;
        return true;
      },
      message: 'targetGroup مطلوب عندما يكون broadcast = true ويجب أن يكون null عندما broadcast = false'
    }
  },
  type: {
    type: String,
    enum: [
      // النظام الأساسي والمصادقة
      'system', 'auth', 'register_success', 'login_success', 'profile_updated',
      
      // إشعارات الطلبات
      'order_new', 'order_confirmed', 'order_price_set', 'order_price',
      'order_waiting_payment', 'order_payment_verified', 'order_processing',
      'order_ready_for_delivery', 'order_assigned_to_driver', 'order_picked_up',
      'order_in_transit', 'order_delivered', 'order_completed', 'order_cancelled',
      'order_status_updated',
      
      // الدفع
      'payment_pending', 'payment_verified', 'payment_failed', 'payment_refunded',
      
      // السائقين
      'driver_assignment', 'driver_location', 'driver_arrived',
      
      // المحادثات والمكالمات
      'chat_message', 'incoming_call', 'call_missed',
      
      // الملف الشخصي
      'profile_approved', 'profile_rejected', 'profile_needs_correction',
      'document_uploaded', 'document_approved', 'document_rejected',
      
      // التنبيهات الإدارية
      'admin_alert', 'supervisor_alert', 'monitoring_alert',
      'low_stock', 'new_registration', 'system_maintenance',
      
      // إشعارات الوقود
      'fuel_order_new', 'fuel_order_status', 'fuel_delivery_started', 
      'fuel_delivery_completed', 'fuel_price_updated',
      
      // العروض والتخفيضات
      'new_offer', 'special_discount', 'loyalty_reward',
      
      // أنواع إضافية
      'price_update', 'status_update', 'general'
    ],
    default: "system",
    index: true
  },
  data: {
    orderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Order',
      index: true
    },
    driverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    chatId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Chat' 
    },
    callId: { 
      type: String, 
      default: "" 
    },
    amount: { 
      type: Number, 
      default: 0,
      min: [0, "المبلغ لا يمكن أن يكون سالب"]
    },
    location: { 
      lat: { 
        type: Number, 
        default: 0,
        min: -90,
        max: 90
      }, 
      lng: { 
        type: Number, 
        default: 0,
        min: -180,
        max: 180
      } 
    },
    code: { 
      type: String, 
      default: "",
      uppercase: true,
      trim: true
    },
    status: { 
      type: String, 
      default: "",
      trim: true
    },
    metadata: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    }
  },
  routing: {
    screen: { 
      type: String, 
      default: "",
      trim: true
    },
    params: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    },
    action: { 
      type: String, 
      default: "",
      trim: true
    }
  },
  readBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  sentViaFcm: { 
    type: Boolean, 
    default: false 
  },
  sentViaSms: { 
    type: Boolean, 
    default: false 
  },
  sentViaEmail: { 
    type: Boolean, 
    default: false 
  },
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
  isScheduled: { 
    type: Boolean, 
    default: false 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal',
    index: true
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
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 🔹 Middleware للتحقق من البيانات قبل الحفظ
notificationSchema.pre('save', function(next) {
  // إذا كان broadcast = false، تأكد من أن targetGroup = null
  if (!this.broadcast) {
    this.targetGroup = null;
  }
  
  // إذا كان broadcast = true، تأكد من وجود targetGroup
  if (this.broadcast && !this.targetGroup) {
    const error = new mongoose.Error.ValidationError(this);
    error.errors.targetGroup = new mongoose.Error.ValidatorError({
      message: 'targetGroup مطلوب عندما يكون broadcast = true',
      path: 'targetGroup',
      value: this.targetGroup
    });
    return next(error);
  }

  // التحقق من scheduledFor و isScheduled
  if (this.scheduledFor) {
    this.isScheduled = true;
  } else {
    this.isScheduled = false;
  }

  // تعيين تاريخ انتهاء افتراضي إذا لم يتم تحديده
  if (!this.expiresAt) {
    // الإشعارات العاجلة تنتهي بعد 7 أيام، العادية بعد 30 يوم
    const expiryDays = this.priority === 'urgent' || this.priority === 'high' ? 7 : 30;
    this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  }

  next();
});

// 🔹 Middleware للتحقق قبل التحديث
notificationSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.broadcast === false && update.targetGroup) {
    update.targetGroup = null;
  }
  
  if (update.broadcast === true && !update.targetGroup) {
    const error = new Error('targetGroup مطلوب عندما يكون broadcast = true');
    return next(error);
  }

  next();
});

// 🔹 Indexes لتحسين الأداء
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ broadcast: 1, targetGroup: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ "data.orderId": 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ isActive: 1 });
notificationSchema.index({ isScheduled: 1, scheduledFor: 1 });
notificationSchema.index({ sentViaFcm: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🔹 Virtuals
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// 🔹 Methods
notificationSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
  }
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
notificationSchema.statics.validateNotification = function(notificationData) {
  const validTypes = this.schema.path('type').enumValues;
  const validTargetGroups = this.schema.path('targetGroup').enumValues;
  const validPriorities = this.schema.path('priority').enumValues;
  
  if (!validTypes.includes(notificationData.type)) {
    throw new Error(`نوع الإشعار غير صالح: ${notificationData.type}. الأنواع المسموحة: ${validTypes.join(', ')}`);
  }
  
  if (notificationData.broadcast && !validTargetGroups.includes(notificationData.targetGroup)) {
    throw new Error(`targetGroup غير صالح: ${notificationData.targetGroup}. القيم المسموحة: ${validTargetGroups.join(', ')}`);
  }
  
  if (notificationData.priority && !validPriorities.includes(notificationData.priority)) {
    throw new Error(`الأولوية غير صالحة: ${notificationData.priority}. القيم المسموحة: ${validPriorities.join(', ')}`);
  }
  
  return true;
};

notificationSchema.statics.getUserNotifications = function(userId, userType, options = {}) {
  const {
    page = 1,
    limit = 20,
    read = null,
    type = null,
    priority = null
  } = options;

  const skip = (page - 1) * limit;

  const filter = {
    isActive: true,
    $or: [
      { user: userId },
      { broadcast: true, targetGroup: { $in: this.getTargetGroupsForUser(userType) } }
    ]
  };

  if (read !== null) {
    if (read) {
      filter.readBy = userId;
    } else {
      filter.readBy = { $ne: userId };
    }
  }

  if (type) {
    filter.type = type;
  }

  if (priority) {
    filter.priority = priority;
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name phone')
    .populate('data.orderId', 'orderNumber status')
    .populate('data.driverId', 'name phone')
    .populate('data.customerId', 'name phone');
};

notificationSchema.statics.getTargetGroupsForUser = function(userType) {
  const groups = ['all'];
  
  switch (userType) {
    case 'customer':
      groups.push('all_customers', 'customer');
      break;
    case 'driver':
      groups.push('all_drivers', 'driver');
      break;
    case 'approval_supervisor':
      groups.push('all_supervisors', 'supervisor');
      break;
    case 'admin':
      groups.push('all_admins', 'admin');
      break;
    case 'monitoring':
      groups.push('all_monitoring');
      break;
  }
  
  return groups;
};

notificationSchema.statics.cleanExpiredNotifications = async function() {
  const result = await this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    { 
      isActive: false 
    }
  );
  
  console.log(`🧹 Deactivated ${result.modifiedCount} expired notifications`);
  return result;
};

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);