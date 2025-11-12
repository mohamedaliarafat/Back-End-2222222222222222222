// // controllers/driverController.js
// const Order = require('../models/Order');
// const Petrol = require('../models/Petrol');
// const User = require('../models/User');

// // 🚗 لوحة تحكم السائق
// exports.getDriverDashboard = async (req, res) => {
//   try {
//     const driverId = req.user.userId;

//     if (req.user.userType !== 'driver') {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بالوصول للوحة السائق'
//       });
//     }

//     // التحقق من أن السائق مفعل
//     const driver = await User.findById(driverId);
//     if (!driver.isActive) {
//       return res.status(403).json({
//         success: false,
//         error: 'حسابك غير مفعل. يرجى التواصل مع الإدارة'
//       });
//     }

//     // إحصائيات السائق
//     const totalOrders = await Order.countDocuments({ driverId });
//     const completedOrders = await Order.countDocuments({ 
//       driverId, 
//       status: 'delivered' 
//     });
//     const activeOrders = await Order.countDocuments({ 
//       driverId, 
//       status: { $in: ['assigned_to_driver', 'picked_up', 'in_transit'] } 
//     });

//     const totalFuelOrders = await Petrol.countDocuments({ driverId });
//     const completedFuelOrders = await Petrol.countDocuments({ 
//       driverId, 
//       status: 'completed' 
//     });

//     // الطلبات المتاحة
//     const availableOrders = await Order.find({ 
//       status: 'ready_for_delivery',
//       driverId: null 
//     })
//     .populate('customerId', 'name phone')
//     .sort({ createdAt: -1 })
//     .limit(10);

//     const availableFuelOrders = await Petrol.find({ 
//       status: 'ready_for_delivery',
//       driverId: null 
//     })
//     .populate('user', 'name phone')
//     .sort({ createdAt: -1 })
//     .limit(10);

//     // الطلبات النشطة
//     const myActiveOrders = await Order.find({
//       driverId,
//       status: { $in: ['assigned_to_driver', 'picked_up', 'in_transit'] }
//     })
//     .populate('customerId', 'name phone')
//     .sort({ createdAt: -1 });

//     const myActiveFuelOrders = await Petrol.find({
//       driverId,
//       status: { $in: ['assigned_to_driver', 'on_the_way', 'fueling'] }
//     })
//     .populate('user', 'name phone')
//     .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       dashboard: {
//         stats: {
//           totalOrders,
//           completedOrders,
//           activeOrders,
//           totalFuelOrders,
//           completedFuelOrders,
//           earnings: completedOrders * 15 + completedFuelOrders * 10 // مثال
//         },
//         available: {
//           orders: availableOrders,
//           fuelOrders: availableFuelOrders
//         },
//         active: {
//           orders: myActiveOrders,
//           fuelOrders: myActiveFuelOrders
//         }
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // ✅ قبول طلب
// exports.acceptOrder = async (req, res) => {
//   try {
//     const driverId = req.user.userId;
//     const { orderId, orderType } = req.body;

//     if (req.user.userType !== 'driver') {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بقبول الطلبات'
//       });
//     }

//     let order;
//     const updateData = {
//       driverId,
//       status: orderType === 'fuel' ? 'assigned_to_driver' : 'assigned_to_driver',
//       assignedToDriverAt: new Date()
//     };

//     if (orderType === 'fuel') {
//       order = await Petrol.findOneAndUpdate(
//         { 
//           _id: orderId, 
//           status: 'ready_for_delivery',
//           driverId: null 
//         },
//         updateData,
//         { new: true }
//       ).populate('user', 'name phone');
//     } else {
//       order = await Order.findOneAndUpdate(
//         { 
//           _id: orderId, 
//           status: 'ready_for_delivery',
//           driverId: null 
//         },
//         updateData,
//         { new: true }
//       ).populate('customerId', 'name phone');
//     }

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'الطلب غير موجود أو غير متاح'
//       });
//     }

//     res.json({
//       success: true,
//       message: 'تم قبول الطلب بنجاح',
//       order
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 📍 تحديث موقع السائق
// exports.updateDriverLocation = async (req, res) => {
//   try {
//     const driverId = req.user.userId;
//     const { coordinates, address } = req.body;

//     if (req.user.userType !== 'driver') {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بتحديث الموقع'
//       });
//     }

//     await User.findByIdAndUpdate(driverId, {
//       'location.coordinates': coordinates,
//       'location.address': address,
//       'location.lastUpdated': new Date()
//     });

