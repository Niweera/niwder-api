import authMiddleWare from "firebase-auth-express-middleware";
import type { Application, RequestHandler } from "express";
import { firebaseAuth } from "../database";
import FirebaseService from "../services/FirebaseService";

export const routeAuth = (): RequestHandler =>
  authMiddleWare.authz(
    async (token) => await FirebaseService.checkUserExists(token.user_id)
  );

export default (app: Application): void => {
  app.use(authMiddleWare.authn(firebaseAuth));
};
