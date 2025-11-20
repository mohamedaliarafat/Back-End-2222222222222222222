// jobs/notificationJobs.js
const cron = require('node-cron');
const notificationService = require('../services/notificationService');

// تشغيل كل دقيقة للتحقق من الإشعارات المجدولة
cron.schedule('* * * * *', async () => {
  console.log('🔔 Checking for scheduled notifications...');
  await notificationService.processScheduledNotifications();
});

// تنظيف الإشعارات المنتهية كل يوم في 2 صباحاً
cron.schedule('0 2 * * *', async () => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`🧹 تم تنظيف ${result.deletedCount} إشعار منتهي`);
  } catch (error) {
    console.error('Error cleaning expired notifications:', error);
  }
});

console.log('✅ Notification jobs started');