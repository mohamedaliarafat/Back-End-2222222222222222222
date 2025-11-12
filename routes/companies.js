const express = require('express');
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// 🏢 إدارة الشركات
router.post('/', authMiddleware.authenticate, companyController.createCompany);
router.get('/', companyController.getCompanies); // عام للجميع
router.get('/my-companies', authMiddleware.authenticate, companyController.getUserCompanies);
router.get('/stats', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), companyController.getCompanyStats);
router.get('/:companyId', companyController.getCompany); // عام للجميع

// ✏️ تحديث الشركات (للمالك فقط)
router.put('/:companyId', authMiddleware.authenticate, companyController.updateCompany);
router.patch('/:companyId/services', authMiddleware.authenticate, companyController.addService);

// ✅ التحقق من الشركات (للإدمن فقط)
router.patch('/:companyId/verify', authMiddleware.authenticate, roleMiddleware.checkRole(['admin']), companyController.verifyCompany);

// 🛍️ منتجات الشركة
router.get('/:companyId/products', companyController.getCompanyProducts); // عام للجميع

module.exports = router;