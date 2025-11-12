const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: false },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "SAR" },
    
    // 🏦 معلومات التحويل البنكي
    bankTransfer: {
      bankName: { type: String, required: false },
      accountNumber: { type: String, required: false },
      accountName: { type: String, required: false },
      iban: { type: String, required: false },
      transferDate: { type: Date, default: null },
      referenceNumber: { type: String, default: "" }
    },

    // 📄 إيصال التحويل
    receipt: {
      file: { type: String, required: false },
      fileName: { type: String, default: "" },
      fileSize: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null }
    },

    // 📊 حالة الدفع
    status: {
      type: String,
      enum: ["hidden", "pending", "waiting_proof", "under_review", "verified", "rejected", "failed"],
      default: "hidden"
    },

    // 👨‍💼 المراجعة والموافقة
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
    


    // 📝 ملاحظات
    adminNotes: { type: String, default: "" },
    customerNotes: { type: String, default: "" },

    // ⏰ التواريخ
    paymentInitiatedAt: { type: Date, default: Date.now },
    proofSubmittedAt: { type: Date },
    verifiedAt: { type: Date },

    // 🔢 معلومات إضافية
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mada", "apple_pay", "google_pay", "other"],
      default: "bank_transfer"
    },

    // 🎯 تتبع المحاولات
    attemptCount: { type: Number, default: 1 },
    lastAttemptAt: { type: Date, default: Date.now }

  },
  { timestamps: true }
);

paymentSchema.pre("save", function (next) {
  if (this.isModified('status') && this.status === 'waiting_proof') {
    this.lastAttemptAt = new Date();
    this.attemptCount += 1;
  }
  if (this.isModified('receipt.file') && this.receipt.file) {
    this.receipt.uploadedAt = new Date();
    this.proofSubmittedAt = new Date();
  }
  if (this.isModified('reviewedBy') && this.reviewedBy) {
    this.reviewedAt = new Date();
  }
  if (this.isModified('status') && this.status === 'verified') {
    this.verifiedAt = new Date();
  }
  next();
});

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ "bankTransfer.transferDate": 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ "bankTransfer.referenceNumber": 1 });
paymentSchema.index({ reviewedBy: 1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);