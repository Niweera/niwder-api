import { Router, Request, Response } from "express";
import asyncWrapper from "../utilities/async-wrapper";
import FileService from "../services/FileService";
import type { ServeFileObject } from "../utilities/interfaces";

const fileController: Router = Router();
const fileService: FileService = new FileService();

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

export default fileController;
