import Keys from "./keys";
import chalk from "chalk";
import server from "./server";

const { PORT } = Keys;

server.listen(PORT, () => {
  console.log(chalk.blue(`Sever listening on port ${PORT}`));
});
