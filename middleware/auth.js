// // const jwt = require('jsonwebtoken');
// // const User = require('../models/User');

// // // 🔐 المصادقة
// // exports.authenticate = async (req, res, next) => {
// //   try {
// //     const token = req.header('Authorization')?.replace('Bearer ', '');
    
// //     if (!token) {
// //       return res.status(401).json({
// //         success: false,
// //         error: 'الوصول مرفوض، لا يوجد token'
// //       });
// //     }

// //     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
// //     const user = await User.findById(decoded.userId).select('-password');
    
// //     if (!user) {
// //       return res.status(401).json({
// //         success: false,
// //         error: 'المستخدم غير موجود'
// //       });
// //     }

// //     // التحقق من حالة المستخدم إذا كان الحقل موجوداً
// //     if (user.isActive === false) {
// //       return res.status(401).json({
// //         success: false,
// //         error: 'الحساب غير مفعل'
// //       });
// //     }

// //     req.user = {
// //       userId: user._id,
// //       userType: user.userType,
// //       phone: user.phone,
// //       isVerified: user.isVerified
// //     };

// //     next();
// //   } catch (error) {
// //     res.status(401).json({
// //       success: false,
// //       error: 'Token غير صالح'
// //     });
// //   }
// // };

// // // 🛡️ التحقق من الصلاحيات
// // exports.authorize = (allowedRoles) => {
// //   return (req, res, next) => {
// //     if (!allowedRoles.includes(req.user.userType)) {
// //       return res.status(403).json({
// //         success: false,
// //         error: 'غير مسموح بالوصول لهذا المسار'
// //       });
// //     }
// //     next();
// //   };
// // };

// // // 🔍 التحقق من التحقق من الهاتف
// // exports.requireVerification = (req, res, next) => {
// //   if (!req.user.isVerified) {
// //     return res.status(403).json({
// //       success: false,
// //       error: 'يجب التحقق من رقم الهاتف أولاً'
// //     });
// //   }
// //   next();
// // };

// // // 📋 التحقق من اكتمال الملف الشخصي
// // exports.requireCompleteProfile = async (req, res, next) => {
// //   try {
// //     const user = await User.findById(req.user.userId).populate('completeProfile');
    
// //     if (!user.completeProfile) {
// //       return res.status(403).json({
// //         success: false,
// //         error: 'يجب إكمال الملف الشخصي أولاً'
// //       });
// //     }

// //     if (user.completeProfile.profileStatus !== 'approved') {
// //       return res.status(403).json({
// //         success: false,
// //         error: 'الملف الشخصي قيد المراجعة'
// //       });
// //     }

// //     next();
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       error: 'خطأ في التحقق من الملف الشخصي'
// //     });
// //   }
// // };




// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// // 🔐 المصادقة
// exports.authenticate = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         error: 'الوصول مرفوض، لا يوجد token'
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
//     console.log('🔐 Decoded JWT:', decoded); // للديباج
    
//     // ✅ إصلاح: استخدام userId من الـ JWT مباشرة
//     const userId = decoded.userId || decoded.id;
    
//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         error: 'Token لا يحتوي على معرف المستخدم'
//       });
//     }

//     const user = await User.findById(userId).select('-password');
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         error: 'المستخدم غير موجود'
//       });
//     }

//     // التحقق من حالة المستخدم إذا كان الحقل موجوداً
//     if (user.isActive === false) {
//       return res.status(401).json({
//         success: false,
//         error: 'الحساب غير مفعل'
//       });
//     }

//     // ✅ إصلاح: إضافة حقل id ليكون متوافقاً مع السيرفر
//     req.user = {
//       id: user._id, // ✅ هذا ما يبحث عنه السيرفر
//       userId: user._id, // ✅ للحفاظ على التوافق
//       userType: user.userType,
//       phone: user.phone,
//       isVerified: user.isVerified
//     };

//     console.log('👤 User set in request:', req.user); // للديباج

//     next();
//   } catch (error) {
//     console.error('❌ Auth middleware error:', error);
//     res.status(401).json({
//       success: false,
//       error: 'Token غير صالح'
//     });
//   }
// };

// // 🛡️ التحقق من الصلاحيات
// exports.authorize = (allowedRoles) => {
//   return (req, res, next) => {
//     if (!allowedRoles.includes(req.user.userType)) {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بالوصول لهذا المسار'
//       });
//     }
//     next();
//   };
// };

// // 🔍 التحقق من التحقق من الهاتف
// exports.requireVerification = (req, res, next) => {
//   if (!req.user.isVerified) {
//     return res.status(403).json({
//       success: false,
//       error: 'يجب التحقق من رقم الهاتف أولاً'
//     });
//   }
//   next();
// };

