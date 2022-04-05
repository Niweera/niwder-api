import type { Job } from "bullmq";
import { db } from "../database";
import type { TransfersData, TransferringData } from "../utilities/interfaces";

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
}
