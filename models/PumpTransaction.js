// models/PumpTransaction.js
const mongoose = require("mongoose");

const PumpTransactionSchema = new mongoose.Schema({
  pumpId: { type: mongoose.Schema.Types.ObjectId, ref: "Pump", required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  fuelType: String,
  liters: Number,
  pricePerLiter: Number,
  totalAmount: Number,

  startTime: Date,
  endTime: Date,
  transactionDate: Date,

  source: {
    type: String,
    enum: ["MANUAL", "IOT", "CONTROLLER", "POS", "EXTERNAL_API"]
  }
}, { timestamps: true });

module.exports = mongoose.model("PumpTransaction", PumpTransactionSchema);
