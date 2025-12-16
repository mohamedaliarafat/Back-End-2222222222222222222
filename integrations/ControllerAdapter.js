// integrations/ControllerAdapter.js
const BaseAdapter = require("./BaseAdapter");

class ControllerAdapter extends BaseAdapter {
  async normalize(data) {
    return {
      ...data,
      source: "CONTROLLER",
      transactionDate: new Date()
    };
  }
}

module.exports = ControllerAdapter;
