import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import GDriveService from "../Services/GDriveService";
import type { FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import keys from "../../keys";
import TorrentsService from "../Services/TorrentsService";
import type { Instance } from "webtorrent";
import { db } from "../../database";
import type { DataSnapshot } from "@firebase/database-types";
import { TorrentsWorkerLogger as logging } from "../Services/LoggingService";

export default class TorrentsToGDriveWorker {
  private readonly job: Job;
  private readonly dbPath: string;
  private readonly client: Instance;
  private torrentsService: TorrentsService;

  constructor(job: Job, client: Instance) {
    this.job = job;
    this.dbPath = keys.TORRENTS_TO_GDRIVE_QUEUE;
    this.client = client;
    this.torrentsService = new TorrentsService(
      this.job,
      this.dbPath,
      this.client
    );
  }

  private sendFCMNotification = async (
    fileName: string,
    link: string
  ): Promise<void> => {
    const fcmService: FCMService = new FCMService(this.job.data.uid, logging);
    await fcmService.sendFCM(fileName, link);
    await this.job.updateProgress(100);
  };

  private removeDBCallback = (reject: (reason?: any) => void) => {
    db.ref(
      `removeTorrents/${this.job.data.uid}/${this.dbPath}/${this.job.id}`
    ).off("value", this.dbCB(reject));
  };

  private dbCB =
    (reject: (reason?: any) => void) => async (snapshot: DataSnapshot) => {
      if (snapshot.val()) {
        await this.torrentsService.destroyTorrent();
        this.removeDBCallback(reject);
        reject(new Error("Torrent removed by user"));
      }
    };

  public run = async (): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        db.ref(
          `removeTorrents/${this.job.data.uid}/${this.dbPath}/${this.job.id}`
        ).on("value", this.dbCB(reject));

        console.log(`now starting transferring ${this.job.data.url}`);
        await this.job.updateProgress(0);
        const fileObject: FileObject =
          await this.torrentsService.downloadToDisk();
        const gDriveService: GDriveService = await GDriveService.build(
          this.job,
          this.dbPath,
          logging
        );
        const driveLink: string = await gDriveService.uploadToGDrive(
          fileObject.fileName,
          fileObject.filePath,
          fileObject.fileMimeType,
          fileObject.directory
        );
        await this.torrentsService.destroyTorrent();
        const transfersData: TransfersData = {
          magnetLink: this.job.data.url,
          gDriveLink: driveLink,
          timestamp: ServerValue.TIMESTAMP,
          name: fileObject.fileName,
          size: fileObject.fileSize,
          mimeType: fileObject.directory
            ? "inode/directory"
            : fileObject.fileMimeType,
        };
        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );
        await firebaseService.recordDownloadURL(transfersData);
        await this.sendFCMNotification(fileObject.fileName, driveLink);
        this.removeDBCallback(reject);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  };
}
