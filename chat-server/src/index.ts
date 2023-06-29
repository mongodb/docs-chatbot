import "dotenv/config";
import { makeApp } from "./app";
import { logger } from "chat-core";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const app = await makeApp();

  const server = app.listen(PORT, () => {
    logger.info(`Server listening on port: ${PORT}`);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT signal received");
    await app.close();
    server.close();
  });
};

try {
  startServer();
} catch (e) {
  logger.error(`Fatal error: ${e}`);
  process.exit(1);
}
