// routes/products.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// 🛍️ المنتجات (عرض للجميع)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Products list - under development',
    products: []
  });
});

router.get('/:productId', (req, res) => {
  res.json({
    success: true,
    message: 'Product details - under development',
    productId: req.params.productId
  });
});

// 🆕 إنشاء طلب منتج (للعملاء)
router.post('/order', authMiddleware.authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Product order created - under development',
    order: req.body
  });
});

// 👨‍💼 إدارة المنتجات (للإدمن فقط)
router.post('/', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Product created - under development',
    product: req.body
  });
});

router.put('/:productId', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Product updated - under development',
    productId: req.params.productId,
    updates: req.body
  });
});

// 📊 الإحصائيات (للإدمن والمراقبة)
router.get('/stats/overview', authMiddleware.authenticate, roleMiddleware.checkRole(['admin', 'monitoring']), (req, res) => {
  res.json({
    success: true,
    message: 'Product stats - under development',
    stats: {}
  });
});

// 👤 منتجات المستخدم
router.get('/user/:userId/products', authMiddleware.authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'User products - under development',
    userId: req.params.userId,
    products: []
  });
});

// 🏢 منتجات الشركة
router.get('/company/:companyId/products', (req, res) => {
  res.json({
    success: true,
    message: 'Company products - under development',
    companyId: req.params.companyId,
    products: []
  });
});

module.exports = router;