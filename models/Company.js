const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema({
    name: { type: String, required: [true, "اسم الشركة مطلوب"] },
    commercialName: { type: String, required: [true, "الاسم التجاري مطلوب"] },
    contactInfo: {
        phone: { type: String, required: true },
        email: { type: String, required: true },
        website: { type: String, default: "" },
        supportPhone: { type: String, default: "" }
    },
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        district: { type: String, default: "" },
        coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
        workingArea: { type: [String], default: [] }
    },
    companyType: {
        type: String,
        required: true,
        enum: ['fuel_supplier', 'logistics', 'transportation', 'maintenance', 'trading', 'services', 'construction', 'other']
    },
    businessHours: {
        sunday: { open: String, close: String, isOpen: Boolean },
        monday: { open: String, close: String, isOpen: Boolean },
        tuesday: { open: String, close: String, isOpen: Boolean },
        wednesday: { open: String, close: String, isOpen: Boolean },
        thursday: { open: String, close: String, isOpen: Boolean },
        friday: { open: String, close: String, isOpen: Boolean },
        saturday: { open: String, close: String, isOpen: Boolean }
    },
    services: [{
        name: { type: String, required: true },
        description: { type: String, default: "" },
        price: { type: Number, default: 0 },
        isAvailable: { type: Boolean, default: true },
        estimatedTime: { type: String, default: "" }
    }],
    fleetInfo: {
        totalVehicles: { type: Number, default: 0 },
        vehicleTypes: [{ type: { type: String, required: true }, count: { type: Number, default: 0 } }],
        hasSpecialEquipment: { type: Boolean, default: false }
    },
    documents: {
        commercialLicense: { number: { type: String, required: true }, file: { type: String, default: "" }, expiryDate: { type: Date, required: true } },
        taxCertificate: { number: { type: String, default: "" }, file: { type: String, default: "" } },
        chamberOfCommerce: { number: { type: String, default: "" }, file: { type: String, default: "" } }
    },
    images: {
        logo: { type: String, required: true },
        cover: { type: String, default: "" },
        gallery: [{ type: String, default: "" }]
    },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    ratingCount: { type: Number, default: 0 },
    performance: {
        totalOrders: { type: Number, default: 0 },
        completedOrders: { type: Number, default: 0 },
        cancellationRate: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 }
    },
    verification: { type: String, default: "Pending", enum: ["Pending", "Verified", "Rejected", "Suspended"] },
    verificationMessage: { type: String, default: "شركتك قيد المراجعة. سنخطرك بمجرد التحقق منها." },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    serviceSettings: {
        acceptsOnlineOrders: { type: Boolean, default: true },
        hasDelivery: { type: Boolean, default: true },
        hasPickup: { type: Boolean, default: false },
        minimumOrder: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

CompanySchema.pre("save", async function (next) {
    if (this.isNew && !this.code) {
        const count = await mongoose.model("Company").countDocuments();
        this.code = `COMP${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

CompanySchema.methods.calculateCancellationRate = function() {
    if (this.performance.totalOrders === 0) return 0;
    const cancelledOrders = this.performance.totalOrders - this.performance.completedOrders;
    this.performance.cancellationRate = (cancelledOrders / this.performance.totalOrders) * 100;
};

CompanySchema.index({ name: 1 });
CompanySchema.index({ "contactInfo.email": 1 });
CompanySchema.index({ "contactInfo.phone": 1 });
CompanySchema.index({ companyType: 1 });
CompanySchema.index({ verification: 1 });
CompanySchema.index({ owner: 1 });
CompanySchema.index({ code: 1 });
CompanySchema.index({ "location.coordinates": "2dsphere" });
CompanySchema.index({ rating: -1 });
CompanySchema.index({ featured: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ "location.coordinates": "2dsphere", companyType: 1, isActive: 1 });

module.exports = mongoose.models.Company || mongoose.model('Company', CompanySchema);