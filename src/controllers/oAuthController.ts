import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import OAuthService from "../services/OAuthService";
import type { ExtendedParsedQs } from "../utilities/interfaces";

const oAuthController: Router = Router();
const oAuthService: OAuthService = new OAuthService();

/** @route   GET /api/oauth/callback
 *  @desc    OAuth2 Callback
 *  @access  Public
 */
oAuthController.get(
  "/",
  asyncWrapper(
    async (
      req: Request<unknown, unknown, unknown, ExtendedParsedQs>,
      res: Response
    ): Promise<any> => {
      const url: string = await oAuthService.handleCallback(
        req.query.code,
        req.query.state,
        req.query.error
      );
      res.redirect(302, url);
    }
  )
);

export default oAuthController;
