import type { FileObject } from "../../utilities/interfaces";
import { mkdtempSync, readdirSync, renameSync, statSync } from "fs";
import path from "path";
import os from "os";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import mime from "mime-types";
import type { Job } from "bullmq";
import FirebaseService from "./FirebaseService";
import logging from "../Services/LoggingService";

export default class WGETService {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
  }

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const url: string = this.job.data.url;
        logging.info(`now downloading ${url}\n\n`);

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

        const percentageRe: RegExp = new RegExp(/.*\s(\d*)%.*/g);
        const fileNameRe: RegExp = new RegExp(/\s(.*)\s.*?\[.*/g);

        const tempDir: string = mkdtempSync(
          path.join(os.tmpdir(), "niwder-tmp")
        );
        const wget: ChildProcessWithoutNullStreams = spawn("wget", [
          `-P`,
          tempDir,
          url,
          "-q",
          "--show-progress",
          "--progress",
          "bar:force",
          "--trust-server-names",
          "--content-disposition",
        ]);

        wget.stdout.on("data", (data) => {
          logging.info(`\x1b[A\x1b[G\x1b[2K${data}`);
        });

        wget.stderr.on("data", async (data) => {
          logging.info(`\x1b[A\x1b[G\x1b[2K${data}`);
          const percentage: string = data
            .toString()
            .replace(percentageRe, "$1");
          const wgetName: string = data.toString().replace(fileNameRe, "$1");
          if (Boolean(parseInt(percentage))) {
            await firebaseService.recordTransferring({
              name: Boolean(wgetName) ? wgetName : "tmp.file",
              message: `Transferring from source`,
              percentage: parseInt(percentage),
            });
          }
        });

        wget.on("error", (err) => {
          reject(err);
        });

        wget.on("close", async (code) => {
          let files: string[] = readdirSync(tempDir);

          if (files.length > 0 && code === 0) {
            const fileRe: RegExp = new RegExp(/(.*)\?.*/g);

            let finalFileName: string = files[0];
            let finalFilePath: string = path.join(tempDir, finalFileName);

            if (fileRe.test(finalFileName)) {
              const newFileName: string = finalFileName.replace(fileRe, "$1");
              let newFilePath: string = path.join(tempDir, newFileName);
              renameSync(finalFilePath, newFilePath);
              finalFileName = newFileName;
              finalFilePath = newFilePath;
            }

            await this.job.updateProgress(49);
            resolve({
              fileName: finalFileName,
              filePath: finalFilePath,
              fileMimeType: statSync(finalFilePath).isDirectory()
                ? "inode/directory"
                : mime.lookup(finalFilePath) || "application/octet-stream",
              fileSize: statSync(finalFilePath).size,
              directory: statSync(finalFilePath).isDirectory(),
            });
          } else {
            reject(
              new Error(
                `Error occurred in downloading file [error code ${code}]`
              )
            );
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}
