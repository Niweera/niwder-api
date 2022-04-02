import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import { mkdtempSync, readdirSync, rmSync, statSync } from "fs";
import * as path from "path";
import * as os from "os";
import GDriveService from "./GDriveService";
import type { FileObject } from "../utilities/interfaces";
import mime from "mime-types";
import { spawn } from "child_process";
import FCMService from "./FCMService";

export default class DirectToGDriveWorker {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  private downloadToDisk = async (): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      const url: string = this.job.data.url;
      console.log(`now downloading ${url}\n\n`);

      const tempDir: string = mkdtempSync(path.join(os.tmpdir(), "niwder-tmp"));
      const wget = spawn("wget", [
        `-P`,
        tempDir,
        url,
        "-q",
        "--show-progress",
        "--progress",
        "bar:force:noscroll",
      ]);

      wget.stdout.on("data", (data) => {
        console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
      });

      wget.stderr.on("data", (data) => {
        console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
      });

      wget.on("error", (err) => {
        reject(err);
      });

      wget.on("close", async (code) => {
        let files = readdirSync(tempDir);
        if (files.length > 0 && code === 0) {
          const filePath: string = path.join(tempDir, files[0]);
          await this.job.updateProgress(49);
          resolve({
            fileName: files[0],
            filePath: filePath,
            fileMimeType: statSync(filePath).isDirectory()
              ? "inode/directory"
              : mime.lookup(filePath) || "application/octet-stream",
            fileSize: statSync(filePath).size,
            directory: statSync(filePath).isDirectory(),
          });
        } else {
          reject(new Error(`Downloaded file is missing`));
        }
      });
    });
  };

  private uploadToGDrive = async (
    fileName: string,
    filePath: string,
    fileMimeType: string,
    directory: boolean
  ): Promise<string> => {
    console.log(`now uploading ${filePath} to GDrive`);
    const gDriveService: GDriveService = new GDriveService(this.job);
    const shareLink = await gDriveService.uploadFile(
      fileName,
      filePath,
      fileMimeType,
      directory
    );
    await this.job.updateProgress(98);
    rmSync(path.dirname(filePath), { recursive: true });
    return shareLink;
  };

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
      .child("direct-to-gdrive")
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
    const fileObject: FileObject = await this.downloadToDisk();
    const driveLink: string = await this.uploadToGDrive(
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
