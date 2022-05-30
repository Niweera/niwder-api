import type { Job } from "bullmq";
import { db } from "../../database";
import type {
  DirectLinkRecord,
  DNS,
  DNSRecord,
  TorrentsMetadata,
  TransferringData,
  TransfersData,
} from "../../utilities/interfaces";
import type { DataSnapshot } from "@firebase/database-types";
import keys from "../../keys";
import logging from "../Services/LoggingService";

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

  public removeInterruptions = async () => {
    await db
      .ref("interruptions")
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
      .child(this.job.id)
      .set(data);

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

  public static removeListeners = (
    listenToRemovalsCB: (snapshot: DataSnapshot) => void
  ) => {
    logging.info("Removing all database listeners");
    db.ref(`removeTransfers`).off("value", listenToRemovalsCB);
  };

  public static removeInterruptionsListeners = () => {
    logging.info("Removing all database listeners");
    db.ref(`interruptions`).off("value");
  };

  public static attachDBListeners = (
    listenToRemovalsCB: (snapshot: DataSnapshot) => void
  ) => {
    logging.info("Listening to database removals");
    db.ref(`removeTransfers`).on("value", listenToRemovalsCB);
  };

  public static attachInterruptionsListener = (
    listenToInterruptions: (snapshot: DataSnapshot) => void
  ) => {
    logging.info("Listening to worker interruptions");
    db.ref(`interruptions`).on("value", listenToInterruptions);
  };

  public static getFilePath = async (fileID: string): Promise<string> => {
    const response: DataSnapshot = await db
      .ref("directLinks")
      .child(fileID)
      .child("filePath")
      .once("value");
    return response.val();
  };

  public static removeDirectLinks = async (fileID: string) => {
    await db.ref("directLinks").child(fileID).remove();
  };

  public static getTransfersData = async (
    uid: string,
    dbPath: string,
    key: string
  ): Promise<DataSnapshot> => {
    return await db
      .ref("transfers")
      .child(uid)
      .child(dbPath)
      .child(key)
      .once("value");
  };

  public static removeTransfersData = async (
    uid: string,
    dbPath: string,
    key: string
  ): Promise<void> => {
    await db.ref("transfers").child(uid).child(dbPath).child(key).remove();
  };

  public static removeRMTransfers = async (
    uid: string,
    dbPath: string,
    key: string
  ): Promise<void> => {
    await db
      .ref("removeTransfers")
      .child(uid)
      .child(dbPath)
      .child(key)
      .remove();
  };

  public getDirectLinkHost = async (ipAddress: string): Promise<string> => {
    const response: DataSnapshot = await db
      .ref("dns")
      .orderByChild("ip")
      .equalTo(ipAddress)
      .limitToFirst(1)
      .once("value");

    const dnsRecords: DNS = response.val();

    if (!dnsRecords) {
      return keys.NIWDER_FILE_DIRECT_LINK_HOST;
    }

    const dnsRecord: DNSRecord = Object.values(dnsRecords)[0];

    return `https://${dnsRecord.name}/api/file`;
  };

  public static setNotification = async (
    uid: string,
    title: string,
    body: string
  ): Promise<void> => {
    try {
      await db.ref("notifications").child(uid).set({ title, body });
    } catch (e) {
      logging.error(e.message);
    }
  };

  public static setErrorNotification = async (
    uid: string,
    job: string,
    error: string
  ): Promise<void> => {
    try {
      await db.ref("notifications").child(uid).set({ job, error });
    } catch (e) {
      logging.error(e.message);
    }
  };
}
