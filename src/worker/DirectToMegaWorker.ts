import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import type { FileObject } from "../utilities/interfaces";
import FCMService from "./FCMService";
import WGETService from "./WGETService";
import MegaService from "./MegaService";

export default class DirectToMegaWorker {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  private recordDownloadURL = async (
    driveLink: string,
    fileName: string,
    fileSize: number,
    fileMimeType: string,
    directory: boolean
  ): Promise<void> => {
    const userRef: database.Reference = db.ref("transfers");
    await userRef
      .child(this.job.data.uid)
      .child("direct-to-mega")
      .push({
        megaLink: this.job.data.url,
        gDriveLink: driveLink,
        timestamp: ServerValue.TIMESTAMP,
        name: fileName,
        size: fileSize,
        mimeType: directory ? "inode/directory" : fileMimeType,
      });
    await this.job.updateProgress(99);
  };

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
    await this.recordDownloadURL(
      megaLink,
      fileObject.fileName,
      fileObject.fileSize,
      fileObject.fileMimeType,
      fileObject.directory
    );
    await this.sendFCMNotification(fileObject.fileName, megaLink);
  };
}
