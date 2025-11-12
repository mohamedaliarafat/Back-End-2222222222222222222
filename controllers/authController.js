const User = require('../models/User');
const CompleteProfile = require('../models/CompleteProfile');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// تعريف authController ككائن فارغ أولاً
const authController = {};

// 🔐 التسجيل
authController.register = async (req, res) => {
  try {
    const { phone, password, userType } = req.body;

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    // إنشاء مستخدم جديد
    const user = new User({
      phone,
      password,
      userType: userType || 'customer'
    });

    await user.save();

    // إنشاء token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔐 تسجيل الدخول
authController.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // البحث عن المستخدم
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيحة'
      });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيحة'
      });
    }

    // إنشاء token
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// في controllers/authController.js - أضف هذه الدالة
authController.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('completeProfile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified,
        name: user.name,
        email: user.email,
        profile: user.profile,
        isActive: user.isActive,
        completeProfile: user.completeProfile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'فشل في تحميل الملف الشخصي: ' + error.message
    });
  }
};

// 📞 التحقق من رقم الهاتف
authController.verifyPhone = async (req, res) => {
  try {
    const { phone, verificationCode } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // هنا يجب التحقق من الكود (في التطبيق الحقيقي)
    if (verificationCode !== "123456") { // كود مؤقت للاختبار
      return res.status(400).json({
        success: false,
        error: 'كود التحقق غير صحيح'
      });
    }

    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'تم التحقق من رقم الهاتف بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔄 إعادة إرسال كود التحقق
authController.resendVerification = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // في التطبيق الحقيقي: إرسال SMS
    res.json({
      success: true,
      message: 'تم إرسال كود التحقق'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 إكمال الملف الشخصي بعد التحقق
authController.completeProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      companyName,
      email,
      contactPerson,
      contactPhone,
      contactPosition,
      nationalAddress,
      vehicleInfo
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // إنشاء أو تحديث الملف الشخصي الكامل
    let completeProfile = await CompleteProfile.findOne({ user: userId });

    if (completeProfile) {
      // تحديث الملف الموجود
      if (companyName) completeProfile.companyName = companyName;
      if (email) completeProfile.email = email;
      if (contactPerson) completeProfile.contactPerson = contactPerson;
      if (contactPhone) completeProfile.contactPhone = contactPhone;
      if (contactPosition) completeProfile.contactPosition = contactPosition;
      if (nationalAddress) completeProfile.nationalAddress = nationalAddress;
      if (vehicleInfo) completeProfile.vehicleInfo = vehicleInfo;
    } else {
      // إنشاء ملف جديد
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

    // ربط الملف الكامل بالمستخدم
    user.completeProfile = completeProfile._id;
    await user.save();

    res.json({
      success: true,
      message: 'تم إكمال البيانات الأساسية بنجاح',
      profile: completeProfile,
      nextStep: 'upload_documents' // الخطوة التالية: رفع المستندات
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📄 رفع مستندات الملف الشخصي
authController.uploadDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documents } = req.body;

    let completeProfile = await CompleteProfile.findOne({ user: userId });

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        error: 'الملف الشخصي غير موجود. يرجى إكمال البيانات الأساسية أولاً'
      });
    }

    // تحديث المستندات
    if (documents.commercialLicense) {
      completeProfile.documents.commercialLicense = { 
        ...completeProfile.documents.commercialLicense,
        ...documents.commercialLicense 
      };
    }
    
    if (documents.energyLicense) {
      completeProfile.documents.energyLicense = { 
        ...completeProfile.documents.energyLicense,
        ...documents.energyLicense 
      };
    }
    
    if (documents.commercialRecord) {
      completeProfile.documents.commercialRecord = { 
        ...completeProfile.documents.commercialRecord,
        ...documents.commercialRecord 
      };
    }
    
    if (documents.taxNumber) {
      completeProfile.documents.taxNumber = { 
        ...completeProfile.documents.taxNumber,
        ...documents.taxNumber 
      };
    }
    
    if (documents.nationalAddressDocument) {
      completeProfile.documents.nationalAddressDocument = { 
        ...completeProfile.documents.nationalAddressDocument,
        ...documents.nationalAddressDocument 
      };
    }
    
    if (documents.civilDefenseLicense) {
      completeProfile.documents.civilDefenseLicense = { 
        ...completeProfile.documents.civilDefenseLicense,
        ...documents.civilDefenseLicense 
      };
    }

    // تغيير الحالة لـ مقدم
    completeProfile.profileStatus = 'submitted';

    await completeProfile.save();

    res.json({
      success: true,
      message: 'تم رفع المستندات بنجاح وجاري مراجعتها',
      profile: completeProfile,
      nextStep: 'waiting_approval' // الانتظار للموافقة
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👤 الحصول على الملف الشخصي
authController.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).populate('completeProfile');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث الملف الشخصي
authController.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // تحديث البيانات الأساسية
    if (updateData.phone) user.phone = updateData.phone;
    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔐 تسجيل الخروج
authController.logout = async (req, res) => {
  try {
    // في التطبيق الحقيقي: إضافة التوكن للقائمة السوداء
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔍 التحقق من التوكن
authController.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔑 نسيان كلمة المرور
authController.forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // في التطبيق الحقيقي: إرسال رمز إعادة تعيين عبر SMS
    res.json({
      success: true,
      message: 'تم إرسال رمز إعادة تعيين كلمة المرور'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔄 إعادة تعيين كلمة المرور
authController.resetPassword = async (req, res) => {
  try {
    const { phone, newPassword, resetCode } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // التحقق من رمز إعادة التعيين (مؤقت)
    if (resetCode !== "123456") {
      return res.status(400).json({
        success: false,
        error: 'رمز إعادة التعيين غير صحيح'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = authController;