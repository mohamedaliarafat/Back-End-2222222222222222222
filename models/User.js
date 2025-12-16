const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    // 🔄 نظام الأدوار
    userType: {
      type: String,
      default: "customer",
      enum: ["customer", "driver", "approval_supervisor", "monitoring", "admin"],
      index: true
    },

    // 🔑 بيانات الدخول
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },

    // 📞 التحقق
    isVerified: {
      type: Boolean,
      default: false
    },

    // 👤 البيانات الشخصية
    name: {
      type: String,
      default: ""
    },
    profileImage: {
      type: String,
      default: "https://c.top4top.io/p_3613ezehd1.png"
    },

    // 📍 الموقع (مستخدم للسائقين)
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      address: { type: String, default: "" },
      lastUpdated: { type: Date, default: null }
    },

    // 🔌 حالة الاتصال (للسائق)
    isOnline: {
      type: Boolean,
      default: false,
      index: true
    },

    // 🏠 العناوين (للعملاء)
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
      }
    ],

    // 🛒 الطلبات
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
      }
    ],

    // 👥 من أضاف المستخدم (للإدمن)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // ✅ حالة الحساب (إيقاف / تفعيل)
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // ⏱️ نشاط المستخدم
    lastLogin: {
      type: Date,
      default: null
    },
    lastSeen: {
      type: Date,
      default: null
    },

    // 🔔 Firebase Tokens
    fcmTokens: {
      type: [String],
      default: []
    },

    // 📋 الملف الشخصي الكامل (للسائقين)
    completeProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompleteProfile",
      default: null
    }
  },
  {
    timestamps: true
  }
);

//
// 🔐 تشفير كلمة المرور
//
UserSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

//
// 🔑 مقارنة كلمة المرور
//
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

//
// 📌 Indexes إضافية
//
UserSchema.index({ "location.lat": 1, "location.lng": 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
