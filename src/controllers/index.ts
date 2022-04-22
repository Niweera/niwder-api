import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import Service from "../services";
import { routeAuth } from "../middleware/firebaser";
import validator from "../middleware/validator";
import OAuthService from "../services/OAuthService";
import FileService from "../services/FileService";
import type {
  ExtendedParsedQs,
  ServeFileObject,
} from "../utilities/interfaces";

const router: Router = Router();
export const oAuthController: Router = Router();
export const fileController: Router = Router();
const service: Service = new Service();
const oAuthService: OAuthService = new OAuthService();
const fileService: FileService = new FileService();

/** @route   GET /api
 *  @desc    Check API status
 *  @access  Private
 */
router.get(
  "/api",
  routeAuth(),
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    res.sendStatus(204);
  })
);

/** @route   POST /api/mega-to-gdrive
 *  @desc    Convert Mega URL to Google Drive
 *  @access  Private
 */
router.post(
  "/api/mega-to-gdrive",
  [routeAuth(), validator("Main", "mega")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.megaToGDrive(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

/** @route   POST /api/gdrive-to-mega
 *  @desc    Convert Google Drive URL to Mega.nz
 *  @access  Private
 */
router.post(
  "/api/gdrive-to-mega",
  [routeAuth(), validator("Main", "gdrive")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.gDriveToMega(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

/** @route   POST /api/direct-to-gdrive
 *  @desc    Convert Direct links to Google Drive URL
 *  @access  Private
 */
router.post(
  "/api/direct-to-gdrive",
  [routeAuth(), validator("Main", "url")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.directToGDrive(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

/** @route   POST /api/direct-to-mega
 *  @desc    Convert Direct links to Mega.nz URL
 *  @access  Private
 */
router.post(
  "/api/direct-to-mega",
  [routeAuth(), validator("Main", "url")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.directToMega(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

/** @route   POST /api/gdrive-to-direct
 *  @desc    Convert Google Drive links to Direct links
 *  @access  Private
 */
router.post(
  "/api/gdrive-to-direct",
  [routeAuth(), validator("Main", "gdrive")],
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.gDriveToDirect(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

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

/** @route   GET /api/file/:fileID
 *  @desc    Download files by ID
 *  @access  Public
 */
fileController.get(
  "/:fileID",
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    const fileObject: ServeFileObject | null = await fileService.serve(
      req.params.fileID
    );
    if (fileObject) {
      res.download(fileObject.path, fileObject.name, (err) => {
        if (err) {
          if (!res.headersSent) {
            res.sendStatus(500);
          }
          console.log(err);
        }
      });
    } else {
      res.status(404).send({
        message: "The requested file is not found (link expired maybe?)",
      });
    }
  })
);

export default router;
