import type { Job } from "bullmq";
import type { database } from "firebase-admin";
import { db } from "../database";
import type { TransfersData } from "../utilities/interfaces";

export default class FirebaseService {
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
  }

  public recordDownloadURL = async (
    dbPath: string,
    data: TransfersData
  ): Promise<void> => {
    const userRef: database.Reference = db.ref("transfers");
    await userRef.child(this.job.data.uid).child(dbPath).push(data);
    await this.job.updateProgress(99);
  };
}
