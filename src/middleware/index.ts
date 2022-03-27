import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import type { Application } from "express";

const CommonMiddleware = (app: Application): void => {
  app.use(bodyParser.json());
  app.use(morgan("dev"));
  app.use(cors());
  app.use(helmet());
};

const Middleware = (app: Application): void => {
  CommonMiddleware(app);
};

export default Middleware;
