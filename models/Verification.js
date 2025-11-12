const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['registration', 'login', 'reset_password'], required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Verification', VerificationSchema);