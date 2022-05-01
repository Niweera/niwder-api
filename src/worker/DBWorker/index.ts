import { db } from "../../database";
import type { DataSnapshot } from "@firebase/database-types";
import keys from "../../keys";
import { get } from "lodash";
import { rmSync } from "fs";
import path from "path";

const removeDirectLinkFiles = async (
  snapData: DataSnapshot,
  dbPath: string
): Promise<void> => {
  const data: string = get(snapData, dbPath, {});
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

  const response: DataSnapshot = await db
    .ref("directLinks")
    .child(fileID)
    .child("filePath")
    .once("value");
  const filePath: string = response.val();

  rmSync(path.dirname(filePath), { recursive: true });
  await db.ref("directLinks").child(fileID).remove();
  console.log(`removed ${filePath} [${dbPath}]`);
};

const listenToRemovalsCB = async (snapshot: DataSnapshot) => {
  try {
    const snapData: DataSnapshot = snapshot.val();
    const dbPath: string = Object.keys(snapData)[0];

    switch (dbPath) {
      case keys.GDRIVE_TO_DIRECT_QUEUE: {
        await removeDirectLinkFiles(snapData, dbPath);
        break;
      }
      case keys.MEGA_TO_DIRECT_QUEUE: {
        await removeDirectLinkFiles(snapData, dbPath);
        break;
      }
      case keys.TORRENTS_TO_DIRECT_QUEUE: {
        await removeDirectLinkFiles(snapData, dbPath);
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

const removeListeners = () => {
  console.log("Removing all database listeners");
  db.ref(`transfers`).off("child_removed", listenToRemovalsCB);
};

console.log("Listening to database removals");
db.ref(`transfers`).on("child_removed", listenToRemovalsCB);

process.on("SIGINT", () => {
  removeListeners();
  process.exit(0);
});
