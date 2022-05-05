import { existsSync, mkdtempSync, rmSync, statSync } from "fs";
import type { Job } from "bullmq";
import FirebaseService from "./FirebaseService";
import keys from "../../keys";
import type { DirectFilePath } from "../../utilities/interfaces";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import type { DirectLinkData } from "../../utilities/interfaces";

export default class FileService {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
  }

  private createFilePath = async (
    fileName: string,
    filePath: string,
    isDirectory: boolean,
    firebaseService: FirebaseService
  ): Promise<DirectFilePath> => {
    return new Promise<DirectFilePath>(async (resolve, reject) => {
      try {
        if (isDirectory) {
          const tempDir: string = mkdtempSync(
            path.join(os.tmpdir(), "niwder-files")
          );
          const zipPath: string = path.join(tempDir, fileName + ".zip");
          const zip: ChildProcessWithoutNullStreams = spawn(
            "zip",
            ["-rdc", zipPath, "."],
            { cwd: filePath }
          );

          const percentageRe: RegExp = new RegExp(/\s+(\d+)\/\s+(\d+)\s+\w+./g);

          zip.stdout.on("data", async (data) => {
            const matches = JSON.stringify(data.toString()).matchAll(
              percentageRe
            );
            for (const match of matches) {
              if (match.length > 2) {
                await firebaseService.recordTransferring({
                  name: fileName,
                  message: `Zipping files`,
                  percentage: Math.round(
                    (parseInt(match[1]) /
                      (parseInt(match[1]) + parseInt(match[2]))) *
                      100
                  ),
                });
              }
            }
          });

          zip.stderr.on("data", async (data) => {
            console.log(`stderr: ${data}`);
          });

          zip.on("error", (err) => {
            return reject(err);
          });

          zip.on("close", async (code) => {
            if (code === 0 && existsSync(zipPath)) {
              await this.job.updateProgress(98);
              rmSync(path.dirname(filePath), { recursive: true, force: true });
              return resolve({
                filePath: zipPath,
                size: statSync(zipPath).size,
              });
            } else {
              return reject(new Error("Error in zipping file"));
            }
          });
        } else {
          await this.job.updateProgress(98);
          resolve({ filePath: filePath });
        }
      } catch (e) {
        reject(e);
      }
    });
  };

  public createDirectLink = async (
    fileName: string,
    filePath: string,
    isDirectory: boolean,
    mimeType: string,
    size: number
  ): Promise<DirectLinkData> => {
    return new Promise<DirectLinkData>(async (resolve, reject) => {
      try {
        console.log(`now creating direct link to ${filePath}\n`);

        if (!existsSync(filePath)) {
          return reject(new Error(`${filePath} is missing`));
        }

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

        const filePathRecord: DirectFilePath = await this.createFilePath(
          fileName,
          filePath,
          isDirectory,
          firebaseService
        );

        const fileID: string = createHash("sha256")
          .update(`${this.job.data.uid}/${this.dbPath}/${this.job.name}`)
          .digest("hex");

        const newFileName: string = isDirectory ? fileName + ".zip" : fileName;

        await firebaseService.recordDirectLink(fileID, {
          name: newFileName,
          mimeType: isDirectory ? "application/zip" : mimeType,
          size: isDirectory ? filePathRecord.size : size,
          filePath: isDirectory ? filePathRecord.filePath : filePath,
        });

        return resolve({
          name: newFileName,
          directLink: `${keys.NIWDER_FILE_DIRECT_LINK_HOST}/${fileID}`,
          size: isDirectory ? filePathRecord.size : size,
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}
