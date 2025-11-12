const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// 📊 لوحة تحكم الأدمن
router.get('/dashboard', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  adminController.getAdminDashboard
);

router.patch('/users/manage', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  adminController.manageUsers
);

router.patch('/pricing/manage', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  adminController.managePricing
);

router.patch('/system-settings', 
  authMiddleware.authenticate, 
  roleMiddleware.checkRole(['admin']), 
  adminController.systemSettings
);

module.exports = router;