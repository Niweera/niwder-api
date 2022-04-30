import { db } from "../database";
import type { DataSnapshot } from "@firebase/database-types";
import type { DirectLinkRecord } from "../utilities/interfaces";

export default class FirebaseService {
  public recordRefreshToken = async (
    uid: string,
    refreshToken: string
  ): Promise<void> => {
    if (refreshToken) {
      await db.ref("tokens").child(uid).child("refreshToken").set(refreshToken);
      await db.ref("users").child(uid).child("google").set(true);
    }
    await db.ref("tokensRequesting").child(uid).set(false);
  };

  public requestRefreshToken = async (uid: string): Promise<void> => {
    await db.ref("tokensRequesting").child(uid).set(true);
  };

  public revokeRefreshToken = async (uid: string): Promise<void> => {
    await db.ref("tokens").child(uid).remove();
    await db.ref("users").child(uid).child("google").set(false);
  };

  public checkForRequesting = async (uid: string): Promise<boolean> => {
    const response: DataSnapshot = await db
      .ref("tokensRequesting")
      .child(uid)
      .once("value");
    return response.val();
  };

  public static checkUserExists = async (uid: string): Promise<boolean> => {
    const response: DataSnapshot = await db
      .ref("users")
      .child(uid)
      .once("value");
    return response.exists();
  };

  public getFilePath = async (
    fileID: string
  ): Promise<DirectLinkRecord | null> => {
    const response: DataSnapshot = await db
      .ref("directLinks")
      .child(fileID)
      .once("value");
    if (response.exists()) {
      return response.val();
    } else {
      return null;
    }
  };

  public static setServerAlive = (): ReturnType<typeof setInterval> => {
    return setInterval(async () => {
      try {
        await db.ref("live").set(true);
      } catch (e) {
        console.log(e.message);
      }
    }, 5000);
  };

  public static setServerDead = async (
    interval: ReturnType<typeof setInterval>
  ) => {
    try {
      await db.ref("live").set(false);
      if (interval) clearInterval(interval);
    } catch (e) {
      console.log(e.message);
    }
  };
}
