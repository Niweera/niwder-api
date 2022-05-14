import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import type { DirectLinkData, FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import FileService from "../Services/FileService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import MegaService from "../Services/MegaService";
import keys from "../../keys";
import logging from "../Services/LoggingService";

export default class MegaToDirectWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.MEGA_TO_DIRECT_QUEUE;
  }

  private sendFCMNotification = async (
    fileName: string,
    link: string
  ): Promise<void> => {
    const fcmService: FCMService = new FCMService(this.job.data.uid);
    await fcmService.sendFCM(fileName, link);
    await this.job.updateProgress(100);
  };

  public run = async (): Promise<void> => {
    logging.info(`now starting transferring ${this.job.data.url}`);
    await this.job.updateProgress(0);
    const megaService: MegaService = new MegaService(this.job, this.dbPath);
    const fileObject: FileObject = await megaService.downloadFromMega();
    const fileService: FileService = new FileService(this.job, this.dbPath);
    const directLinkData: DirectLinkData = await fileService.createDirectLink(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.directory,
      fileObject.fileMimeType,
      fileObject.fileSize
    );
    const transfersData: TransfersData = {
      megaLink: this.job.data.url,
      directLink: directLinkData.directLink,
      timestamp: ServerValue.TIMESTAMP,
      name: fileObject.directory ? directLinkData.name : fileObject.fileName,
      size: fileObject.directory ? directLinkData.size : fileObject.fileSize,
      mimeType: fileObject.directory
        ? "application/zip"
        : fileObject.fileMimeType,
    };
    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      this.dbPath
    );
    await firebaseService.recordDownloadURL(transfersData);
    await this.sendFCMNotification(
      fileObject.fileName,
      directLinkData.directLink
    );
  };
}
