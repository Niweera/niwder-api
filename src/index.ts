import Keys from "./keys";
import chalk from "chalk";
import server, { io } from "./server";
import FirebaseService from "./services/FirebaseService";
import logging from "./middleware/logging";

const { PORT } = Keys;
let interval: ReturnType<typeof setInterval>;

server.listen(PORT, () => {
  interval = FirebaseService.setServerAlive();
  logging.info(chalk.blue(`Niwder-API is listening on port ${PORT}`));
});

server.on("error", async (err) => {
  logging.error(chalk.red(err.message));
  await FirebaseService.setServerDead(interval);
  process.exit(1);
});

server.on("close", () => {
  logging.info(chalk.yellow("Niwder-API is shutting down"));
});

const shutDownAPI = () => {
  io.close((error: Error) => {
    if (error) logging.error(`Error occurred in Socket.io ${error}`);
  });
  server.close(async (error: Error) => {
    await FirebaseService.setServerDead(interval);
    if (error) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
};

process.on("uncaughtException", (err: Error) => {
  logging.error("Uncaught exception:", err.message);
});
process.on("SIGINT", shutDownAPI);
process.on("SIGTERM", shutDownAPI);
