// models/DriverLocation.js
const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  heading: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

driverLocationSchema.index({ driverId: 1, updatedAt: -1 });

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
