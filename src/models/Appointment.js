const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  slot: {
    type: Date,
    required: true,
    unique: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["booked", "held"],
    default: "booked",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

appointmentSchema.index({ slot: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
