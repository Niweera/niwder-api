import keys from "../keys";
import authMiddleWare from "firebase-auth-express-middleware";
import type { Application, RequestHandler } from "express";
import { firebaseAuth } from "../database";

export const routeAuth = (): RequestHandler =>
  authMiddleWare.authz((token) => token.user_id === keys.USER_ID);

export default (app: Application): void => {
  app.use(authMiddleWare.authn(firebaseAuth));
};
