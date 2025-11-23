// middleware/role.js
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // ✅ التحقق من كلا الحقلين: userType و role
    const userRole = req.user.userType || req.user.role;
    
    console.log('🔐 Role Check - User:', {
      id: req.user.id,
      userType: req.user.userType,
      role: req.user.role,
      effectiveRole: userRole,
      allowedRoles: allowedRoles
    });

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