// integrations/ManualAdapter.js
const BaseAdapter = require("./BaseAdapter");

class ManualAdapter extends BaseAdapter {
  async normalize(data) {
    return {
      ...data,
      source: "MANUAL",
      transactionDate: new Date()
    };
  }
}

module.exports = ManualAdapter;
