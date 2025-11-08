const mongoose = require("mongoose");

const FareRuleSchema = new mongoose.Schema({
  feedId: String,
  fare_id: String,
  route_id: String,
  origin_id: String,
  destination_id: String,
  contains_id: String,
});

const FareRuleModel = mongoose.model("FareRule", FareRuleSchema);   

module.exports = FareRuleModel;