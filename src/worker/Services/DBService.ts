import type { DataSnapshot } from "@firebase/database-types";
import { get } from "lodash";
import keys from "../../keys";
import FirebaseService from "./FirebaseService";
import { rmSync } from "fs";
import path from "path";
import MegaService from "./MegaService";

export default class DBService {
  public static removeDirectLinkFiles = async (
    snapshot: DataSnapshot,
    uid: string,
    dbPath: string,
    key: string
  ): Promise<void> => {
    const directLink: string = get(snapshot.val(), "directLink", "");

    if (!directLink) throw new Error("directLink missing");

    const fileID: string = directLink.split("/").pop();

    if (!fileID) throw new Error("fileID missing");

    const filePath: string = await FirebaseService.getFilePath(fileID);
    if (filePath)
      rmSync(path.dirname(filePath), { recursive: true, force: true });
    await FirebaseService.removeDirectLinks(fileID);
    await FirebaseService.removeTransfersData(uid, dbPath, key);
    await FirebaseService.removeRMTransfers(uid, dbPath, key);
    console.log(`removed ${filePath} [${dbPath}]`);
  };

  public static removeMegaFiles = async (
    snapshot: DataSnapshot,
    uid: string,
    dbPath: string,
    key: string
  ): Promise<void> => {
    const fileName: string = get(snapshot.val(), `name`, "");

    if (!fileName) throw new Error("fileName missing");

    await MegaService.removeFileFromMega(uid, key);
    await FirebaseService.removeTransfersData(uid, dbPath, key);
    await FirebaseService.removeRMTransfers(uid, dbPath, key);
    console.log(`removed ${key}/${fileName} [${dbPath}]`);
  };

  private static rmTransfersData = async (
    uid: string,
    dbPath: string,
    key: string
  ) => {
    await FirebaseService.removeTransfersData(uid, dbPath, key);
    await FirebaseService.removeRMTransfers(uid, dbPath, key);
    console.log(`removed file [${dbPath}]`);
  };

  public static listenToRemovalsCB = async (snapshot: DataSnapshot) => {
    try {
      const snapData: object = snapshot.val();
      if (!snapData) return;

      const uid: string = Object.keys(snapData)[0];
      const doc: object = get(snapData, uid, "");
      const dbPath: string = Object.keys(doc)[0];
      const keyObj: object = get(doc, dbPath, "");
      const key: string = Object.keys(keyObj)[0];

      const transfersData: DataSnapshot =
        await FirebaseService.getTransfersData(uid, dbPath, key);

      switch (dbPath) {
        case keys.MEGA_TO_GDRIVE_QUEUE: {
          await DBService.rmTransfersData(uid, dbPath, key);
          break;
        }
        case keys.GDRIVE_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(transfersData, uid, dbPath, key);
          break;
        }
        case keys.DIRECT_TO_GDRIVE_QUEUE: {
          await DBService.rmTransfersData(uid, dbPath, key);
          break;
        }
        case keys.DIRECT_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(transfersData, uid, dbPath, key);
          break;
        }
        case keys.GDRIVE_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(
            transfersData,
            uid,
            dbPath,
            key
          );
          break;
        }
        case keys.MEGA_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(
            transfersData,
            uid,
            dbPath,
            key
          );
          break;
        }
        case keys.TORRENTS_TO_GDRIVE_QUEUE: {
          await DBService.rmTransfersData(uid, dbPath, key);
          break;
        }
        case keys.TORRENTS_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(transfersData, uid, dbPath, key);
          break;
        }
        case keys.TORRENTS_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(
            transfersData,
            uid,
            dbPath,
            key
          );
          break;
        }
        default: {
          break;
        }
      }
    } catch (e) {
      console.log(e.message);
    }
  };
}
