// models/PumpIntegration.js
const mongoose = require("mongoose");

const PumpIntegrationSchema = new mongoose.Schema({
  pumpId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pump",
    required: true,
    index: true
  },

  integrationType: {
    type: String,
    enum: [
      "MANUAL",
      "IOT",
      "CONTROLLER",
      "POS",
      "EXTERNAL_API"
    ],
    required: true
  },

  config: {
    type: Object,
    default: {}
    /*
      Examples:
      MANUAL: {}
      IOT: { deviceId, mqttTopic }
      CONTROLLER: { ip, port, protocol }
      POS: { terminalId }
      API: { endpoint, token }
    */
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, { timestamps: true });

module.exports = mongoose.model("PumpIntegration", PumpIntegrationSchema);
