import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import type { FileObject } from "../../utilities/interfaces";
import FCMService from "../FCMService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../FirebaseService";
import keys from "../../keys";
import TorrentsService from "./TorrentsService";
import FileService from "../FileService";
import type { DirectLinkData } from "../../utilities/interfaces";

export default class TorrentsToDirectWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.TORRENTS_TO_DIRECT_QUEUE;
  }

  private sendFCMNotification = async (
    fileName: string,
    link: string
  ): Promise<void> => {
    const fcmService: FCMService = new FCMService(this.job.data.uid);
    await fcmService.sendFCM(fileName, link);
    await this.job.updateProgress(100);
  };

  public run = async (): Promise<void> => {
    console.log(`now starting transferring ${this.job.data.url}`);
    await this.job.updateProgress(0);
    const torrentsService: TorrentsService = new TorrentsService(
      this.job,
      this.dbPath
    );
    const fileObject: FileObject = await torrentsService.downloadToDisk();
    const fileService: FileService = new FileService(this.job, this.dbPath);
    const directLinkData: DirectLinkData = await fileService.createDirectLink(
      fileObject.fileName,
      fileObject.filePath,
      fileObject.directory,
      fileObject.fileMimeType,
      fileObject.fileSize
    );
    await torrentsService.destroyTorrentClient();
    const transfersData: TransfersData = {
      magnetLink: this.job.data.url,
      directLink: directLinkData.directLink,
      timestamp: ServerValue.TIMESTAMP,
      name: fileObject.directory ? directLinkData.name : fileObject.fileName,
      size: fileObject.directory ? directLinkData.size : fileObject.fileSize,
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
  };
}
