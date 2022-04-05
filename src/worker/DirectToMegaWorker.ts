import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import type { FileObject } from "../utilities/interfaces";
import FCMService from "./FCMService";
import WGETService from "./WGETService";
import MegaService from "./MegaService";
import type { TransfersData } from "../utilities/interfaces";
import FirebaseService from "./FirebaseService";

export default class DirectToMegaWorker {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
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
    const wgetService: WGETService = new WGETService(this.job);
    const fileObject: FileObject = await wgetService.downloadToDisk();
    const megaService: MegaService = new MegaService(this.job);
    const megaLink: string = await megaService.uploadToMega(
      fileObject.fileName,
      fileObject.filePath
    );
    const transfersData: TransfersData = {
      directLink: this.job.data.url,
      megaLink: megaLink,
      timestamp: ServerValue.TIMESTAMP,
      name: fileObject.fileName,
      size: fileObject.fileSize,
      mimeType: fileObject.directory
        ? "inode/directory"
        : fileObject.fileMimeType,
    };
    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      "direct-to-mega"
    );
    await firebaseService.recordDownloadURL(transfersData);
    await this.sendFCMNotification(fileObject.fileName, megaLink);
  };
}
