const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 📍 معلومات العنوان
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'Saudi Arabia' },
  postalCode: { type: String, default: '' },
  
  // 🏠 نوع العنوان
  addressType: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  
  // 📞 معلومات الاتصال
  contactName: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  
  // 📍 الإحداثيات الجغرافية
  coordinates: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  
  // 📝 تعليمات التسليم
  deliveryInstructions: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }

}, { timestamps: true });

AddressSchema.index({ userId: 1 });
AddressSchema.index({ isDefault: 1 });
AddressSchema.index({ coordinates: "2dsphere" });
AddressSchema.index({ city: 1, district: 1 });

module.exports = mongoose.models.Address || mongoose.model('Address', AddressSchema);