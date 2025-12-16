// models/Pump.js
const mongoose = require("mongoose");

const PumpSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  name: { type: String, required: true },

  pumpType: {
    type: String,
    enum: ["station", "transfer", "mobile", "aviation", "industrial"],
    required: true
  },

  fuelType: {
    type: String,
    enum: ["91", "95", "DIESEL", "KEROSENE", "JET"],
    required: true
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  location: {
    city: String,
    lat: Number,
    lng: Number
  }
}, { timestamps: true });

module.exports = mongoose.model("Pump", PumpSchema);
