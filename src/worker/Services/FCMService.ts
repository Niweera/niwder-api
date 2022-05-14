import type { database } from "firebase-admin";
import { db } from "../../database";
import { BatchResponse, getMessaging } from "firebase-admin/messaging";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";
import type { DataSnapshot } from "@firebase/database-types";
import type { FCMDataPayload } from "../../utilities/interfaces";
import type { Logger } from "winston";

export default class FCMService {
  private ref: database.Reference;
  private logging: Logger;

  constructor(uid: string, logging: Logger) {
    this.ref = db.ref("fcmKeys").child(uid);
    this.logging = logging;
  }

  private getFCMKeys = async (): Promise<string[]> => {
    const response: DataSnapshot = await this.ref.once("value");
    return Object.values(response.val() || {});
  };

  public sendFCM = async (title: string, body: string): Promise<void> => {
    const fcmKeys: string[] = await this.getFCMKeys();

    if (!fcmKeys.length) return;

    const message: MulticastMessage = {
      notification: {
        title: title,
        body: body,
      },
      data: { collapseKey: String(new Date().getTime()) },
      tokens: fcmKeys,
    };
    const response: BatchResponse = await getMessaging().sendMulticast(message);
    this.logging.info(
      "multicast completed with success count: ",
      response.successCount
    );
  };

  public sendErrorMessage = async (data: FCMDataPayload): Promise<void> => {
    const fcmKeys: string[] = await this.getFCMKeys();

    if (!fcmKeys.length) return;

    const message: MulticastMessage = {
      data: { collapseKey: String(new Date().getTime()), ...data },
      tokens: fcmKeys,
    };
    const response: BatchResponse = await getMessaging().sendMulticast(message);
    this.logging.info(
      "multicast completed with success count: ",
      response.successCount
    );
  };
}
