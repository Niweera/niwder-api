import Keys from "./keys";
import chalk from "chalk";
import server, { io } from "./server";
import FirebaseService from "./services/FirebaseService";

const { PORT } = Keys;
let interval: ReturnType<typeof setInterval>;

server.listen(PORT, () => {
  interval = FirebaseService.setServerAlive();
  console.log(chalk.blue(`Niwder-API is listening on port ${PORT}`));
});

server.on("error", async (err) => {
  console.log(chalk.red(err.message));
  await FirebaseService.setServerDead(interval);
  process.exit(1);
});

server.on("close", () => {
  console.log(chalk.yellow("Niwder-API is shutting down"));
});

const shutDownAPI = () => {
  io.close((error: Error) => {
    if (error) console.log(`Error occurred in Socket.io ${error}`);
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
  console.error("Uncaught exception:", err.message);
});
process.on("SIGINT", shutDownAPI);
process.on("SIGTERM", shutDownAPI);