// // 📋 التحقق من اكتمال الملف الشخصي
// exports.requireCompleteProfile = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.user.userId).populate('completeProfile');
    
//     if (!user.completeProfile) {
//       return res.status(403).json({
//         success: false,
//         error: 'يجب إكمال الملف الشخصي أولاً'
//       });
//     }

//     if (user.completeProfile.profileStatus !== 'approved') {
//       return res.status(403).json({
//         success: false,
//         error: 'الملف الشخصي قيد المراجعة'
//       });
//     }

//     next();
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: 'خطأ في التحقق من الملف الشخصي'
//     });
//   }
// };

// // ✅ إضافة middleware للتحقق من الـ userId في routes التي تحتاجه
// exports.ensureUserId = (req, res, next) => {
//   if (!req.user || !req.user.id) {
//     return res.status(400).json({
//       success: false,
//       error: 'معرف المستخدم غير متوفر'
//     });
//   }
//   next();
// };



const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 المصادقة
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'الوصول مرفوض، لا يوجد token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    console.log('🔐 Decoded JWT:', decoded); // للديباج
    
    // ✅ إصلاح: استخدام userId من الـ JWT مباشرة
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Token لا يحتوي على معرف المستخدم'
      });
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }

    // التحقق من حالة المستخدم إذا كان الحقل موجوداً
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        error: 'الحساب غير مفعل'
      });
    }

    // ✅ إصلاح: إضافة كافة الحقول المطلوبة مع fallbacks
    req.user = {
      id: user._id, // ✅ هذا ما يبحث عنه السيرفر
      userId: user._id, // ✅ للحفاظ على التوافق
      userType: user.userType || user.role, // ✅ دعم كلا الحقلين
      role: user.role || user.userType, // ✅ دعم كلا الحقلين
      phone: user.phone,
      isVerified: user.isVerified,
      // ✅ إضافة أي بيانات أخرى قد تحتاجها الـ controllers
      name: user.name,
      email: user.email
    };

    console.log('👤 User set in request:', req.user); // للديباج

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Token غير صالح'
    });
  }
};

// 🛡️ التحقق من الصلاحيات - الإصدار المحسّن
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 Authorization Check:', {
      user: req.user,
      allowedRoles: allowedRoles
    });

    // ✅ التحقق من كلا الحقلين: userType و role
    const userRole = req.user.userType || req.user.role;
    
    if (!userRole) {
      console.log('❌ No role found in user object');
      return res.status(403).json({
        success: false,
        error: 'لم يتم العثور على صلاحية المستخدم'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      console.log('❌ Role not allowed:', userRole);
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لهذا المسار'
      });
    }

    console.log('✅ Authorization passed:', userRole);
    next();
  };
};

// 🛡️ التحقق من الصلاحيات (للتوافق مع الكود القديم)
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 Role Check - User:', {
      id: req.user.id,
      userType: req.user.userType,
      role: req.user.role,
      effectiveRole: req.user.userType || req.user.role,
      allowedRoles: allowedRoles
    });

    const userRole = req.user.userType || req.user.role;
    
    if (!userRole) {
      console.log('❌ No role found in user object');
      return res.status(403).json({
        success: false,
        error: 'لم يتم العثور على صلاحية المستخدم'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      console.log('❌ Role not allowed:', userRole);
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لهذه الخدمة'
      });
    }

    console.log('✅ Role check passed:', userRole);
    next();
  };
};

// 🔍 التحقق من التحقق من الهاتف
exports.requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'يجب التحقق من رقم الهاتف أولاً'
    });
  }
  next();
};

// 📋 التحقق من اكتمال الملف الشخصي
exports.requireCompleteProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).populate('completeProfile');
    
    if (!user.completeProfile) {
      return res.status(403).json({
        success: false,
        error: 'يجب إكمال الملف الشخصي أولاً'
      });
    }

    if (user.completeProfile.profileStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'الملف الشخصي قيد المراجعة'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الملف الشخصي'
    });
  }
};

// ✅ إضافة middleware للتحقق من الـ userId في routes التي تحتاجه
exports.ensureUserId = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'معرف المستخدم غير متوفر'
    });
  }
  next();
};

// ✅ middleware اختباري للتحقق من البيانات
exports.testAuth = (req, res, next) => {
  console.log('🧪 Test Auth - Full User Object:', req.user);
  res.json({
    success: true,
    message: 'Auth test successful',
    user: req.user
  });
};