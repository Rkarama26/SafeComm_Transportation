const mongoose = require("mongoose");

const FareAttributeSchema = new mongoose.Schema({
  feedId: String,
  fare_id: { type: String, index: true },
  price: Number,
  currency_type: String,
  payment_method: Number,
  transfers: Number,
  agency_id: String,
});

const FareAttributeModel = mongoose.model("FareAttribute", FareAttributeSchema);    

module.exports = FareAttributeModel;