// routes/supervisor.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// 📋 لوحة تحكم المشرف
router.get('/dashboard', authMiddleware.authenticate, roleMiddleware.checkRole(['approval_supervisor']), (req, res) => {
  res.json({
    success: true,
    message: 'Supervisor dashboard - working',
    dashboard: {
      pendingApprovals: 8,
      totalDrivers: 42,
      activeOrders: 15,
      pendingReviews: 5,
      todayEarnings: 12500.0
    }
  });
});

router.patch('/approve-order', authMiddleware.authenticate, roleMiddleware.checkRole(['approval_supervisor']), (req, res) => {
  const { orderId, orderType } = req.body;
  
  res.json({
    success: true,
    message: 'تم الموافقة على الطلب بنجاح',
    orderId: orderId,
    orderType: orderType,
    status: 'approved'
  });
});

router.patch('/reject-order', authMiddleware.authenticate, roleMiddleware.checkRole(['approval_supervisor']), (req, res) => {
  const { orderId, orderType, reason } = req.body;
  
  res.json({
    success: true,
    message: 'تم رفض الطلب بنجاح',
    orderId: orderId,
    orderType: orderType,
    status: 'rejected',
    reason: reason
  });
});

router.patch('/review-profile', authMiddleware.authenticate, roleMiddleware.checkRole(['approval_supervisor']), (req, res) => {
  const { userId, status, notes } = req.body;
  
  res.json({
    success: true,
    message: 'تم مراجعة الملف الشخصي بنجاح',
    userId: userId,
    status: status,
    notes: notes
  });
});

module.exports = router;