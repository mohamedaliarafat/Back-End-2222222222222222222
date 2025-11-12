// routes/chat.js
const express = require('express');
const {
  createChat,
  sendMessage,
  getMessages,
  startCall,
  getUserChats,
  deleteChat
} = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 💬 إدارة المحادثات
router.get('/', authenticateToken, getUserChats);
router.post('/:orderType/:orderId', authenticateToken, createChat);
router.delete('/:chatId', authenticateToken, deleteChat);

// 📨 الرسائل
router.get('/:chatId/messages', authenticateToken, getMessages);
router.post('/:chatId/messages', authenticateToken, sendMessage);

// 📞 المكالمات
router.post('/:chatId/call', authenticateToken, startCall);

module.exports = router;