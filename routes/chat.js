// routes/chat.js
const express = require('express');
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

const router = express.Router();

// 💬 إدارة المحادثات
router.get('/', auth.authenticate, chatController.getUserChats);
router.post('/:orderType/:orderId', auth.authenticate, chatController.createChat);
router.delete('/:chatId', auth.authenticate, chatController.deleteChat);

// 📨 الرسائل
router.get('/:chatId/messages', auth.authenticate, chatController.getMessages);
router.post('/:chatId/messages', auth.authenticate, chatController.sendMessage);

// 📞 المكالمات
router.post('/:chatId/call', auth.authenticate, chatController.startCall);

module.exports = router;