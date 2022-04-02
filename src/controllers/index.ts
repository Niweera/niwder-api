import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import Service from "../services";
import { routeAuth } from "../middleware/firebaser";

const router: Router = Router();
const service: Service = new Service();

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
  routeAuth(),
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
  routeAuth(),
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
  routeAuth(),
  asyncWrapper(async (req: Request, res: Response): Promise<any> => {
    await service.directToGDrive(req.body.url, req.authenticatedUser.user_id);
    res.sendStatus(204);
  })
);

export default router;
