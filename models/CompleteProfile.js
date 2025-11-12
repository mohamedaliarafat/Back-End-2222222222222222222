const mongoose = require('mongoose');

const completeProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // 🏢 معلومات الشركة/الشخص
  companyName: { type: String, default: "" },
  email: { type: String, default: "" },
  
  // 📞 معلومات الاتصال
  contactPerson: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  contactPosition: { type: String, default: "" },

  // 📍 العنوان الوطني
  nationalAddress: {
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    district: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    }
  },

  // 📋 المستندات المطلوبة (بدل الحقول المكررة)
  documents: {
    // 🏢 رخصة تجارية
    commercialLicense: { 
      file: { type: String, default: "" },        // ملف الرخصة
      number: { type: String, default: "" },      // رقم الرخصة
      expiryDate: { type: Date, default: null },  // تاريخ الانتهاء
      verified: { type: Boolean, default: false } // تم التحقق
    },
    
    // ⚡ رخصة الطاقة
    energyLicense: { 
      file: { type: String, default: "" },
      number: { type: String, default: "" },
      expiryDate: { type: Date, default: null },
      verified: { type: Boolean, default: false }
    },
    
    // 📊 السجل التجاري
    commercialRecord: { 
      file: { type: String, default: "" },
      number: { type: String, default: "" },
      expiryDate: { type: Date, default: null },
      verified: { type: Boolean, default: false }
    },
    
    // 💰 الرقم الضريبي
    taxNumber: { 
      file: { type: String, default: "" },
      number: { type: String, default: "" },
      verified: { type: Boolean, default: false }
    },
    
    // 🏠 السجل الوطني للعنوان
    nationalAddressDocument: { 
      file: { type: String, default: "" },
      verified: { type: Boolean, default: false }
    },
    
    // 🚨 رخصة الدفاع المدني
    civilDefenseLicense: { 
      file: { type: String, default: "" },
      number: { type: String, default: "" },
      expiryDate: { type: Date, default: null },
      verified: { type: Boolean, default: false }
    }
  },

  // 🚗 للمقاولين والسائقين
  vehicleInfo: {
    type: { type: String, default: "" },
    model: { type: String, default: "" },
    year: { type: Number, default: null },
    licensePlate: { type: String, default: "" },
    color: { type: String, default: "" },
    insurance: {
      file: { type: String, default: "" },
      expiryDate: { type: Date, default: null },
      verified: { type: Boolean, default: false }
    }
  },

  // 📊 حالة الملف
  profileStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_correction'],
    default: 'draft'
  },

  // 👨‍💼 المراجعة والموافقة
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  reviewedAt: { type: Date },
  rejectionReason: { type: String, default: "" },

  // 📝 ملاحظات
  adminNotes: { type: String, default: "" },
  userNotes: { type: String, default: "" }

}, { timestamps: true });

// 📊 Indexes للأداء
completeProfileSchema.index({ user: 1 });
completeProfileSchema.index({ profileStatus: 1 });
completeProfileSchema.index({ "documents.commercialLicense.number": 1 });
completeProfileSchema.index({ "documents.energyLicense.number": 1 });
completeProfileSchema.index({ "documents.taxNumber.number": 1 });

module.exports = mongoose.models.CompleteProfile || mongoose.model('CompleteProfile', completeProfileSchema);