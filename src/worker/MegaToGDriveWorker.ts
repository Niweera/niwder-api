import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import GDriveService from "./GDriveService";
import type { FileObject } from "../utilities/interfaces";
import FCMService from "./FCMService";
import MegaService from "./MegaService";

export default class MegaToGDriveWorker {
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
      .child("mega-to-gdrive")
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
    const megaService: MegaService = new MegaService(this.job);
    const fileObject: FileObject = await megaService.downloadFromMega();
    const gDriveService: GDriveService = new GDriveService(this.job);
    const driveLink: string = await gDriveService.uploadToGDrive(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.fileMimeType,
      fileObject.directory
    );
    await this.recordDownloadURL(
      driveLink,
      fileObject.fileName,
      fileObject.fileSize,
      fileObject.fileMimeType,
      fileObject.directory
    );
    await this.sendFCMNotification(fileObject.fileName, driveLink);
  };
}
