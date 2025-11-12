const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratingType: { 
        type: String, 
        required: true, 
        enum: ['driver', 'service', 'order', 'fuel_delivery', 'customer_service', 'app_experience']
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, required: true, enum: ['Order', 'Petrol', 'User'] },
    rating: { type: Number, min: 1, max: 5, required: true },
    subRatings: {
        punctuality: { type: Number, min: 1, max: 5, default: 5 },
        professionalism: { type: Number, min: 1, max: 5, default: 5 },
        communication: { type: Number, min: 1, max: 5, default: 5 },
        serviceQuality: { type: Number, min: 1, max: 5, default: 5 },
        valueForMoney: { type: Number, min: 1, max: 5, default: 5 }
    },
    comment: { type: String, maxlength: 500, default: "" },
    tags: [{
        type: String,
        enum: [
            'fast_delivery', 'friendly_driver', 'clean_vehicle', 'good_communication',
            'professional', 'late_delivery', 'poor_communication', 'vehicle_issue',
            'excellent_service', 'good_value'
        ]
    }],
    images: [{ url: { type: String, required: true }, caption: { type: String, default: "" } }],
    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    reportedCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    adminNotes: { type: String, default: "" }
}, { timestamps: true });

RatingSchema.virtual('averageSubRating').get(function() {
    const subRatings = Object.values(this.subRatings).filter(val => val > 0);
    if (subRatings.length === 0) return this.rating;
    const sum = subRatings.reduce((total, rating) => total + rating, 0);
    return (sum / subRatings.length).toFixed(1);
});

RatingSchema.pre("save", function(next) {
    if (this.targetModel === 'Order' || this.targetModel === 'Petrol') {
        this.isVerified = true;
    }
    next();
});

RatingSchema.index({ userId: 1 });
RatingSchema.index({ targetId: 1 });
RatingSchema.index({ ratingType: 1 });
RatingSchema.index({ rating: 1 });
RatingSchema.index({ createdAt: -1 });
RatingSchema.index({ targetId: 1, targetModel: 1 });
RatingSchema.index({ isVerified: 1 });
RatingSchema.index({ isPublic: 1 });
RatingSchema.index({ "tags": 1 });
RatingSchema.index({ targetId: 1, targetModel: 1, ratingType: 1 });

module.exports = mongoose.models.Rating || mongoose.model('Rating', RatingSchema);