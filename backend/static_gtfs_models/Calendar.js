const mongoose = require("mongoose");

const CalendarSchema = new mongoose.Schema({
  feedId: String,
  service_id: { type: String, index: true },
  monday: Number,
  tuesday: Number,
  wednesday: Number,
  thursday: Number,
  friday: Number,
  saturday: Number,
  sunday: Number,
  start_date: Date,
  end_date: Date,
});

const CalendarModel = mongoose.model("Calendar", CalendarSchema);   
module.exports = CalendarModel;