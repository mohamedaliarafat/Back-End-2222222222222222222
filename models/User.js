const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    // 🔄 نظام الأدوار
    userType: {
      type: String,
      default: "customer",
      enum: ["customer", "driver", "approval_supervisor", "monitoring", "admin"],
    },

    // 🔑 بيانات الدخول الأساسية
    phone: { 
      type: String, 
      required: true,
      unique: true 
    },
    password: { 
      type: String, 
      required: true 
    },

    // 📞 التحقق من الهاتف
    isVerified: { 
      type: Boolean, 
      default: false 
    },

    // 👤 البيانات الشخصية
    profileImage: {
      type: String,
      default: "https://a.top4top.io/p_356432nv81.png",
    },
    name: { 
      type: String, 
      default: "" 
    },

    // 📍 الموقع (للسائقين)
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      address: { type: String, default: "" },
      lastUpdated: { type: Date, default: null }
    },

    // 🏠 العناوين (للعملاء)
    addresses: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Address" 
    }],

    // 🛒 الطلبات
    orders: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Order" 
    }],

    // 👥 للموظفين (تمت إضافتهم بواسطة الإدمن)
    addedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },

    // ✅ حالة الحساب
    isActive: { 
      type: Boolean, 
      default: true 
    },
    lastLogin: { 
      type: Date, 
      default: null 
    },

    // 🔔 الإشعارات
    fcmToken: { 
      type: String, 
      default: "" 
    },

    // 📋 الملف الشخصي الكامل (للسائقين)
    completeProfile: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "CompleteProfile", 
      default: null 
    },

  },
  { 
    timestamps: true 
  }
);

// ✅ إصلاح الـ middleware لتشفير كلمة المرور
UserSchema.pre("save", async function (next) {
  try {
    // فقط إذا تم تعديل كلمة المرور وكانت موجودة
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ مقارنة كلمة المرور
UserSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error("خطأ في مقارنة كلمة المرور");
  }
};

// ✅ الفهارس
UserSchema.index({ phone: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);