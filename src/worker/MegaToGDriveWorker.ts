import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import { existsSync, mkdtempSync, rmSync } from "fs";
import * as path from "path";
import * as os from "os";
import { File as MEGAFile } from "megajs";
import GDriveService from "./GDriveService";
import type { FileObject } from "../utilities/interfaces";
import mime from "mime-types";
import { spawn } from "child_process";
import FCMService from "./FCMService";

export default class MegaToGDriveWorker {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  private downloadToDisk = async (): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      try {
        const megaURL: string = this.job.data.url;
        console.log(`now downloading ${megaURL}`);
        const tempDir: string = mkdtempSync(
          path.join(os.tmpdir(), "niwder-tmp")
        );
        const file: MEGAFile = MEGAFile.fromURL(megaURL);
        await file.loadAttributes();

        const filePath: string = path.join(tempDir, file.name);

        const megaCMD = spawn("mega-get", [`"${megaURL}"`, tempDir]);

        megaCMD.stdout.on("data", (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
        });

        megaCMD.stderr.on("data", (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
        });

        megaCMD.on("error", (err) => {
          reject(err);
        });

        megaCMD.on("close", async (code) => {
          if (existsSync(filePath) && code === 0) {
            await this.job.updateProgress(49);
            resolve({
              fileName: file.name,
              filePath,
              fileMimeType: mime.lookup(filePath) || "application/octet-stream",
              fileSize: file.size,
            });
          } else {
            reject(new Error(`${filePath} is missing`));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  private uploadToGDrive = async (
    fileName: string,
    filePath: string,
    fileMimeType: string
  ): Promise<string> => {
    console.log(`now uploading ${filePath} to GDrive`);
    const gDriveService: GDriveService = new GDriveService(this.job);
    const shareLink = await gDriveService.uploadFile(
      fileName,
      filePath,
      fileMimeType
    );
    await this.job.updateProgress(98);
    rmSync(path.dirname(filePath), { recursive: true });
    return shareLink;
  };

  private recordDownloadURL = async (
    driveLink: string,
    fileName: string,
    fileSize: number,
    fileMimeType: string
  ): Promise<void> => {
    const userRef: database.Reference = db.ref("transfers");
    await userRef.child(this.job.data.uid).child("mega-to-gdrive").push({
      megaLink: this.job.data.url,
      gDriveLink: driveLink,
      timestamp: ServerValue.TIMESTAMP,
      name: fileName,
      size: fileSize,
      mimeType: fileMimeType,
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
    const fileObject: FileObject = await this.downloadToDisk();
    const driveLink: string = await this.uploadToGDrive(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.fileMimeType
    );
    await this.recordDownloadURL(
      driveLink,
      fileObject.fileName,
      fileObject.fileSize,
      fileObject.fileMimeType
    );
    await this.sendFCMNotification(fileObject.fileName, driveLink);
  };
}
