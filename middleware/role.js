// middleware/role.js
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لهذه الخدمة'
      });
    }
    next();
  };
};