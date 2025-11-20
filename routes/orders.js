// routes/Orders.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const OrderController = require('../controllers/orderController');

const router = express.Router();

// 📊 إحصائيات طلبات الوقود
router.get('/stats', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin', 'monitoring']), 
  async (req, res) => {
    try {
      const Order = require('../models/Order');
      
      const stats = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$pricing.finalPrice' },
            totalLiters: { $sum: '$fuelDetails.fuelLiters' }
          }
        }
      ]);

      const ordersByFuelType = await Order.aggregate([
        {
          $group: {
            _id: '$fuelDetails.fuelType',
            count: { $sum: 1 },
            totalLiters: { $sum: '$fuelDetails.fuelLiters' }
          }
        }
      ]);

      const recentOrders = await Order.find()
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        message: 'إحصائيات طلبات الوقود',
        stats: stats[0] || {
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          totalLiters: 0
        },
        ordersByFuelType,
        recentOrders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ⛽ إنشاء طلب وقود
router.post('/', authMiddleware.authenticate, OrderController.createOrder);

// 📋 جلب طلبات الوقود
router.get('/', authMiddleware.authenticate, OrderController.getOrders);

// 👁️ جلب طلب وقود محدد
router.get('/:orderId', authMiddleware.authenticate, OrderController.getOrder);

// ✅ تحديث حالة طلب الوقود (للمشرفين)
router.patch('/:orderId/status', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['approval_supervisor', 'admin', 'monitoring']), 
  OrderController.updateOrderStatus
);

// 💰 تحديد سعر طلب الوقود
router.patch('/:orderId/price', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  OrderController.setOrderPrice
);

// 💰 تحديث السعر فقط بدون تغيير الحالة
router.patch('/:orderId/price-only', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  OrderController.updateOrderPriceOnly
);

// 🎛️ موافقة نهائية على الطلب مع السعر
router.patch('/:orderId/final-approve', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin', 'approval_supervisor']), 
  OrderController.finalApproveOrder
);

// 🚗 تخصيص سائق لطلب الوقود
router.patch('/:orderId/assign-driver', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin', 'approval_supervisor']), 
  OrderController.assignOrderDriver
);

// 📍 تحديث تتبع طلب الوقود (للسائق)
router.patch('/:orderId/tracking', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['driver']), 
  OrderController.updateOrderTracking
);

// ❌ إلغاء طلب الوقود
router.patch('/:orderId/cancel', 
  authMiddleware.authenticate, 
  OrderController.cancelOrder
);

module.exports = router;