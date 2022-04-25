import type { FileObject } from "../../utilities/interfaces";
import { mkdtempSync, readdirSync, statSync } from "fs";
import path from "path";
import os from "os";
import type { Job } from "bullmq";
import WebTorrent from "webtorrent";
import FirebaseService from "../FirebaseService";
import mime from "mime-types";

export default class TorrentsService {
  private readonly job: Job;
  private readonly dbPath: string;
  private readonly client: any;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
    this.client = new WebTorrent();
  }

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const url: string = this.job.data.url;
        console.log(`now downloading ${url}\n\n`);

        let stopRecordTransferring: boolean = false;

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

        const tempDir: string = mkdtempSync(
          path.join(os.tmpdir(), "niwder-tmp")
        );

        const torrent: WebTorrent.Torrent = this.client.add(url, {
          path: tempDir,
          destroyStoreOnDestroy: false,
        });

        torrent.on("error", (error: Error) => {
          return reject(error);
        });

        torrent.on("done", async () => {
          let files: string[] = readdirSync(tempDir);
          if (files.length > 0) {
            const filePath: string = path.join(tempDir, files[0]);
            await this.job.updateProgress(49);
            stopRecordTransferring = true;
            return resolve({
              fileName: files[0],
              filePath: filePath,
              fileMimeType: statSync(filePath).isDirectory()
                ? "inode/directory"
                : mime.lookup(filePath) || "application/octet-stream",
              fileSize: statSync(filePath).size,
              directory: statSync(filePath).isDirectory(),
            });
          } else {
            return reject(new Error(`Downloaded file is missing`));
          }
        });

        torrent.on("download", async () => {
          if (!stopRecordTransferring) {
            await firebaseService.recordTransferring({
              name: torrent.name,
              message: `Transferring from source`,
              percentage: Math.round(torrent.progress * 100),
            });
          }
        });

        this.client.on("error", (error: Error) => {
          return reject(error);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  public destroyTorrentClient = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.client.destroy((error: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log("Torrent client destroyed");
          resolve();
        }
      });
    });
  };
}
