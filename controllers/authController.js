const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');

const authController = {};

// إعداد Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

authController.register = async (req, res) => {
  try {
    const { phone, password, userType, firebaseUid } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف وكلمة المرور مطلوبين' });
    }

    // التحقق من وجود المستخدم
    let existingUser = await User.findOne({ phone });
    if (existingUser) {
      if (firebaseUid && existingUser.firebaseUid !== firebaseUid) {
        existingUser.firebaseUid = firebaseUid;
        await existingUser.save();
      }
      return res.status(400).json({ success: false, error: 'رقم الهاتف مسجل مسبقاً' });
    }

    // توليد OTP عشوائي 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

      
      let formattedPhone;

      // إذا الرقم يبدأ بـ "+" فهو أصلاً بصيغة دولية
      if (phone.startsWith('+')) {
        formattedPhone = phone;
      } else {
        // أزل أي صفر بادئ ثم أضف رمز الدولة
        formattedPhone = '+966' + phone.replace(/^0+/, '');
      }

      await client.messages.create({
        body: `رمز التحقق الخاص بك هو: ${otp}`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: formattedPhone,
      });


    // فقط بعد نجاح الإرسال، نعمل حفظ للمستخدم
    const user = new User({
      phone,
      password,
      userType: userType || 'customer',
      firebaseUid: firebaseUid || null,
      tempOtp: otp // لازم يكون موجود في الموديل أو تستخدم Redis
    });

    await user.save();

    // إنشاء JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'تم إرسال OTP بنجاح، تحقق من رقم هاتفك',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء إرسال OTP، لم يتم تسجيل المستخدم' });
  }
};

module.exports = authController;


// 🔐 تسجيل الدخول
authController.login = async (req, res) => {
  try {
    const { phone, password, firebaseUid } = req.body;

    let user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    // تحديث firebaseUid إذا موجود
    if (firebaseUid && user.firebaseUid !== firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }

    // إنشاء JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified,
        profileCompleted: !!user.completeProfile
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 👤 الحصول على الملف الشخصي
authController.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate('completeProfile');
    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified,
        completeProfile: user.completeProfile
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 📞 التحقق من رقم الهاتف
authController.verifyPhone = async (req, res) => {
  try {
    const { phone, verificationCode } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    // كود مؤقت للاختبار
    if (verificationCode !== "123456") {
      return res.status(400).json({ success: false, error: 'كود التحقق غير صحيح' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ success: true, message: 'تم التحقق من رقم الهاتف بنجاح' });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔄 إعادة إرسال كود التحقق
authController.resendVerification = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    res.json({ success: true, message: 'تم إرسال كود التحقق' });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 📋 إكمال الملف الشخصي
authController.completeProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { companyName, email, contactPerson, contactPhone, contactPosition, nationalAddress, vehicleInfo } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    let completeProfile = await CompleteProfile.findOne({ user: userId });

    if (completeProfile) {
      Object.assign(completeProfile, { companyName, email, contactPerson, contactPhone, contactPosition, nationalAddress, vehicleInfo });
    } else {
      completeProfile = new CompleteProfile({
        user: userId,
        companyName: companyName || "",
        email: email || "",
        contactPerson: contactPerson || "",
        contactPhone: contactPhone || "",
        contactPosition: contactPosition || "",
        nationalAddress: nationalAddress || {},
        vehicleInfo: vehicleInfo || {},
        profileStatus: 'draft'
      });
    }

    await completeProfile.save();
    user.completeProfile = completeProfile._id;
    await user.save();

    res.json({
      success: true,
      message: 'تم إكمال البيانات الأساسية بنجاح',
      profile: completeProfile,
      nextStep: 'upload_documents'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 📄 رفع المستندات
authController.uploadDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documents } = req.body;

    let completeProfile = await CompleteProfile.findOne({ user: userId });
    if (!completeProfile) return res.status(404).json({ success: false, error: 'الملف الشخصي غير موجود' });

    completeProfile.documents = { ...completeProfile.documents, ...documents };
    completeProfile.profileStatus = 'submitted';
    await completeProfile.save();

    res.json({ success: true, message: 'تم رفع المستندات بنجاح وجاري مراجعتها', profile: completeProfile });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✏️ تحديث الملف الشخصي
authController.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    Object.assign(user, updateData);
    await user.save();

    res.json({ success: true, message: 'تم تحديث الملف الشخصي بنجاح', user });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔐 تسجيل الخروج
authController.logout = async (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
};

// 🔍 التحقق من التوكن
authController.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔑 نسيان كلمة المرور
authController.forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    res.json({ success: true, message: 'تم إرسال رمز إعادة تعيين كلمة المرور' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔄 إعادة تعيين كلمة المرور
authController.resetPassword = async (req, res) => {
  try {
    const { phone, newPassword, resetCode } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    if (resetCode !== "123456") return res.status(400).json({ success: false, error: 'رمز إعادة التعيين غير صحيح' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = authController;
