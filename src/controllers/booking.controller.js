const bookingService = require("../services/booking.service");
const pino = require("pino");
const logger = pino({ transport: { target: "pino-pretty" } });

const bookAppointment = async (req, res) => {
  try {
    const { slot, patientName } = req.body;
    if (!slot || !patientName) {
      return res.status(400).json({ error: "Missing slot or patientName" });
    }

    const appointment = await bookingService.bookAppointment(slot, patientName);
    return res.status(201).json({ message: "Booking confirmed", appointment });
  } catch (error) {
    if (error.message === "Slot already booked") {
      return res.status(409).json({ error: error.message });
    }
    logger.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const holdAppointment = async (req, res) => {
  try {
    const { slot, patientName } = req.body;
    if (!slot || !patientName) {
      return res.status(400).json({ error: "Missing slot or patientName" });
    }

    await bookingService.holdAppointment(slot, patientName);
    return res.status(200).json({ message: "Slot held for 5 minutes" });
  } catch (error) {
    if (
      error.message === "Slot is currently held by another user" ||
      error.message === "Slot already booked"
    ) {
      return res.status(409).json({ error: error.message });
    }
    logger.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  bookAppointment,
  holdAppointment,
};
