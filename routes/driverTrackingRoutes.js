// // routes/driverTrackingRoutes.js
// const express = require('express');
// const router = express.Router();
// const DriverLocation = require('../models/DriverLocation');
// const { getIO } = require('../socket');

// // auth middleware (حسب مشروعك) لازم يكون السائق مسجل دخول
// const protect = require('../middlewares/auth'); 

// // POST /api/drivers/live-location
// router.post('/live-location', protect, async (req, res) => {
//   try {
//     const driverId = req.user._id; // أو req.user.id
//     const { lat, lng, heading, speed, accuracy } = req.body;

//     if (lat == null || lng == null) {
//       return res.status(400).json({ success: false, error: "lat/lng required" });
//     }

//     const doc = await DriverLocation.findOneAndUpdate(
//       { driverId },
//       { lat, lng, heading: heading ?? 0, speed: speed ?? 0, accuracy: accuracy ?? 0, updatedAt: new Date() },
//       { upsert: true, new: true }
//     );

//     // بث لحظي للادمن
//     const io = getIO();
//     io.to(`driver:${driverId}`).emit('driver_location_update', {
//       driverId: String(driverId),
//       lat: doc.lat,
//       lng: doc.lng,
//       heading: doc.heading,
//       speed: doc.speed,
//       accuracy: doc.accuracy,
//       updatedAt: doc.updatedAt,
//     });

//     return res.json({ success: true, location: doc });
//   } catch (e) {
//     console.log("❌ live-location error:", e);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// });

// // GET /api/drivers/:driverId/live-location  (للتحميل الأولي)
// router.get('/:driverId/live-location', protect, async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const doc = await DriverLocation.findOne({ driverId });
//     return res.json({ success: true, location: doc });
//   } catch (e) {
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// });

// module.exports = router;
