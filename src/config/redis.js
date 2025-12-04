const Redis = require("ioredis");
const pino = require("pino");
const logger = pino({ transport: { target: "pino-pretty" } });

const redis = new Redis(process.env.REDIS_URI || "redis://localhost:6379");

redis.on("connect", () => {
  logger.info("Redis Connected");
});

redis.on("error", (err) => {
  logger.error("Redis Error:", err);
});

module.exports = redis;
