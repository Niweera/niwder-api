import type { database } from "firebase-admin";
import { db } from "../database";
import { BatchResponse, getMessaging } from "firebase-admin/messaging";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";
import type { DataSnapshot } from "@firebase/database-types";

export default class FCMService {
  private ref: database.Reference;
  constructor(uid: string) {
    this.ref = db.ref("fcmKeys").child(uid);
  }

  private getFCMKeys = async (): Promise<string[]> => {
    const response: DataSnapshot = await this.ref.once("value");
    return Object.values(response.val() || {});
  };

  public sendFCM = async (fileName: string, link: string) => {
    const fcmKeys: string[] = await this.getFCMKeys();

    if (!fcmKeys.length) return;

    const message: MulticastMessage = {
      notification: {
        title: fileName,
        body: link,
      },
      data: { collapseKey: String(new Date().getTime()) },
      tokens: fcmKeys,
    };
    const response: BatchResponse = await getMessaging().sendMulticast(message);
    console.log(
      "multicast completed with success count: ",
      response.successCount
    );
  };
}
