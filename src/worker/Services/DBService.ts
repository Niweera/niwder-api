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
    dbPath: string
  ): Promise<void> => {
    const data: string = get(snapshot.val(), dbPath, {});
    if (!Object.keys(data)[0]) throw new Error("Missing key");
    const directLink: string = get(
      data,
      `${Object.keys(data)[0]}.directLink`,
      ""
    );

    if (!directLink) throw new Error("directLink missing");

    const fileID: string = directLink.split(
      `${keys.NIWDER_FILE_DIRECT_LINK_HOST}/`
    )[1];

    if (!fileID) throw new Error("fileID missing");

    const filePath: string = await FirebaseService.getFilePath(fileID);
    rmSync(path.dirname(filePath), { recursive: true });
    await FirebaseService.removeDirectLinks(fileID);
    console.log(`removed ${filePath} [${dbPath}]`);
  };

  public static removeMegaFiles = async (
    snapshot: DataSnapshot,
    dbPath: string
  ): Promise<void> => {
    const data: string = get(snapshot.val(), dbPath, {});
    if (!Object.keys(data)[0]) throw new Error("Missing key");
    const fileName: string = get(data, `${Object.keys(data)[0]}.name`, "");

    if (!fileName) throw new Error("fileName missing");
    const uid: string = snapshot.key;

    await MegaService.removeFileFromMega(uid, fileName);
    console.log(`removed ${fileName} [${dbPath}]`);
  };

  public static listenToRemovalsCB = async (snapshot: DataSnapshot) => {
    try {
      const dbPath: string = Object.keys(snapshot.val())[0];

      switch (dbPath) {
        case keys.GDRIVE_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(snapshot, dbPath);
          break;
        }
        case keys.MEGA_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(snapshot, dbPath);
          break;
        }
        case keys.TORRENTS_TO_DIRECT_QUEUE: {
          await DBService.removeDirectLinkFiles(snapshot, dbPath);
          break;
        }
        case keys.GDRIVE_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(snapshot, dbPath);
          break;
        }
        case keys.DIRECT_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(snapshot, dbPath);
          break;
        }
        case keys.TORRENTS_TO_MEGA_QUEUE: {
          await DBService.removeMegaFiles(snapshot, dbPath);
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
