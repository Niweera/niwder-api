import type { FileObject } from "../../utilities/interfaces";
import { mkdtempSync, readdirSync, statSync } from "fs";
import path from "path";
import os from "os";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import mime from "mime-types";
import type { Job } from "bullmq";
import FirebaseService from "./FirebaseService";

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
        console.log(`now downloading ${url}\n\n`);

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

        const percentageRe: RegExp = new RegExp(/.*\s(\d*)%.*/g);

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
        ]);

        wget.stdout.on("data", (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
        });

        wget.stderr.on("data", async (data) => {
          console.log(`\x1b[A\x1b[G\x1b[2K${data}`);
          const percentage: string = data
            .toString()
            .replace(percentageRe, "$1");
          if (Boolean(parseInt(percentage))) {
            await firebaseService.recordTransferring({
              name: "tmp.file",
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
      } catch (e) {
        reject(e);
      }
    });
  };
}
