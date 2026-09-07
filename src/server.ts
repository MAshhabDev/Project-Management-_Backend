import { app } from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
    });
  } catch (error) {
    console.error("Error to start the server");
    process.exit(1);
  }
};

main();