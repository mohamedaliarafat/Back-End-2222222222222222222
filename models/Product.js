const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // 🔢 معلومات أساسية
  productNumber: { type: String, unique: true },
  
  // 🏷️ نوع المنتج
  productType: {
    type: String,
    required: true,
    enum: ['بنزين', 'ديزل', 'كيروسين', 'أخرى'],
    default: 'بنزين'
  },
  
  // ⛽ سعة اللترات
  liters: {
    type: Number,
    required: true,
    enum: [20000, 32000],
    default: 20000
  },
  
  // 💰 السعر (هيجي من الإدمن)
  price: {
    current: { type: Number, required: true, default: 0 },
    previous: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' }
  },
  
  // 🖼️ صورة المنتج
  images: {
    main: { type: String, required: true },
    gallery: [{ type: String, default: '' }]
  },
  
  // 📝 وصف المنتج
  description: { type: String, default: '' },
  
  // 📊 حالة المنتج
  status: {
    type: String,
    enum: ['متاح', 'غير متاح', 'نفذ من المخزون'],
    default: 'متاح'
  },
  
  // 📦 المخزون
  stock: {
    quantity: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 10 },
    isInStock: { type: Boolean, default: true }
  },
  
  // 👨‍💼 الإدمن المسؤول
  addedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // 🏢 تبع شركة معينة (لو applicable)
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    default: null 
  },
  
  // 📊 إحصائيات
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  },
  
  // 🔖 tags للبحث
  tags: [{ type: String, default: '' }],
  
  // 📍 موقع التخزين (لو applicable)
  storageLocation: {
    address: { type: String, default: '' },
    coordinates: { 
      lat: { type: Number, default: 0 }, 
      lng: { type: Number, default: 0 } 
    }
  }

}, { timestamps: true });

// Auto-generate product number
ProductSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Product").countDocuments();
    this.productNumber = `PROD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Update stock status
ProductSchema.pre("save", function (next) {
  this.stock.isInStock = this.stock.quantity > 0;
  if (this.stock.quantity === 0) {
    this.status = 'نفذ من المخزون';
  }
  next();
});

// Indexes for performance
ProductSchema.index({ productNumber: 1 });
ProductSchema.index({ productType: 1 });
ProductSchema.index({ liters: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ "price.current": 1 });
ProductSchema.index({ addedBy: 1 });
ProductSchema.index({ company: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ "storageLocation.coordinates": "2dsphere" });

// Text search index
ProductSchema.index({
  productType: 'text',
  description: 'text',
  tags: 'text'
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);