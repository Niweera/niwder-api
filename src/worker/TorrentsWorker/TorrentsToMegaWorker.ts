import type { Job } from "bullmq";
import { ServerValue } from "firebase-admin/database";
import type { FileObject } from "../../utilities/interfaces";
import FCMService from "../Services/FCMService";
import type { TransfersData } from "../../utilities/interfaces";
import FirebaseService from "../Services/FirebaseService";
import keys from "../../keys";
import TorrentsService from "./TorrentsService";
import MegaService from "../Services/MegaService";

export default class TorrentsToMegaWorker {
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job) {
    this.job = job;
    this.dbPath = keys.TORRENTS_TO_MEGA_QUEUE;
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
    const megaService: MegaService = new MegaService(this.job, this.dbPath);
    const megaLink: string = await megaService.uploadToMega(
      fileObject.fileName,
      fileObject.filePath
    );
    await torrentsService.destroyTorrentClient();
    const transfersData: TransfersData = {
      magnetLink: this.job.data.url,
      megaLink: megaLink,
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
    await this.sendFCMNotification(fileObject.fileName, megaLink);
  };
}
