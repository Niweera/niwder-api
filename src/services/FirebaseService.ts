import { db } from "../database";
import type { DataSnapshot } from "@firebase/database-types";

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
}
