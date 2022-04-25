import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import path from "path";
import type { Job } from "bullmq";
import type { FileObject } from "../../utilities/interfaces";
import os from "os";
import { File as MEGAFile } from "megajs";
import mime from "mime-types";
import FirebaseService from "./FirebaseService";
import keys from "../../keys";

export default class MegaService {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
  }

  private getMegaLink = async (fileName: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      try {
        const megaCMD: ChildProcessWithoutNullStreams = spawn("mega-export", [
          "-a",
          `/${keys.MEGA_FOLDER_NAME}/${fileName}`,
        ]);
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
            return resolve(megaLink.split(" ").slice(-1).pop());
          } else {
            return reject(new Error(`MegaCMD exited with: ${code}`));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  public uploadToMega = async (
    fileName: string,
    filePath: string
  ): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      try {
        console.log(`now uploading ${filePath} to Mega.nz\n`);

        if (!existsSync(filePath)) {
          return reject(new Error(`${filePath} is missing`));
        }

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

        const percentageRe: RegExp = new RegExp(/.*:\s*([0-9]*\.[0-9]*)\s*.*/g);

        const megaCMD: ChildProcessWithoutNullStreams = spawn("mega-put", [
          "-c",
          filePath,
          `/${keys.MEGA_FOLDER_NAME}/`,
        ]);

        megaCMD.stdout.on("data", (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
        });

        megaCMD.stderr.on("data", async (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
          const percentage: string = data
            .toString()
            .replace(percentageRe, "$1");
          if (Boolean(parseInt(percentage))) {
            await firebaseService.recordTransferring({
              name: fileName,
              message: `Transferring to Mega.nz`,
              percentage: parseInt(percentage),
            });
          }
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
      } catch (e) {
        reject(e);
      }
    });
  };

  public downloadFromMega = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const megaURL: string = this.job.data.url;
        console.log(`now downloading ${megaURL}`);

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );
        const tempDir: string = mkdtempSync(
          path.join(os.tmpdir(), "niwder-tmp")
        );

        const fileRe: RegExp = new RegExp(
          /^https:\/\/mega\.nz\/file\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$/g
        );
        const folderRe: RegExp = new RegExp(
          /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+$/g
        );
        const folderFolderRe: RegExp = new RegExp(
          /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/folder\/[a-zA-Z0-9]{0,8}$/g
        );
        const folderFileRe: RegExp = new RegExp(
          /^https:\/\/mega\.nz\/folder\/[a-zA-Z0-9]{0,8}#[a-zA-Z0-9_-]+\/file\/[a-zA-Z0-9]{0,8}$/g
        );

        const percentageRe: RegExp = new RegExp(/.*:\s*([0-9]*\.[0-9]*)\s*.*/g);

        if (fileRe.test(megaURL) || folderRe.test(megaURL)) {
          const file: MEGAFile = MEGAFile.fromURL(megaURL);
          await file.loadAttributes();

          const filePath: string = path.join(tempDir, file.name);
          const megaCMD: ChildProcessWithoutNullStreams = spawn("mega-get", [
            `"${megaURL}"`,
            tempDir,
          ]);

          megaCMD.stdout.on("data", (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
          });

          megaCMD.stderr.on("data", async (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
            const percentage: string = data
              .toString()
              .replace(percentageRe, "$1");
            if (Boolean(parseInt(percentage))) {
              await firebaseService.recordTransferring({
                name: file.name,
                message: `Transferring from Mega.nz`,
                percentage: parseInt(percentage),
              });
            }
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
                fileMimeType:
                  mime.lookup(filePath) || "application/octet-stream",
                fileSize: file.size,
                directory: file.directory,
              });
            } else {
              reject(new Error(`${filePath} is missing`));
            }
          });
        } else if (folderFolderRe.test(megaURL)) {
          const megaCMD: ChildProcessWithoutNullStreams = spawn("mega-get", [
            `"${megaURL}"`,
            tempDir,
          ]);

          megaCMD.stdout.on("data", (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
          });

          megaCMD.stderr.on("data", async (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
            const percentage: string = data
              .toString()
              .replace(percentageRe, "$1");
            if (Boolean(parseInt(percentage))) {
              await firebaseService.recordTransferring({
                name: "tmp.folder",
                message: `Transferring from Mega.nz`,
                percentage: parseInt(percentage),
              });
            }
          });

          megaCMD.on("error", (err) => {
            reject(err);
          });

          megaCMD.on("close", async (code) => {
            const downloaded: string[] = readdirSync(tempDir);
            const filePath: string = path.join(tempDir, downloaded[0]);

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
          const megaCMD: ChildProcessWithoutNullStreams = spawn("mega-get", [
            `"${megaURL}"`,
            tempDir,
          ]);

          megaCMD.stdout.on("data", (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
          });

          megaCMD.stderr.on("data", async (data) => {
            console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
            const percentage: string = data
              .toString()
              .replace(percentageRe, "$1");
            await firebaseService.recordTransferring({
              name: "tmp.file",
              message: `Transferring from Mega.nz`,
              percentage: parseInt(percentage),
            });
          });

          megaCMD.on("error", (err) => {
            reject(err);
          });

          megaCMD.on("close", async (code) => {
            const downloaded: string[] = readdirSync(tempDir);
            const filePath: string = path.join(tempDir, downloaded[0]);

            if (existsSync(filePath) && code === 0) {
              await this.job.updateProgress(49);
              resolve({
                fileName: downloaded[0],
                filePath,
                fileMimeType:
                  mime.lookup(filePath) || "application/octet-stream",
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
      } catch (e) {
        reject(e);
      }
    });
  };
}