//     res.json({
//       success: true,
//       message: 'تم تحديث الموقع بنجاح',
//       location: { coordinates, address, lastUpdated: new Date() }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🎯 تحديث حالة الطلب
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const driverId = req.user.userId;
//     const { orderId, orderType, status, location, note } = req.body;

//     if (req.user.userType !== 'driver') {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بتحديث حالة الطلب'
//       });
//     }

//     let order;

//     if (orderType === 'fuel') {
//       order = await Petrol.findOne({ 
//         _id: orderId, 
//         driverId 
//       });
//     } else {
//       order = await Order.findOne({ 
//         _id: orderId, 
//         driverId 
//       });
//     }

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'الطلب غير موجود أو غير مخصص لك'
//       });
//     }

//     // إضافة نقطة تتبع
//     const trackingPoint = {
//       status,
//       location,
//       note,
//       timestamp: new Date()
//     };

//     order.tracking.push(trackingPoint);
//     order.status = status;

//     // تحديث الأوقات الخاصة
//     if (status === 'picked_up' || status === 'on_the_way') {
//       order.pickedUpAt = new Date();
//     } else if (status === 'delivered' || status === 'completed') {
//       order.deliveredAt = new Date();
//       order.deliveryCode = generateDeliveryCode();
//     }

//     await order.save();

//     res.json({
//       success: true,
//       message: `تم تحديث حالة الطلب إلى ${getStatusText(status)}`,
//       order
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🎯 دوال مساعدة
// const generateDeliveryCode = () => {
//   return Math.random().toString(36).substring(2, 8).toUpperCase();
// };

// const getStatusText = (status) => {
//   const statusMap = {
//     'picked_up': 'تم الاستلام',
//     'on_the_way': 'في الطريق',
//     'in_transit': 'قيد التوصيل',
//     'fueling': 'جاري التعبئة',
//     'delivered': 'تم التسليم',
//     'completed': 'مكتمل'
//   };
//   return statusMap[status] || status;
// };


// controllers/driverController.js
const Order = require('../models/Order');
const Petrol = require('../models/Petrol');
const User = require('../models/User');

