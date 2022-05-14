import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import GDriveService from "../Services/GDriveService";
import type { DirectLinkData, FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import FileService from "../Services/FileService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import keys from "../../keys";
import { WorkerLogger as logging } from "../Services/LoggingService";

export default class GDriveToDirectWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.GDRIVE_TO_DIRECT_QUEUE;
  }

  private sendFCMNotification = async (
    fileName: string,
    link: string
  ): Promise<void> => {
    const fcmService: FCMService = new FCMService(this.job.data.uid, logging);
    await fcmService.sendFCM(fileName, link);
    await this.job.updateProgress(100);
  };

  public run = async (): Promise<void> => {
    console.log(`now starting transferring ${this.job.data.url}`);
    await this.job.updateProgress(0);
    const gDriveService: GDriveService = await GDriveService.build(
      this.job,
      this.dbPath
    );
    const fileObject: FileObject = await gDriveService.downloadFromGDrive();
    const fileService: FileService = new FileService(this.job, this.dbPath);
    const directLinkData: DirectLinkData = await fileService.createDirectLink(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.directory,
      fileObject.fileMimeType,
      fileObject.fileSize
    );
    const transfersData: TransfersData = {
      gDriveLink: this.job.data.url,
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
