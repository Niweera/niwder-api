import http, { Server } from "http";
import type { Application } from "express";
import express from "express";
import Middleware from "../middleware";
import Controller, { oAuthController, fileController } from "../controllers";
import ErrorHandlingMiddleware from "../middleware/error-handling";
import FirebaseAuthMiddleware from "../middleware/firebaser";

export const app: Application = express();
app.disable("x-powered-by");

const server: Server = http.createServer(app);

Middleware(app);
app.use("/api/oauth/callback", oAuthController);
app.use("/api/file", fileController);
FirebaseAuthMiddleware(app);
app.use("", Controller);
ErrorHandlingMiddleware(app);

export default server;
