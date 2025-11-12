const User = require('../models/User');
const CompleteProfile = require('../models/CompleteProfile');
const Notification = require('../models/Notification');
const Product = require('../models/Product'); // أضف هذا الاستيراد

const userController = {};

// 👤 إنشاء مستخدم جديد (للإدمن)
userController.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      identityNumber,
      userType,
      password
    } = req.body;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإنشاء مستخدمين'
      });
    }

    // التحقق من البيانات المطلوبة
    if (userType !== 'customer' && !identityNumber) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهوية/الإقامة مطلوب لهذا النوع من المستخدمين'
      });
    }

    // التحقق من عدم وجود مستخدم بنفس البيانات
    const existingUser = await User.findOne({
      $or: [
        { email },
        { phone },
        { identityNumber }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني أو رقم الجوال أو رقم الهوية مسجل مسبقاً'
      });
    }

    const user = new User({
      name,
      email,
      phone,
      identityNumber,
      userType,
      password: password || '123456', // كلمة مرور افتراضية
      addedBy: req.user.userId
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        identityNumber: user.identityNumber
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب المستخدمين (مع الفلترة)
userController.getUsers = async (req, res) => {
  try {
    const { 
      userType, 
      isActive, 
      page = 1, 
      limit = 10,
      search 
    } = req.query;

    let query = {};

    // الفلترة حسب نوع المستخدم
    if (userType) query.userType = userType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // البحث
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { identityNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('addedBy', 'name')
      .populate('completeProfile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👁️ جلب مستخدم محدد
userController.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('addedBy', 'name')
      .populate('completeProfile')
      .populate('addresses')
      .populate('orders')
      .populate('products');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🛍️ جلب منتجات المستخدم (للإدمن)
userController.getUserProducts = async (req, res) => {
  try {
    const { userId } = req.params;

    // التحقق من الصلاحية
    if (req.user.userType !== 'admin' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للمنتجات'
      });
    }

    const products = await Product.find({ addedBy: userId })
      .populate('company')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🛍️ جلب منتجاتي
userController.getMyProducts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const products = await Product.find({ addedBy: userId })
      .populate('company')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث بيانات المستخدم
userController.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // التحقق من الصلاحية (الإدمن فقط أو المستخدم نفسه)
    if (req.user.userType !== 'admin' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديث بيانات هذا المستخدم'
      });
    }

    // منع تحديث بعض الحقول إذا لم يكن أدمن
    if (req.user.userType !== 'admin') {
      delete updateData.userType;
      delete updateData.isActive;
      delete updateData.addedBy;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات المستخدم بنجاح',
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🚗 إدارة السائقين
userController.manageDrivers = async (req, res) => {
  try {
    const { action, driverId } = req.body;

    // التحقق من الصلاحية (الإدمن والمشرفين فقط)
    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإدارة السائقين'
      });
    }

    const driver = await User.findOne({ 
      _id: driverId, 
      userType: 'driver' 
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'السائق غير موجود'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData.isActive = true;
        message = 'تم تفعيل السائق بنجاح';
        break;
      case 'deactivate':
        updateData.isActive = false;
        message = 'تم إيقاف السائق بنجاح';
        break;
      case 'suspend':
        updateData.isActive = false;
        updateData.bannedReason = req.body.reason || 'تم الإيقاف من قبل المسؤول';
        message = 'تم تعليق السائق بنجاح';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'الإجراء غير معروف'
        });
    }

    await User.findByIdAndUpdate(driverId, updateData);

    // إرسال إشعار للسائق
    await sendDriverStatusNotification(driver, action, req.body.reason);

    res.json({
      success: true,
      message
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ الموافقة على ملف مستخدم
userController.approveProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    // التحقق من الصلاحية (الإدمن والمشرفين فقط)
    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالموافقة على الملفات'
      });
    }

    const completeProfile = await CompleteProfile.findOne({ user: userId });

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        error: 'الملف الشخصي غير موجود'
      });
    }

    completeProfile.profileStatus = status;
    completeProfile.reviewedBy = req.user.userId;
    completeProfile.reviewedAt = new Date();

    if (status === 'rejected' && rejectionReason) {
      completeProfile.rejectionReason = rejectionReason;
    }

    if (status === 'approved') {
      // تفعيل المستخدم إذا كان ملفه مقبول
      await User.findByIdAndUpdate(userId, { isActive: true });
    }

    await completeProfile.save();

    // إرسال إشعار للمستخدم
    await sendProfileStatusNotification(userId, status, rejectionReason);

    res.json({
      success: true,
      message: status === 'approved' ? 'تم الموافقة على الملف بنجاح' : 'تم رفض الملف',
      profile: completeProfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📊 إحصائيات المستخدمين
userController.getUserStats = async (req, res) => {
  try {
    // التحقق من الصلاحية (الإدمن والمتابعة فقط)
    if (!['admin', 'monitoring'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للإحصائيات'
      });
    }

    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ userType: 'customer' });
    const totalDrivers = await User.countDocuments({ userType: 'driver' });
    const activeDrivers = await User.countDocuments({ 
      userType: 'driver', 
      isActive: true 
    });
    const pendingProfiles = await CompleteProfile.countDocuments({ 
      profileStatus: 'submitted' 
    });

    const usersByType = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find()
      .select('name email userType createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalDrivers,
        activeDrivers,
        pendingProfiles,
        usersByType,
        recentUsers
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const sendDriverStatusNotification = async (driver, action, reason) => {
  try {
    let title, body;

    switch (action) {
      case 'activate':
        title = 'تم تفعيل حسابك';
        body = 'تم تفعيل حسابك كسائق في التطبيق';
        break;
      case 'deactivate':
        title = 'تم إيقاف حسابك';
        body = 'تم إيقاف حسابك كسائق مؤقتاً';
        break;
      case 'suspend':
        title = 'تم تعليق حسابك';
        body = `تم تعليق حسابك للأسباب التالية: ${reason}`;
        break;
    }

    const notification = new Notification({
      title,
      body,
      user: driver._id,
      type: 'profile_approved',
      data: {
        action,
        reason
      }
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار حالة السائق:', error);
  }
};

const sendProfileStatusNotification = async (userId, status, rejectionReason) => {
  try {
    let title, body;

    if (status === 'approved') {
      title = 'تم الموافقة على ملفك الشخصي';
      body = 'تمت الموافقة على ملفك الشخصي ويمكنك الآن استخدام التطبيق';
    } else {
      title = 'ملاحظات على ملفك الشخصي';
      body = `يحتاج ملفك الشخصي بعض التعديلات: ${rejectionReason}`;
    }

    const notification = new Notification({
      title,
      body,
      user: userId,
      type: status === 'approved' ? 'profile_approved' : 'profile_rejected',
      data: {
        status,
        rejectionReason
      }
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار حالة الملف:', error);
  }
};

module.exports = userController;