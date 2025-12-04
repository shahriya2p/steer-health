const express = require("express");
const { bookingRoutes } = require("./routes");

const app = express();

app.use(express.json());

app.use("/api", bookingRoutes);

// Health Check
app.get("/health", (req, res) => res.send("API is running"));

module.exports = app;
