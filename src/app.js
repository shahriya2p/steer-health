const express = require("express");

const app = express();

// Health Check
app.get("/health", (req, res) => res.send("API is running"));

module.exports = app;
