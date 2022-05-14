import type { FileObject } from "../../utilities/interfaces";
import { mkdtempSync, readdirSync, statSync } from "fs";
import path from "path";
import os from "os";
import type { Job } from "bullmq";
import type WebTorrent from "webtorrent";
import FirebaseService from "./FirebaseService";
import mime from "mime-types";
import type { Instance } from "webtorrent";
import TorrentsHealthService from "./TorrentsHealthService";
import type { TorrentsHealth } from "../../utilities/interfaces";
import logging from "../Services/LoggingService";

export default class TorrentsService {
  private readonly job: Job;
  private readonly dbPath: string;
  private readonly client: Instance;
  private readonly torrent: WebTorrent.Torrent;
  private readonly tempDir: string;
  private readonly firebaseService: FirebaseService;
  private intervalObj: ReturnType<typeof setInterval>;
  private intervalObjTwo: ReturnType<typeof setInterval>;
  private torrentsHealth: TorrentsHealth;

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
    this.intervalObj = null;
    this.intervalObjTwo = null;
    this.torrentsHealth = null;
  }

  private setTorrentsHealth = async () => {
    this.torrentsHealth = await TorrentsHealthService.getTorrentsHealth(
      this.job.data.url
    );
  };

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
      btPeers: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.bittorrent.peers
        : 0,
      btSeeders: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.bittorrent.seeders
        : 0,
      btTrackers: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.bittorrent.num_trackers
        : 0,
      wtPeers: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.webtorrent.peers
        : 0,
      wtSeeders: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.webtorrent.seeders
        : 0,
      wtTrackers: Boolean(this.torrentsHealth)
        ? this.torrentsHealth.webtorrent.num_trackers
        : 0,
    });
  };

  private logTorrentsData =
    (event: string): (() => void) =>
    () => {
      logging.info("\n");
      logging.info("name", this.torrent.name);
      logging.info("event", event);
      logging.info(
        "progress",
        Math.round((this.torrent.progress || 0) * 100),
        "%"
      );
      logging.info("timeRemaining", this.torrent.timeRemaining);
      logging.info("numPeers", this.torrent.numPeers);
      logging.info("downloadSpeed", this.torrent.downloadSpeed);
      logging.info("uploadSpeed", this.torrent.uploadSpeed);
      logging.info("length", this.torrent.length);
      logging.info("downloaded", this.torrent.downloaded);
      logging.info("uploaded", this.torrent.uploaded);
      logging.info("\n");
    };

  public downloadToDisk = async (): Promise<FileObject> => {
    return new Promise<FileObject>(async (resolve, reject) => {
      try {
        const url: string = this.job.data.url;
        logging.info(`now downloading ${url}\n\n`);

        this.torrent.on("infoHash", this.recordMetadata);
        this.torrent.on("metadata", this.logTorrentsData("metadata"));
        this.torrent.on("ready", this.logTorrentsData("ready"));

        this.intervalObj = setInterval(this.recordMetadata, 5000);
        this.intervalObjTwo = setInterval(this.setTorrentsHealth, 5000);

        this.torrent.on("error", (error: Error) => {
          return reject(error);
        });

        this.torrent.on("download", () => {
          logging.info(
            `\x1b[A\x1b[G\x1b[2K${this.torrent.name}: ${Math.round(
              this.torrent.progress * 100
            )}%`
          );
        });

        this.torrent.on("done", async () => {
          let files: string[] = readdirSync(this.tempDir);
          if (files.length > 0) {
            const filePath: string = path.join(this.tempDir, files[0]);

            if (this.intervalObj) clearInterval(this.intervalObj);
            if (this.intervalObjTwo) clearInterval(this.intervalObjTwo);

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
      if (this.intervalObj) clearInterval(this.intervalObj);
      if (this.intervalObjTwo) clearInterval(this.intervalObjTwo);

      await this.firebaseService.removeTorrentsMetadata();
      await this.firebaseService.removeRMTorrentsData();
      this.torrent.destroy({}, (error: Error) => {
        if (error) {
          reject(error);
        } else {
          logging.info("Torrent destroyed");
          resolve();
        }
      });
    });
  };
}
