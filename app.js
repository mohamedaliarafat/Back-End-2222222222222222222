const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware الأساسي
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ⚠️ إصلاح: إضافة Socket.io إذا كان موجوداً
try {
  const { configureSocket } = require('./config/socket');
  const io = configureSocket(server);
  
  // جعل io متاحاً في الـ req
  app.use((req, res, next) => {
    req.io = io;
    next();
  });
  console.log('✅ Socket.io configured');
} catch (error) {
  console.log('ℹ️ Socket.io not configured - continuing without it');
}

// Routes
app.use('/api', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'حدث خطأ في الخادم'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'الرابط غير موجود'
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 6016;
server.listen(PORT, () => {  // ⚠️ إصلاح: استخدام server بدلاً من app
  console.log(`🚀 Server running on port ${PORT}`);
});

require('./jobs/notificationJobs');



module.exports = app;