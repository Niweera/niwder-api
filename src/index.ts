import Keys from "./keys";
import chalk from "chalk";
import server from "./server";

const { PORT } = Keys;

server.listen(PORT, () => {
  console.log(chalk.blue(`Sever listening on port ${PORT}`));
});

server.on("error", (err) => {
  console.log(chalk.red(err.message));
  process.exit(1);
});

server.on("close", () => {
  console.log(chalk.yellow("Niwder-API is shutting down"));
});

process.on("SIGINT", () => {
  server.close((error) => {
    if (error) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
});
