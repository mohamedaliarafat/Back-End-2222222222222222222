// routes/addresses.js
const express = require('express');
const {
  createAddress,
  getUserAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 📍 إدارة العناوين
router.post('/', authenticateToken, createAddress);
router.get('/', authenticateToken, getUserAddresses);
router.get('/:addressId', authenticateToken, getAddress);
router.put('/:addressId', authenticateToken, updateAddress);
router.delete('/:addressId', authenticateToken, deleteAddress);
router.patch('/:addressId/set-default', authenticateToken, setDefaultAddress);

module.exports = router;