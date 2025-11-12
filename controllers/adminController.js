// controllers/adminController.js
const User = require('../models/User');
const Order = require('../models/Order');
const Petrol = require('../models/Petrol');
const Company = require('../models/Company');
const Payment = require('../models/Payment');
const CompleteProfile = require('../models/CompleteProfile');

const adminController = {};

// 📊 لوحة تحكم الأدمن
adminController.getAdminDashboard = async (req, res) => {
  try {
    // التحقق من الصلاحية (يتم عادة في middleware)
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للوحة التحكم'
      });
    }

    // إحصائيات سريعة - استخدام Promise.all لأداء أفضل
    const [
      totalUsers,
      totalCustomers,
      totalDrivers,
      totalCompanies,
      totalOrders,
      pendingOrders,
      waitingPaymentOrders,
      totalFuelOrders,
      pendingFuelOrders,
      totalPayments,
      pendingPayments,
      pendingProfiles
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: 'customer' }),
      User.countDocuments({ userType: 'driver' }),
      Company.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'waiting_payment' }),
      Petrol.countDocuments(),
      Petrol.countDocuments({ status: 'pending' }),
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'under_review' }),
      CompleteProfile.countDocuments({ profileStatus: 'submitted' })
    ]);

    // طلبات حديثة - استخدام Promise.all
    const [recentOrders, recentFuelOrders] = await Promise.all([
      Order.find()
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Petrol.find()
        .populate('user', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    res.json({
      success: true,
      dashboard: {
        stats: {
          users: { 
            total: totalUsers, 
            customers: totalCustomers, 
            drivers: totalDrivers 
          },
          orders: { 
            total: totalOrders, 
            pending: pendingOrders, 
            waitingPayment: waitingPaymentOrders 
          },
          fuelOrders: { 
            total: totalFuelOrders, 
            pending: pendingFuelOrders 
          },
          payments: { 
            total: totalPayments, 
            pending: pendingPayments 
          },
          companies: { total: totalCompanies },
          pendingProfiles
        },
        recentActivity: {
          orders: recentOrders,
          fuelOrders: recentFuelOrders
        }
      }
    });

  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحميل لوحة التحكم'
    });
  }
};

// 👥 إدارة المستخدمين (متقدمة)
adminController.manageUsers = async (req, res) => {
  try {
    const { action, userId, data } = req.body;

    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإدارة المستخدمين'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'معرف المستخدم مطلوب'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData.isActive = true;
        updateData.bannedReason = '';
        updateData.bannedAt = null;
        message = 'تم تفعيل المستخدم بنجاح';
        break;
      
      case 'deactivate':
        updateData.isActive = false;
        updateData.bannedReason = data?.reason || 'تم الإيقاف من قبل الأدمن';
        updateData.bannedAt = new Date();
        message = 'تم إيقاف المستخدم بنجاح';
        break;
      
      case 'change_role':
        if (!data?.userType || !['customer', 'driver', 'admin'].includes(data.userType)) {
          return res.status(400).json({
            success: false,
            error: 'نوع المستخدم غير صحيح'
          });
        }
        updateData.userType = data.userType;
        message = `تم تغيير دور المستخدم إلى ${data.userType}`;
        break;
      
      case 'reset_password':
        // في الواقع يجب تشفير كلمة المرور
        const temporaryPassword = data?.password || '123456';
        updateData.password = temporaryPassword; // سيتم تشفيرها في middleware إذا كان موجوداً
        message = 'تم إعادة تعيين كلمة المرور بنجاح';
        break;
      
      case 'update_profile':
        if (data) {
          updateData = { ...updateData, ...data };
        }
        message = 'تم تحديث بيانات المستخدم بنجاح';
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: 'الإجراء غير معروف'
        });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true }
    ).select('-password'); // استبعاد كلمة المرور من النتيجة

    res.json({
      success: true,
      message,
      user: updatedUser
    });

  } catch (error) {
    console.error('Manage Users Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إدارة المستخدم'
    });
  }
};

