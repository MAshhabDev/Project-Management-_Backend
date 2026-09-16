import app from "./app";
import config from "./config";
import { initPaymentCron } from "./lib/cron";
import { prisma } from "./lib/prisma";
import { redisClient } from "./lib/redis";
import { seedAll } from "./utils/seed";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();

    // Connect to Redis
    await redisClient.connect();
    console.log("Redis Connected Successfully!");

    await seedAll();

    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);

      initPaymentCron();
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
};

main();
