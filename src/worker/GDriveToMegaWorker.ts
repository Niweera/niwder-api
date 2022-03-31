import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import { existsSync, mkdtempSync, rmSync } from "fs";
import * as path from "path";
import * as os from "os";
import GDriveService from "./GDriveService";
import type { FileObject } from "../utilities/interfaces";
import { spawn } from "child_process";
import FCMService from "./FCMService";

export default class GDriveToMegaWorker {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  private downloadToDisk = async (): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      const gDriveLink: string = this.job.data.url;
      console.log(`now downloading ${gDriveLink}\n`);

      const tempDir: string = mkdtempSync(path.join(os.tmpdir(), "niwder-tmp"));

      const fileRe: RegExp = new RegExp(
        /https:\/\/drive\.google\.com\/file\/d\/(.*?)\/.*?\?.*$/g
      );

      const folderRe: RegExp = new RegExp(
        /^https:\/\/drive\.google\.com\/drive\/folders\/(.*)\?.*$/g
      );

      const gDriveService: GDriveService = new GDriveService(this.job);

      if (fileRe.test(gDriveLink)) {
        const fileId: string = gDriveLink.replace(fileRe, "$1");

        const downloadedFile: FileObject = await gDriveService.downloadFile(
          fileId,
          tempDir
        );
        await this.job.updateProgress(49);
        return resolve(downloadedFile);
      } else if (folderRe.test(gDriveLink)) {
        const fileId: string = gDriveLink.replace(folderRe, "$1");

        const downloadedFile: FileObject = await gDriveService.downloadFolder(
          fileId,
          tempDir
        );
        await this.job.updateProgress(49);
        return resolve(downloadedFile);
      } else {
        return reject(new Error("Google Drive link is not understandable"));
      }
    });
  };

  private getMegaLink = async (fileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const megaCMD = spawn("mega-export", ["-a", `/Niwder/${fileName}`]);
      let megaLink: string = "";

      megaCMD.stdout.on("data", (data) => {
        megaLink += data.toString();
      });

      megaCMD.stderr.on("data", (data) => {
        console.log(`MegaCMD error: ${data}`);
      });

      megaCMD.on("error", (err) => {
        return reject(err);
      });

      megaCMD.on("close", (code) => {
        if (code === 0) {
          return resolve(megaLink.split(" ")[2]);
        } else {
          return reject(new Error(`MegaCMD exited with: ${code}`));
        }
      });
    });
  };

  private uploadToMega = async (
    fileName: string,
    filePath: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log(`now uploading ${filePath} to Mega.nz\n`);

      if (!existsSync(filePath)) {
        return reject(new Error(`${filePath} is missing`));
      }

      const megaCMD = spawn("mega-put", ["-c", filePath, "/Niwder/"]);

      megaCMD.stdout.on("data", (data) => {
        console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
      });

      megaCMD.stderr.on("data", (data) => {
        console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
      });

      megaCMD.on("error", (err) => {
        return reject(err);
      });

      megaCMD.on("close", async (code) => {
        if (code === 0) {
          const megaURL: string = await this.getMegaLink(fileName);
          await this.job.updateProgress(98);
          rmSync(path.dirname(filePath), { recursive: true });
          return resolve(megaURL);
        } else {
          return reject(new Error("Error in uploading to Mega.nz"));
        }
      });
    });
  };

  private recordDownloadURL = async (
    megaLink: string,
    fileName: string,
    fileSize: number,
    fileMimeType: string,
    directory: boolean
  ): Promise<void> => {
    const userRef: database.Reference = db.ref("transfers");
    await userRef
      .child(this.job.data.uid)
      .child("gdrive-to-mega")
      .push({
        gDriveLink: this.job.data.url,
        megaLink: megaLink,
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
    const megaLink: string = await this.uploadToMega(
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
