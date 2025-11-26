// routes/fuelTransferRoutes.js
const express = require('express');
const router = express.Router();
const fuelTransferController = require('../controllers/fuelTransferController');
const { authenticate, authorize, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 🔐 تطبيق المصادقة على جميع الطرق
router.use(authenticate);

// 📝 طلبات العملاء
router.post(
  '/request',
  checkRole(['customer']),
  fuelTransferController.createRequest
);

router.post(
  '/:orderId/upload-invoice',
  checkRole(['customer']),
  upload.single('invoice'),
  fuelTransferController.uploadAramcoInvoice
);

router.get(
  '/my-requests',
  checkRole(['customer']),
  fuelTransferController.getUserRequests
);

// 📋 لوحة التحكم (للأدمن والمشرفين)
router.get(
  '/',
  checkRole(['admin', 'approval_supervisor', 'monitoring']),
  fuelTransferController.getAllRequests
);

// ✅ الموافقة والرفض (للمشرفين)
router.put(
  '/:orderId/approve',
  checkRole(['admin', 'approval_supervisor']),
  fuelTransferController.approveRequest
);

router.put(
  '/:orderId/reject',
  checkRole(['admin', 'approval_supervisor']),
  fuelTransferController.rejectRequest
);

// 🚗 إدارة السائقين (للأدمن فقط)
router.put(
  '/:orderId/assign-driver',
  checkRole(['admin']),
  fuelTransferController.assignDriver
);

// 🔄 تحديث الحالة (للسائقين والأدمن)
router.put(
  '/:orderId/status',
  checkRole(['admin', 'driver']),
  fuelTransferController.updateStatus
);

// 📊 الإحصائيات (للأدمن والمتابعة)
router.get(
  '/stats/overview',
  checkRole(['admin', 'monitoring']),
  fuelTransferController.getStats
);

module.exports = router;