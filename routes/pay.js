
const express = require('express');
const router = express.Router();
const payController = require('../controllers/payController');
const { authenticate, authorize, checkRole } = require('../middleware/auth');

// 🔐 تطبيق المصادقة على جميع طرق الدفع
router.use(authenticate);

// 💳 إنشاء Payment Intent
router.post(
  '/create-payment-intent',
  checkRole(['customer']),
  payController.createPaymentIntent
);

// ✅ تأكيد الدفع
router.post(
  '/confirm-payment',
  checkRole(['customer']),
  payController.confirmPayment
);

// 📊 جلب حالة الدفع
router.get(
  '/status/:orderId',
  checkRole(['customer']),
  payController.getPaymentStatus
);

// 👤 جلب مدفوعات المستخدم
router.get(
  '/my-payments',
  checkRole(['customer']),
  payController.getMyPayments
);

// ↩️ استرداد المبلغ
router.post(
  '/:paymentId/refund',
  checkRole(['customer']),
  payController.refundPayment
);

// 📈 إحصائيات الدفع
router.get(
  '/stats/overview',
  checkRole(['customer']),
  payController.getPaymentStats
);

// 🛡️ طرق الأدمن (اختيارية)
router.get(
  '/admin/payments',
  checkRole(['admin', 'monitoring']),
  async (req, res) => {
    // يمكن إضافة منطق الأدمن هنا
    res.json({ message: 'لوحة تحكم مدفوعات الأدمن' });
  }
);

module.exports = router;