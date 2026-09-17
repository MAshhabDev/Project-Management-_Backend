import app from "./app";
import config from "./config";
import { initPaymentCron } from "./lib/cron";
import { prisma } from "./lib/prisma";
import { redisClient } from "./lib/redis";
import { seedAll } from "./utils/seed";

const PORT = config.port || 5000;

const main = async () => {
  try {
    await prisma.$connect();

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis Connected Successfully!");
    }

    await seedAll();

    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
        console.log(`Server is running on ${PORT}`);
        initPaymentCron();
      });
    }
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

main();

export default app;

