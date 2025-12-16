// integrations/AdapterFactory.js
const Manual = require("./ManualAdapter");
const IoT = require("./IoTAdapter");
const Controller = require("./ControllerAdapter");
const Pos = require("./PosAdapter");
const Api = require("./ApiAdapter");

module.exports = (type) => {
  switch (type) {
    case "MANUAL": return new Manual();
    case "IOT": return new IoT();
    case "CONTROLLER": return new Controller();
    case "POS": return new Pos();
    case "EXTERNAL_API": return new Api();
    default: throw new Error("Unknown integration type");
  }
};
