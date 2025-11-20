// const express = require('express');
// const addressController = require('../controllers/addressController');
// const authMiddleware = require('../middleware/auth');

// const router = express.Router();

// // 📍 إدارة العناوين
// router.post('/', authMiddleware, addressController.createAddress);
// router.get('/', authMiddleware, addressController.getUserAddresses);
// router.get('/:addressId', authMiddleware, addressController.getAddress);
// router.put('/:addressId', authMiddleware, addressController.updateAddress);
// router.delete('/:addressId', authMiddleware, addressController.deleteAddress);
// router.patch('/:addressId/set-default', authMiddleware, addressController.setDefaultAddress);

// module.exports = router;

// routes/addresses.js
const express = require('express');
const router = express.Router();

// استيراد الدوال بشكل صحيح
const addressController = require('../controllers/addressController');
const auth = require('../middleware/auth'); // استيراد الكامل

// 📍 إدارة العناوين
router.post('/', auth.authenticate, addressController.createAddress);
router.get('/', auth.authenticate, addressController.getUserAddresses);
router.get('/:addressId', auth.authenticate, addressController.getAddress);
router.put('/:addressId', auth.authenticate, addressController.updateAddress);
router.delete('/:addressId', auth.authenticate, addressController.deleteAddress);
router.patch('/:addressId/set-default', auth.authenticate, addressController.setDefaultAddress);

module.exports = router;