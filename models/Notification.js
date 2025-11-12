const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: [true, "العنوان مطلوب"] },
  body: { type: String, required: [true, "النص مطلوب"] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  broadcast: { type: Boolean, default: false },
  targetGroup: {
    type: String,
    enum: ['all_customers', 'all_drivers', 'all_supervisors', 'all_admins', 'all_monitoring', 'specific_role'],
    default: null
  },
  type: {
    type: String,
    enum: [
      'system', 'auth', 'order_new', 'order_status', 'order_price', 'order_assigned', 
      'order_delivered', 'payment_pending', 'payment_verified', 'payment_failed',
      'driver_assignment', 'driver_location', 'chat_message', 'incoming_call',
      'profile_approved', 'profile_rejected', 'admin_alert', 'supervisor_alert'
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
    location: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
    code: { type: String, default: "" }
  },
  routing: {
    screen: { type: String, default: "" },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    action: { type: String, default: "" }
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentViaFcm: { type: Boolean, default: false },
  sentViaSms: { type: Boolean, default: false },
  sentViaEmail: { type: Boolean, default: false },
  scheduledFor: { type: Date, default: null },
  isScheduled: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

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

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);