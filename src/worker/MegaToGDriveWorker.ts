import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import GDriveService from "./GDriveService";
import type { FileObject } from "../utilities/interfaces";
import FCMService from "./FCMService";
import MegaService from "./MegaService";
import FirebaseService from "./FirebaseService";
import type { TransfersData } from "../utilities/interfaces";
import keys from "../keys";

export default class MegaToGDriveWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.MEGA_TO_GDRIVE_QUEUE;
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
    console.log(`now starting transferring ${this.job.data.url}`);
    await this.job.updateProgress(0);
    const megaService: MegaService = new MegaService(this.job, this.dbPath);
    const fileObject: FileObject = await megaService.downloadFromMega();
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
      megaLink: this.job.data.url,
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
