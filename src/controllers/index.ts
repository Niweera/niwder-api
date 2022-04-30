import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import Service from "../services";
import { routeAuth } from "../middleware/firebaser";
import validator from "../middleware/validator";
import OAuthService from "../services/OAuthService";
import keys from "../keys";
import fileController from "./fileController";
import oAuthController from "./oAuthController";
import upload from "../middleware/multer-middleware";

const router: Router = Router();
const service: Service = new Service();
const oAuthService: OAuthService = new OAuthService();

/** @route   GET /api/oauth
 *  @desc    Redirect user for OAuth2
 *  @access  Private
 */
router.get(
  "/api/oauth",
  [routeAuth()],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    const url: string = await oAuthService.getRedirectURL(
      req.authenticatedUser.user_id
    );
    res.send({ url });
  })
);

/** @route   DELETE /api/oauth
 *  @desc    Revoke authorization
 *  @access  Private
 */
router.delete(
  "/api/oauth",
  [routeAuth()],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    const url: string = await oAuthService.revokeAuthorization(
      req.authenticatedUser.user_id
    );
    res.send({ url });
  })
);

/** @route   POST /api/mega-to-gdrive
 *  @desc    Convert Mega URL to Google Drive
 *  @access  Private
 */
router.post(
  `/api/${keys.MEGA_TO_GDRIVE_QUEUE}`,
  [routeAuth(), validator("Main", "mega")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.MEGA_TO_GDRIVE_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/gdrive-to-mega
 *  @desc    Convert Google Drive URL to Mega.nz
 *  @access  Private
 */
router.post(
  `/api/${keys.GDRIVE_TO_MEGA_QUEUE}`,
  [routeAuth(), validator("Main", "gdrive")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.GDRIVE_TO_MEGA_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/direct-to-gdrive
 *  @desc    Convert Direct links to Google Drive URL
 *  @access  Private
 */
router.post(
  `/api/${keys.DIRECT_TO_GDRIVE_QUEUE}`,
  [routeAuth(), validator("Main", "url")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.DIRECT_TO_GDRIVE_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/direct-to-mega
 *  @desc    Convert Direct links to Mega.nz URL
 *  @access  Private
 */
router.post(
  `/api/${keys.DIRECT_TO_MEGA_QUEUE}`,
  [routeAuth(), validator("Main", "url")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.DIRECT_TO_MEGA_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/gdrive-to-direct
 *  @desc    Convert Google Drive links to Direct links
 *  @access  Private
 */
router.post(
  `/api/${keys.GDRIVE_TO_DIRECT_QUEUE}`,
  [routeAuth(), validator("Main", "gdrive")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.GDRIVE_TO_DIRECT_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/mega-to-direct
 *  @desc    Convert Mega.nz links to Direct links
 *  @access  Private
 */
router.post(
  `/api/${keys.MEGA_TO_DIRECT_QUEUE}`,
  [routeAuth(), validator("Main", "mega")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.serve(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.MEGA_TO_DIRECT_QUEUE
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/torrents-to-gdrive
 *  @desc    Convert torrents to Google Drive links
 *  @access  Private
 */
router.post(
  `/api/${keys.TORRENTS_TO_GDRIVE_QUEUE}`,
  [routeAuth(), validator("Main", "magnet"), upload.single("torrent")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.queueTorrents(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.TORRENTS_TO_GDRIVE_QUEUE,
      req.file
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/torrents-to-mega
 *  @desc    Convert torrents to Mega.nz links
 *  @access  Private
 */
router.post(
  `/api/${keys.TORRENTS_TO_MEGA_QUEUE}`,
  [routeAuth(), validator("Main", "magnet"), upload.single("torrent")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.queueTorrents(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.TORRENTS_TO_MEGA_QUEUE,
      req.file
    );
    res.sendStatus(204);
  })
);

/** @route   POST /api/torrents-to-direct
 *  @desc    Convert torrents to direct links
 *  @access  Private
 */
router.post(
  `/api/${keys.TORRENTS_TO_DIRECT_QUEUE}`,
  [routeAuth(), validator("Main", "magnet"), upload.single("torrent")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.queueTorrents(
      req.body.url,
      req.authenticatedUser.user_id,
      keys.TORRENTS_TO_DIRECT_QUEUE,
      req.file
    );
    res.sendStatus(204);
  })
);

export { router as mainController, fileController, oAuthController };
