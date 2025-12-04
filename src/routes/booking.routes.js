const { bookingController } = require("../controllers");

const router = require("express").Router();

router.post("/book-appointment", bookingController.bookAppointment);
router.post("/hold-appointment", bookingController.holdAppointment);

module.exports = router;
