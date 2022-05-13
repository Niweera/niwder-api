import http, { Server } from "http";
import type { Application } from "express";
import express from "express";
import Middleware from "../middleware";
import {
  mainController,
  oAuthController,
  fileController,
} from "../controllers";
import ErrorHandlingMiddleware from "../middleware/error-handling";
import FirebaseAuthMiddleware from "../middleware/firebaser";
import ServeOpenAPI from "../openapi";
import ServeBullBoard from "../bull-ui";
import { SetupSocketIO } from "../socketio";
import type { Server as IOServer } from "socket.io";
import { WinstonErrorLogger, WinstonLogger } from "../middleware/logging";

export const app: Application = express();
app.disable("x-powered-by");

const server: Server = http.createServer(app);

Middleware(app);
WinstonLogger(app);
ServeOpenAPI(app);
ServeBullBoard(app);
app.use("/api/oauth/callback", oAuthController);
app.use("/api/file", fileController);
FirebaseAuthMiddleware(app);
app.use("", mainController);
WinstonErrorLogger(app);
ErrorHandlingMiddleware(app);

export const io: IOServer = SetupSocketIO(server);
export default server;
