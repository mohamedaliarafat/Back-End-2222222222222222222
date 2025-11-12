const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// 👤 المسارات العامة
router.post('/', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), userController.createUser);
router.get('/', authMiddleware.authenticate, roleMiddleware.checkRole(['admin', 'monitoring', 'approval_supervisor']), userController.getUsers);
router.get('/stats', authMiddleware.authenticate, roleMiddleware.checkRole(['admin', 'monitoring']), userController.getUserStats);

// 🛍️ منتجات المستخدم
router.get('/my-products', authMiddleware.authenticate, userController.getMyProducts);

// 🚗 إدارة السائقين
router.patch('/drivers/manage', authMiddleware.authenticate, roleMiddleware.checkRole(['admin', 'approval_supervisor']), userController.manageDrivers);

// 📋 المسارات ذات المعلمات (يجب أن تكون في النهاية)
router.get('/:userId', authMiddleware.authenticate, userController.getUser);
router.put('/:userId', authMiddleware.authenticate, userController.updateUser);
router.patch('/:userId/approve-profile', authMiddleware.authenticate, roleMiddleware.checkRole(['admin', 'approval_supervisor']), userController.approveProfile);
router.get('/:userId/products', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), userController.getUserProducts);

module.exports = router;