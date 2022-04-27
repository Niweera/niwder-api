import type { Job } from "bullmq";
import { db } from "../../database";
import type {
  TransfersData,
  TransferringData,
  DirectLinkRecord,
  TorrentsMetadata,
} from "../../utilities/interfaces";
import type { DataSnapshot } from "@firebase/database-types";

export default class FirebaseService {
  private readonly job: Job;
  private dbPath: string;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
  }

  public removeTransferring = async () => {
    await db
      .ref("transferring")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .remove();
  };

  public recordDownloadURL = async (data: TransfersData): Promise<void> => {
    await db
      .ref("transfers")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .push(data);

    await this.removeTransferring();
    await this.job.updateProgress(99);
  };

  public recordTransferring = async (data: TransferringData): Promise<void> => {
    await db
      .ref("transferring")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .set(data);
  };

  public recordTorrentsMetadata = async (
    data: TorrentsMetadata
  ): Promise<void> => {
    await db
      .ref("torrents")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .set(data);
  };

  public removeTorrentsMetadata = async (): Promise<void> => {
    await db
      .ref("torrents")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .remove();
  };

  public removeRMTorrentsData = async (): Promise<void> => {
    await db
      .ref("removeTorrents")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .remove();
  };

  public getRefreshToken = async (): Promise<string> => {
    const response: DataSnapshot = await db
      .ref("tokens")
      .child(this.job.data.uid)
      .child("refreshToken")
      .once("value");
    return response.val();
  };

  public recordDirectLink = async (
    fileID: string,
    data: DirectLinkRecord
  ): Promise<void> => {
    await db.ref("directLinks").child(fileID).set(data);
  };
}
