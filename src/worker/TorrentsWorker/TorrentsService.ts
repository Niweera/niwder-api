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
    if (!this.torrent.done) {
      await this.firebaseService.recordTorrentsMetadata({
        name: this.torrent.name,
        magnetURI: this.job.data.url,
        message: `Transferring from source`,
        percentage: Math.round(this.torrent.progress * 100),
        timeRemaining: isFinite(this.torrent.timeRemaining)
          ? this.torrent.timeRemaining
          : 0,
        numPeers: this.torrent.numPeers,
        downloadSpeed: this.torrent.downloadSpeed,
        uploadSpeed: this.torrent.uploadSpeed,
        length: isFinite(this.torrent.length) ? this.torrent.length : 0,
        downloaded: this.torrent.downloaded,
        uploaded: this.torrent.uploaded,
      });
    }
  };

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const url: string = this.job.data.url;
        console.log(`now downloading ${url}\n\n`);

        this.torrent.on("infoHash", this.recordMetadata);

        this.torrent.on("noPeers", this.recordMetadata);

        this.torrent.on("error", (error: Error) => {
          return reject(error);
        });

        this.torrent.on("download", this.recordMetadata);

        this.torrent.on("done", async () => {
          let files: string[] = readdirSync(this.tempDir);
          if (files.length > 0) {
            const filePath: string = path.join(this.tempDir, files[0]);
            await this.job.updateProgress(49);
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