// 💰 إدارة الأسعار والتسعير
adminController.managePricing = async (req, res) => {
  try {
    const { orderId, orderType, finalPrice } = req.body;

    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإدارة الأسعار'
      });
    }

    if (!orderId || !orderType || !finalPrice) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول مطلوبة: orderId, orderType, finalPrice'
      });
    }

    if (finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'السعر يجب أن يكون أكبر من الصفر'
      });
    }

    let order;
    const updateData = {
      'pricing.finalPrice': finalPrice,
      'pricing.priceVisible': true,
      'pricing.priceSetBy': req.user._id || req.user.userId,
      'pricing.priceSetAt': new Date(),
      status: 'waiting_payment'
    };

    if (orderType === 'fuel') {
      order = await Petrol.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      ).populate('user', 'name phone email');
    } else if (orderType === 'order') {
      order = await Order.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      ).populate('customerId', 'name phone email');
    } else {
      return res.status(400).json({
        success: false,
        error: 'نوع الطلب غير صحيح'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديد السعر بنجاح',
      order: {
        _id: order._id,
        type: orderType,
        finalPrice: order.pricing.finalPrice,
        customer: order.customerId || order.user,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Manage Pricing Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديد السعر'
    });
  }
};

// 🏢 إعدادات النظام
adminController.systemSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتعديل إعدادات النظام'
      });
    }

    // الإعدادات الافتراضية
    const defaultSettings = {
      fuelPrices: {
        '91': 2.18,
        '95': 2.33,
        '98': 2.55,
        'diesel': 1.85,
        'premium_diesel': 2.10
      },
      serviceFees: {
        delivery: 15,
        express: 25,
        sameDay: 40,
        installation: 30
      },
      commissionRates: {
        driver: 0.7, // 70% للسائق
        company: 0.3  // 30% للشركة
      },
      appSettings: {
        maintenanceMode: false,
        newRegistrations: true,
        maxOrdersPerUser: 10,
        notificationEnabled: true
      },
      businessHours: {
        start: '08:00',
        end: '22:00',
        days: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
      }
    };

    // دمج الإعدادات مع القيم الافتراضية
    const systemSettings = {
      ...defaultSettings,
      ...settings,
      // دمج متداخل للإعدادات الفرعية
      fuelPrices: { ...defaultSettings.fuelPrices, ...settings?.fuelPrices },
      serviceFees: { ...defaultSettings.serviceFees, ...settings?.serviceFees },
      commissionRates: { ...defaultSettings.commissionRates, ...settings?.commissionRates },
      appSettings: { ...defaultSettings.appSettings, ...settings?.appSettings },
      businessHours: { ...defaultSettings.businessHours, ...settings?.businessHours }
    };

    // هنا يمكن حفظ الإعدادات في قاعدة بيانات
    // const savedSettings = await SystemSettings.findOneAndUpdate(
    //   {},
    //   { settings: systemSettings, updatedBy: req.user._id },
    //   { upsert: true, new: true }
    // );

    res.json({
      success: true,
      message: 'تم تحديث إعدادات النظام بنجاح',
      settings: systemSettings,
      updatedAt: new Date(),
      updatedBy: req.user._id || req.user.userId
    });

  } catch (error) {
    console.error('System Settings Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث إعدادات النظام'
    });
  }
};

// 📈 إحصائيات متقدمة
adminController.getAdvancedStats = async (req, res) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للإحصائيات'
      });
    }

    // إحصائيات الشهر الحالي
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      monthlyOrders,
      monthlyRevenue,
      newUsersThisMonth,
      activeUsers
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.finalPrice' } } }
      ]),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ isActive: true })
    ]);

    const revenue = monthlyRevenue[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        monthly: {
          orders: monthlyOrders,
          revenue: revenue,
          newUsers: newUsersThisMonth
        },
        users: {
          active: activeUsers,
          total: await User.countDocuments()
        }
      }
    });

  } catch (error) {
    console.error('Advanced Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحميل الإحصائيات'
    });
  }
};

module.exports = adminController;