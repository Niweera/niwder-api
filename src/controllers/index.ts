import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import Service from "../services";
import { routeAuth } from "../middleware/firebaser";

const router: Router = Router();
const service: Service = new Service();

/** @route   POST /mega-to-gdrive
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

export default router;
