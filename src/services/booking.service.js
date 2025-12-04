const Appointment = require("../models/Appointment");
const redis = require("../config/redis");
const pino = require("pino");
const logger = pino({ transport: { target: "pino-pretty" } });

const SOFT_HOLD = parseInt(process.env.SOFT_HOLD_SECONDS || 300);

class BookingService {
  /**
   * Attempt to book an appointment.
   * Used MongoDB Unique Index as the primary locking mechanism.
   */
  async bookAppointment(slot, patientName) {
    const slotTime = new Date(slot).toISOString();
    try {
      const appointment = new Appointment({
        slot: slotTime,
        patientName,
        status: "booked",
      });

      await appointment.save();

      // If booked successfully, remove any hold (cleanup)
      await redis.del(`hold:${slotTime}`);

      logger.info(`Booking successful for ${patientName} at ${slotTime}`);
      return appointment;
    } catch (error) {
      if (error.code === 11000) {
        logger.warn(`Double booking prevented for ${slotTime}`);
        throw new Error("Slot already booked");
      }
      throw error;
    }
  }

  /**
   * Attempt to hold a slot for 5 minutes.
   * Used Redis SET NX.
   */
  async holdAppointment(slot, patientName) {
    const slotTime = new Date(slot).toISOString();
    const key = `hold:${slotTime}`;
    const ttlSeconds = SOFT_HOLD;

    // First, check if slot is already booked
    const existing = await Appointment.findOne({ slot: slotTime });
    if (existing) {
      throw new Error("Slot already booked");
    }

    // SET key value NX EX ttl, Returns 'OK' if set, null if not set (means already exists)
    const result = await redis.set(key, patientName, "NX", "EX", ttlSeconds);
    if (!result) {
      throw new Error("Slot is currently held by another user");
    }

    logger.info(`Slot held for ${patientName} at ${slotTime}`);
    return true;
  }
}

module.exports = new BookingService();
