// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, "العنوان مطلوب"] 
  },
  body: { 
    type: String, 
    required: [true, "النص مطلوب"] 
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
      'customer',        // ⬅️ أضيفت - للمستخدمين الفرديين
      'admin',           // ⬅️ أضيفت - للإداريين
      'driver',          // ⬅️ أضيفت - للسائقين
      'supervisor',      // ⬅️ أضيفت - للمشرفين
      'all'              // ⬅️ أضيفت - للجميع
    ],
    required: function() {
      // مطلوب فقط إذا كان broadcast = true
      return this.broadcast;
    },
    default: null
  },
  type: {
    type: String,
    enum: [
      // 🔹 النظام الأساسي والمصادقة
      'system', 'auth', 'register_success', 'login_success', 'profile_updated',
      
      // 🔹 إشعارات الطلبات - دورة حياة كاملة
      'order_new',                    // طلب جديد (للمشرفين/السائقين)
      'order_confirmed',              // تم تأكيد الطلب
      'order_price_set',              // تم تحديد السعر (من الإدارة) ⬅️ هذه هي القيمة الصحيحة
      'order_price',                  // ⬅️ أضيفت - لتتوافق مع الكود الحالي
      'order_waiting_payment',        // في انتظار الدفع
      'order_payment_verified',       // تم التحقق من الدفع
      'order_processing',             // جاري المعالجة
      'order_ready_for_delivery',     // جاهز للتسليم
      'order_assigned_to_driver',     // تم تعيين سائق
      'order_picked_up',              // تم الاستلام من السائق
      'order_in_transit',             // في الطريق
      'order_delivered',              // تم التسليم
      'order_completed',              // مكتمل
      'order_cancelled',              // ملغي
      'order_status_updated',         // تحديث حالة عام
      
      // 🔹 الدفع
      'payment_pending', 'payment_verified', 'payment_failed', 'payment_refunded',
      
      // 🔹 السائقين
      'driver_assignment', 'driver_location', 'driver_arrived',
      
      // 🔹 المحادثات والمكالمات
      'chat_message', 'incoming_call', 'call_missed',
      
      // 🔹 الملف الشخصي
      'profile_approved', 'profile_rejected', 'profile_needs_correction',
      'document_uploaded', 'document_approved', 'document_rejected',
      
      // 🔹 التنبيهات الإدارية
      'admin_alert', 'supervisor_alert', 'monitoring_alert',
      'low_stock', 'new_registration', 'system_maintenance',
      
      // 🔹 إشعارات الوقود المحددة
      'fuel_order_new', 'fuel_order_status', 'fuel_delivery_started', 
      'fuel_delivery_completed', 'fuel_price_updated',
      
      // 🔹 العروض والتخفيضات
      'new_offer', 'special_discount', 'loyalty_reward',
      
      // 🔹 أنواع إضافية لتغطية جميع الحالات
      'price_update',                 // ⬅️ أضيفت
      'status_update',                // ⬅️ أضيفت
      'general'                       // ⬅️ أضيفت
    ],
    default: "system"
  },
  data: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    callId: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    location: { 
      lat: { type: Number, default: 0 }, 
      lng: { type: Number, default: 0 } 
    },
    code: { type: String, default: "" },
    status: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  routing: {
    screen: { type: String, default: "" },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    action: { type: String, default: "" }
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
    default: null 
  },
  isScheduled: { 
    type: Boolean, 
    default: false 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  },
  expiresAt: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔹 Middleware للتحقق من البيانات قبل الحفظ
notificationSchema.pre('save', function(next) {
  // إذا كان broadcast = false، تأكد من أن targetGroup = null
  if (!this.broadcast && this.targetGroup) {
    this.targetGroup = null;
  }
  
  // إذا كان broadcast = true، تأكد من وجود targetGroup
  if (this.broadcast && !this.targetGroup) {
    const error = new Error('targetGroup مطلوب عندما يكون broadcast = true');
    return next(error);
  }
  
  next();
});

// 🔹 Indexes لتحسين الأداء
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ user: 1 });
notificationSchema.index({ broadcast: 1 });
notificationSchema.index({ targetGroup: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ "data.orderId": 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted date
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('ar-SA');
});

// 🔹 دالة مساعدة للتحقق من الصحة
notificationSchema.statics.validateNotification = function(notificationData) {
  const validTypes = this.schema.path('type').enumValues;
  const validTargetGroups = this.schema.path('targetGroup').enumValues;
  
  if (!validTypes.includes(notificationData.type)) {
    throw new Error(`نوع الإشعار غير صالح: ${notificationData.type}. الأنواع المسموحة: ${validTypes.join(', ')}`);
  }
  
  if (notificationData.broadcast && !validTargetGroups.includes(notificationData.targetGroup)) {
    throw new Error(`targetGroup غير صالح: ${notificationData.targetGroup}. القيم المسموحة: ${validTargetGroups.join(', ')}`);
  }
  
  return true;
};

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);