const express = require('express');
const authMiddleware = require("../middleware/auth");
const roleMiddleware = require("../middleware/role")
const paymentController = require("../controllers/paymentController")

const router = express.Router();

// 📊 إحصائيات المدفوعات (للإدمن) - ⭐ مسار جديد
router.get('/stats', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  paymentController.getPaymentStats  // تحتاج لإنشاء هذه الدالة
);

// 💳 رفع إيصال الدفع (للعملاء)
router.post('/:orderType/:orderId/upload-proof', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['customer']), 
  paymentController.uploadPaymentProof
);

// ✅ التحقق من الدفع (للإدمن)
router.patch('/:paymentId/verify', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  paymentController.verifyPayment
);

// 📋 جلب المدفوعات
router.get('/', 
  authMiddleware.authenticate, 
  paymentController.getPayments
);

module.exports = router;