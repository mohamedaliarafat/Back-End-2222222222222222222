const mongoose = require('mongoose');

const completeProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // ==== البيانات الشخصية / بيانات الشركة ====
  companyName: { type: String, default: "" },
  email: { type: String, default: "" },
  contactPerson: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  contactPosition: { type: String, default: "" },

  // ==== العنوان الوطني ====
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

  // ==== الوثائق فقط (شيلنا الـ number لأنك مكنتش بتبعته أصلاً) ====
  documents: {
    commercialLicense: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
    energyLicense: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
    commercialRecord: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
    taxNumber: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
    nationalAddressDocument: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
    civilDefenseLicense: { 
      file: { type: String, default: "" }, 
      verified: { type: Boolean, default: false } 
    },
  },

  // ==== حالة الملف الشخصي ====
  profileStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_correction'],
    default: 'draft'
  },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  rejectionReason: { type: String, default: "" },

  adminNotes: { type: String, default: "" },
  userNotes: { type: String, default: "" }

}, { timestamps: true });

// Indexes
completeProfileSchema.index({ user: 1 });
completeProfileSchema.index({ profileStatus: 1 });

module.exports = mongoose.models.CompleteProfile || mongoose.model('CompleteProfile', completeProfileSchema);