// 🚗 الحصول على ملف السائق الشخصي
exports.getDriverProfile = async (req, res) => {
  try {
    const driverId = req.user.userId;

    const driver = await User.findById(driverId)
      .populate('completeProfile')
      .select('-password');

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'السائق غير موجود'
      });
    }

    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        userType: driver.userType,
        isActive: driver.isActive || false,
        isVerified: driver.isVerified,
        profileImage: driver.profileImage,
        completeProfile: driver.completeProfile,
        vehicleInfo: driver.completeProfile?.vehicleInfo || {},
        canAcceptOrders: driver.isActive && driver.isVerified,
        location: driver.location
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📊 الحصول على إحصائيات السائق
exports.getDriverStats = async (req, res) => {
  try {
    const driverId = req.user.userId;

    // إحصائيات افتراضية للتجربة
    const stats = {
      overall: {
        totalOrders: 45,
        completedOrders: 40,
        cancelledOrders: 5,
        totalEarnings: 12500.50,
        rating: 4.8,
        ratingCount: 35,
        totalDistance: 1250.75
      },
      weekly: {
        totalOrders: 12,
        completedOrders: 10,
        cancelledOrders: 2,
        totalEarnings: 2800.00,
        rating: 4.9,
        ratingCount: 8,
        totalDistance: 320.50
      },
      monthly: {
        totalOrders: 45,
        completedOrders: 40,
        cancelledOrders: 5,
        totalEarnings: 12500.50,
        rating: 4.8,
        ratingCount: 35,
        totalDistance: 1250.75
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📦 الحصول على الطلبات المتاحة
exports.getAvailableOrders = async (req, res) => {
  try {
    // طلبات افتراضية للتجربة
    const availableOrders = [
      {
        id: '1',
        serviceType: 'fuel',
        status: 'ready_for_delivery',
        customerName: 'محمد أحمد',
        customerPhone: '0512345678',
        location: {
          address: 'حي النخيل، الرياض',
          lat: 24.7136,
          lng: 46.6753
        },
        fuelType: '91',
        fuelAmount: 40,
        totalPrice: 240.00,
        createdAt: new Date()
      },
      {
        id: '2',
        serviceType: 'product',
        status: 'ready_for_delivery',
        customerName: 'أحمد سالم',
        customerPhone: '0512345679',
        location: {
          address: 'حي العليا، الرياض',
          lat: 24.7236,
          lng: 46.6853
        },
        products: [
          { name: 'زيت محرك', quantity: 2, price: 120.00 }
        ],
        totalPrice: 240.00,
        createdAt: new Date()
      }
    ];

    res.json({
      success: true,
      orders: availableOrders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🚚 الحصول على الطلبات النشطة
exports.getActiveOrders = async (req, res) => {
  try {
    const activeOrders = []; // افتراضي فارغ

    res.json({
      success: true,
      orders: activeOrders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ الحصول على الطلبات المكتملة
exports.getCompletedOrders = async (req, res) => {
  try {
    const completedOrders = []; // افتراضي فارغ

    res.json({
      success: true,
      orders: completedOrders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 قبول طلب
exports.acceptOrder = async (req, res) => {
  try {
    const driverId = req.user.userId;
    const { orderId, orderType } = req.body;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بقبول الطلبات'
      });
    }

    // التحقق من أن السائق مفعل
    const driver = await User.findById(driverId);
    if (!driver.isActive) {
      return res.status(403).json({
        success: false,
        error: 'حسابك غير مفعل. يرجى التواصل مع الإدارة'
      });
    }

    res.json({
      success: true,
      message: 'تم قبول الطلب بنجاح',
      orderId,
      orderType
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📍 تحديث حالة الاتصال
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driverId = req.user.userId;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديث حالة الاتصال'
      });
    }

    await User.findByIdAndUpdate(driverId, {
      isActive: isOnline
    });

    res.json({
      success: true,
      message: isOnline ? 'تم التوصيل' : 'تم قطع الاتصال',
      isOnline
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗺️ تحديث الموقع
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const driverId = req.user.userId;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديث الموقع'
      });
    }

    await User.findByIdAndUpdate(driverId, {
      'location.coordinates.lat': lat,
      'location.coordinates.lng': lng,
      'location.address': address,
      'location.lastUpdated': new Date()
    });

    res.json({
      success: true,
      message: 'تم تحديث الموقع بنجاح',
      location: { lat, lng, address }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 💰 الحصول على أرباح السائق
exports.getDriverEarnings = async (req, res) => {
  try {
    const { period } = req.query;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لبيانات الأرباح'
      });
    }

    const earningsData = {
      totalEarnings: 1250.0,
      completedOrders: 15,
      rating: 4.8,
      orderEarnings: 1100.0,
      tips: 150.0,
      deductions: 0.0,
      chartData: [
        { label: 'الإثنين', value: 180.0 },
        { label: 'الثلاثاء', value: 220.0 },
        { label: 'الأربعاء', value: 190.0 },
        { label: 'الخميس', value: 210.0 },
        { label: 'الجمعة', value: 250.0 },
        { label: 'السبت', value: 200.0 }
      ]
    };

    res.json({
      success: true,
      ...earningsData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🚗 لوحة تحكم السائق
exports.getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.user.userId;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للوحة السائق'
      });
    }

    // التحقق من أن السائق مفعل
    const driver = await User.findById(driverId);
    if (!driver.isActive) {
      return res.status(403).json({
        success: false,
        error: 'حسابك غير مفعل. يرجى التواصل مع الإدارة'
      });
    }

    // إحصائيات افتراضية
    const dashboard = {
      stats: {
        totalOrders: 45,
        completedOrders: 40,
        activeOrders: 2,
        totalFuelOrders: 25,
        completedFuelOrders: 22,
        earnings: 12500.50
      },
      available: {
        orders: [
          {
            id: '1',
            serviceType: 'product',
            customerName: 'محمد أحمد',
            totalPrice: 150.00,
            createdAt: new Date()
          }
        ],
        fuelOrders: [
          {
            id: '2',
            serviceType: 'fuel',
            customerName: 'أحمد سالم',
            fuelType: '91',
            fuelAmount: 40,
            totalPrice: 240.00,
            createdAt: new Date()
          }
        ]
      },
      active: {
        orders: [],
        fuelOrders: []
      }
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 تحديث حالة الطلب
exports.updateOrderStatus = async (req, res) => {
  try {
    const driverId = req.user.userId;
    const { orderId, status, orderType, note, location } = req.body;

    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديث حالة الطلب'
      });
    }

    res.json({
      success: true,
      message: `تم تحديث حالة الطلب إلى ${getStatusText(status)}`,
      orderId,
      status,
      orderType
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const getStatusText = (status) => {
  const statusMap = {
    'picked_up': 'تم الاستلام',
    'on_the_way': 'في الطريق',
    'in_transit': 'قيد التوصيل',
    'fueling': 'جاري التعبئة',
    'delivered': 'تم التسليم',
    'completed': 'مكتمل',
    'assigned_to_driver': 'مخصص للسائق'
  };
  return statusMap[status] || status;
};