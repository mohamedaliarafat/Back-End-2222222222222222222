const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User"); // ✅ عدّل المسار حسب مكان الموديل

dotenv.config(); // لتحميل متغيرات البيئة من ملف .env

// ✅ اتصل بقاعدة البيانات
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ دالة لإنشاء الأدمن
async function createAdmin() {
  try {
    const phone = "0552127073"; // 📱 رقم الأدمن
    const password = "Aa78789898@";  // 🔑 كلمة مرور الأدمن
    const name = "Kamil Sdigg Algack"; // 👤 اسم الأدمن

    // تحقق لو الأدمن موجود بالفعل
    const existingAdmin = await User.findOne({ phone });
    if (existingAdmin) {
      console.log("⚠️ الأدمن موجود بالفعل:", {
        name: existingAdmin.name,
        phone: existingAdmin.phone,
        userType: existingAdmin.userType
      });
      return;
    }

    // إنشاء مستخدم جديد بنوع "admin" وفقاً للموديل
    const admin = new User({
      _id: new mongoose.Types.ObjectId(), // 🔥 إضافة ID
      phone,
      password,
      name,
      userType: "admin",
      isVerified: true,
      isActive: true,
      profileImage: "https://a.top4top.io/p_356432nv81.png", // 🔥 مطلوب حسب الموديل
      location: { // 🔥 مطلوب حسب الموديل
        lat: 0.0,
        lng: 0.0,
        address: "",
        lastUpdated: null
      },
      addresses: [], // 🔥 مطلوب حسب الموديل
      orders: [], // 🔥 مطلوب حسب الموديل
      fcmToken: "", // 🔥 مطلوب حسب الموديل
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await admin.save();
    console.log("✅ تم إنشاء الأدمن بنجاح:", {
      id: admin._id,
      name: admin.name,
      phone: admin.phone,
      userType: admin.userType,
      isActive: admin.isActive,
      isVerified: admin.isVerified
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الأدمن:", error);
    process.exit(1);
  }
}

createAdmin();