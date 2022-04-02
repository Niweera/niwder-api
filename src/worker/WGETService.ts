import type { FileObject } from "../utilities/interfaces";
import { mkdtempSync, readdirSync, statSync } from "fs";
import path from "path";
import os from "os";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import mime from "mime-types";
import type { Job } from "bullmq";

export default class WGETService {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      const url: string = this.job.data.url;
      console.log(`now downloading ${url}\n\n`);

      const tempDir: string = mkdtempSync(path.join(os.tmpdir(), "niwder-tmp"));
      const wget: ChildProcessWithoutNullStreams = spawn("wget", [
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
    });
  };
}
