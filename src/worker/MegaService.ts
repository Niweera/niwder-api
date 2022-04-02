import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import type { Job } from "bullmq";
import type { FileObject } from "../utilities/interfaces";
import os from "os";
import { File as MEGAFile } from "megajs";
import mime from "mime-types";

export default class MegaService {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

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

  public uploadToMega = async (
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

  public downloadFromMega = async (): Promise<FileObject> => {
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
}
