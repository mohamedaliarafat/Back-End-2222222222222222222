// models/Chat.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  
  // أنواع الرسائل
  type: {
    type: String,
    enum: ["text", "image", "voice", "video", "file", "call"],
    default: "text"
  },
  
  // محتوى الرسالة
  content: {
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    duration: { type: Number, default: 0 }, // للملفات الصوتية/الفيديو
    fileSize: { type: Number, default: 0 },
    fileName: { type: String, default: "" }
  },
  
  // حالة الرسالة
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
  },
  
  // للمكالمات
  callInfo: {
    type: { type: String, enum: ["audio", "video"], default: "audio" },
    duration: { type: Number, default: 0 },
    status: { type: String, enum: ["missed", "answered", "rejected"], default: "answered" },
    callId: { type: String, default: "" }
  },
  
  timestamp: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // إعدادات المحادثة
  isActive: { type: Boolean, default: true },
  lastMessage: { type: mongoose.Schema.Types.Mixed, default: null },
  unreadCount: {
    customer: { type: Number, default: 0 },
    driver: { type: Number, default: 0 }
  },
  
  // إعدادات المكالمات
  callsEnabled: { type: Boolean, default: true },
  videoCallsEnabled: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// تحديث updatedAt عند تعديل المحادثة
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
MessageSchema.index({ chatId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ orderId: 1 });
MessageSchema.index({ timestamp: -1 });

ChatSchema.index({ orderId: 1 });
ChatSchema.index({ customerId: 1 });
ChatSchema.index({ driverId: 1 });
ChatSchema.index({ updatedAt: -1 });

module.exports = {
  Message: mongoose.model("Message", MessageSchema),
  Chat: mongoose.model("Chat", ChatSchema)
};