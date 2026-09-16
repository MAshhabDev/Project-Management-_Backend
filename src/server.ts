import app from "./app";
import config from "./config";
import { initPaymentCron } from "./lib/cron";
import { prisma } from "./lib/prisma";
import { seedAll } from "./utils/seed";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();

    await seedAll();

    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);

      initPaymentCron();
    });
  } catch (error) {
    console.error("Error to start the server");
    process.exit(1);
  }
};

main();
