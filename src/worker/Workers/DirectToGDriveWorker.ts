import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import GDriveService from "../Services/GDriveService";
import type { FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import WGETService from "../Services/WGETService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import keys from "../../keys";
import { WorkerLogger as logging } from "../Services/LoggingService";

export default class DirectToGDriveWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.DIRECT_TO_GDRIVE_QUEUE;
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
    const wgetService: WGETService = new WGETService(this.job, this.dbPath);
    const fileObject: FileObject = await wgetService.downloadToDisk();
    const gDriveService: GDriveService = await GDriveService.build(
      this.job,
      this.dbPath
    );
    const driveLink: string = await gDriveService.uploadToGDrive(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.fileMimeType,
      fileObject.directory
    );
    const transfersData: TransfersData = {
      directLink: this.job.data.url,
      gDriveLink: driveLink,
      timestamp: ServerValue.TIMESTAMP,
      name: fileObject.fileName,
      size: fileObject.fileSize,
      mimeType: fileObject.directory
        ? "inode/directory"
        : fileObject.fileMimeType,
    };
    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      this.dbPath
    );
    await firebaseService.recordDownloadURL(transfersData);
    await this.sendFCMNotification(fileObject.fileName, driveLink);
  };
}
