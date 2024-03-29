import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import type { FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import keys from "../../keys";
import TorrentsService from "../Services/TorrentsService";
import FileService from "../Services/FileService";
import type { DirectLinkData } from "../../utilities/interfaces";
import type { Instance } from "webtorrent";
import { db } from "../../database";
import type { DataSnapshot } from "@firebase/database-types";
import logging from "../Services/LoggingService";

export default class TorrentsToDirectWorker {
  private readonly job: Job;
  private readonly dbPath: string;
  private readonly client: Instance;
  private torrentsService: TorrentsService;

  constructor(job: Job, client: Instance) {
    this.job = job;
    this.dbPath = keys.TORRENTS_TO_DIRECT_QUEUE;
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
    const fcmService: FCMService = new FCMService(this.job.data.uid);
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

        logging.info(`now starting transferring ${this.job.data.url}`);
        await this.job.updateProgress(0);
        const fileObject: FileObject =
          await this.torrentsService.downloadToDisk();
        const fileService: FileService = new FileService(this.job, this.dbPath);
        const directLinkData: DirectLinkData =
          await fileService.createDirectLink(
            fileObject.fileName,
            fileObject.filePath,
            fileObject.directory,
            fileObject.fileMimeType,
            fileObject.fileSize
          );
        await this.torrentsService.destroyTorrent();
        const transfersData: TransfersData = {
          magnetLink: this.job.data.url,
          directLink: directLinkData.directLink,
          timestamp: ServerValue.TIMESTAMP,
          name: fileObject.directory
            ? directLinkData.name
            : fileObject.fileName,
          size: fileObject.directory
            ? directLinkData.size
            : fileObject.fileSize,
          mimeType: fileObject.directory
            ? "application/zip"
            : fileObject.fileMimeType,
        };
        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );
        await firebaseService.recordDownloadURL(transfersData);
        await this.sendFCMNotification(
          fileObject.fileName,
          directLinkData.directLink
        );
        this.removeDBCallback(reject);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  };
}
