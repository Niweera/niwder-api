import type { Job } from "bullmq";
import { db } from "../../database";
import type {
  TransfersData,
  TransferringData,
  DirectLinkRecord,
} from "../../utilities/interfaces";
import type { DataSnapshot } from "@firebase/database-types";

export default class FirebaseService {
  private readonly job: Job;
  private dbPath: string;

  constructor(job: Job, dbPath: string) {
    this.job = job;
    this.dbPath = dbPath;
  }

  public recordDownloadURL = async (data: TransfersData): Promise<void> => {
    await db
      .ref("transfers")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .push(data);

    await db
      .ref("transferring")
      .child(this.job.data.uid)
      .child(this.dbPath)
      .child(this.job.id)
      .remove();

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
