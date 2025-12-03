require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const pino = require("pino");
const logger = pino({ transport: { target: "pino-pretty" } });

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();
