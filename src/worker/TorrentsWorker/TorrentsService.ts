import type { FileObject } from "../../utilities/interfaces";
import { mkdtempSync, readdirSync, statSync } from "fs";
import path from "path";
import os from "os";
import type { Job } from "bullmq";
import type WebTorrent from "webtorrent";
import FirebaseService from "../Services/FirebaseService";
import mime from "mime-types";
import type { Instance } from "webtorrent";

export default class TorrentsService {
  private readonly job: Job;
  private readonly dbPath: string;
  private readonly client: Instance;
  private readonly torrent: WebTorrent.Torrent;
  private readonly tempDir: string;
  private readonly firebaseService: FirebaseService;

  constructor(job: Job, dbPath: string, client: Instance) {
    this.job = job;
    this.dbPath = dbPath;
    this.client = client;
    this.tempDir = mkdtempSync(path.join(os.tmpdir(), "niwder-tmp"));
    this.torrent = this.client.add(job.data.url, {
      path: this.tempDir,
      destroyStoreOnDestroy: false,
    });
    this.firebaseService = new FirebaseService(this.job, this.dbPath);
  }

  private recordMetadata = async () => {
    await this.firebaseService.recordTorrentsMetadata({
      name: Boolean(this.torrent.name) ? this.torrent.name : "torrent.file",
      magnetURI: this.job.data.url,
      message: `Transferring from source`,
      percentage: Math.round(
        (isFinite(this.torrent.progress) ? this.torrent.progress : 0) * 100
      ),
      timeRemaining: isFinite(this.torrent.timeRemaining)
        ? this.torrent.timeRemaining
        : 0,
      numPeers: isFinite(this.torrent.numPeers) ? this.torrent.numPeers : 0,
      downloadSpeed: isFinite(this.torrent.downloadSpeed)
        ? this.torrent.downloadSpeed
        : 0,
      uploadSpeed: isFinite(this.torrent.uploadSpeed)
        ? this.torrent.uploadSpeed
        : 0,
      length: isFinite(this.torrent.length) ? this.torrent.length : 0,
      downloaded: isFinite(this.torrent.downloaded)
        ? this.torrent.downloaded
        : 0,
      uploaded: isFinite(this.torrent.uploaded) ? this.torrent.uploaded : 0,
    });
  };

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const url: string = this.job.data.url;
        console.log(`now downloading ${url}\n\n`);

        this.torrent.on("infoHash", this.recordMetadata);
        const intervalObj = setInterval(this.recordMetadata, 5000);

        this.torrent.on("error", (error: Error) => {
          return reject(error);
        });

        this.torrent.on("download", () => {
          console.log(
            `\x1b[A\x1b[G\x1b[2K${this.torrent.name}: ${Math.round(
              this.torrent.progress * 100
            )}%`
          );
        });

        this.torrent.on("done", async () => {
          let files: string[] = readdirSync(this.tempDir);
          if (files.length > 0) {
            const filePath: string = path.join(this.tempDir, files[0]);

            clearInterval(intervalObj);
            await this.recordMetadata();
            await this.job.updateProgress(49);

            return resolve({
              fileName: files[0],
              filePath: filePath,
              fileMimeType: statSync(filePath).isDirectory()
                ? "inode/directory"
                : mime.lookup(filePath) || "application/octet-stream",
              fileSize: isFinite(this.torrent.length) ? this.torrent.length : 0,
              directory: statSync(filePath).isDirectory(),
            });
          } else {
            return reject(new Error(`Downloaded file is missing`));
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

  public destroyTorrent = (): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
      await this.firebaseService.removeTorrentMetadata();
      this.torrent.destroy({}, (error: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log("Torrent destroyed");
          resolve();
        }
      });
    });
  };
}
