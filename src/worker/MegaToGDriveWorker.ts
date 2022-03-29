import type { Job } from "bullmq";
import { db } from "../database";
import type { database } from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "fs";
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
      const megaURL: string = this.job.data.url;
      console.log(`now downloading ${megaURL}`);

      const tempDir: string = mkdtempSync(path.join(os.tmpdir(), "niwder-tmp"));

      const fileRe = new RegExp(
        /^https:\/\/mega\.nz\/file\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$/g
      );
      const folderRe = new RegExp(
        /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$/g
      );
      const folderFolderRe = new RegExp(
        /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/folder\/[a-zA-Z0-9]{0,8}$/g
      );
      const folderFileRe = new RegExp(
        /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/file\/[a-zA-Z0-9]{0,8}$/g
      );

      if (fileRe.test(megaURL) || folderRe.test(megaURL)) {
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
              directory: file.directory,
            });
          } else {
            reject(new Error(`${filePath} is missing`));
          }
        });
      } else if (folderFolderRe.test(megaURL)) {
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
          const downloaded = readdirSync(tempDir);
          const filePath = path.join(tempDir, downloaded[0]);

          if (existsSync(filePath) && code === 0) {
            await this.job.updateProgress(49);
            resolve({
              fileName: downloaded[0],
              filePath,
              fileMimeType: "inode/directory",
              fileSize: 0,
              directory: true,
            });
          } else {
            reject(new Error(`${filePath} is missing`));
          }
        });
      } else if (folderFileRe.test(megaURL)) {
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
          const downloaded = readdirSync(tempDir);
          const filePath = path.join(tempDir, downloaded[0]);

          if (existsSync(filePath) && code === 0) {
            await this.job.updateProgress(49);
            resolve({
              fileName: downloaded[0],
              filePath,
              fileMimeType: mime.lookup(filePath) || "application/octet-stream",
              fileSize: statSync(filePath).size,
              directory: false,
            });
          } else {
            reject(new Error(`${filePath} is missing`));
          }
        });
      } else {
        reject(new Error("Mega.nz link is not understandable"));
      }
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
