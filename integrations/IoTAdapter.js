// integrations/IoTAdapter.js
const BaseAdapter = require("./BaseAdapter");

class IoTAdapter extends BaseAdapter {
  async normalize(data) {
    return {
      pumpId: data.pumpId,
      ownerId: data.ownerId,
      fuelType: data.fuelType,
      liters: data.liters,
      pricePerLiter: data.price,
      totalAmount: data.liters * data.price,
      startTime: data.start,
      endTime: data.end,
      source: "IOT",
      transactionDate: new Date()
    };
  }
}

module.exports = IoTAdapter;
