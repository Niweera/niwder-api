import { Auth, drive_v3, google } from "googleapis";
import keys from "../keys";
import { createReadStream, existsSync, readdirSync, statSync } from "fs";
import type { Job } from "bullmq";
import type { GaxiosResponse } from "gaxios";
import path from "path";
import mime from "mime-types";

export default class GDriveService {
  private readonly drive: drive_v3.Drive;
  private readonly job: Job;

  constructor(job: Job) {
    this.job = job;
    const client: Auth.OAuth2Client = new google.auth.OAuth2(
      keys.GOOGLE_DRIVE_CLIENT_ID,
      keys.GOOGLE_DRIVE_CLIENT_SECRET,
      keys.GOOGLE_DRIVE_REDIRECT_URI
    );
    client.setCredentials({ refresh_token: keys.GOOGLE_DRIVE_REFRESH_TOKEN });
    this.drive = google.drive({
      version: "v3",
      auth: client,
    });
  }

  private searchFolder = async (
    folderName: string
  ): Promise<drive_v3.Schema$File | null> => {
    const results = await this.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
      fields: "files(id, name)",
    });

    await this.job.updateProgress(50);
    return results.data.files ? results.data.files[0] : null;
  };

  private createFolder = async (
    folderName: string
  ): Promise<drive_v3.Schema$File> => {
    const response = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, name",
    });

    await this.job.updateProgress(55);
    return response.data;
  };

  private saveFile = async (
    fileName: string,
    filePath: string,
    fileMimeType: string,
    folderId: string
  ): Promise<string> => {
    const response: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: fileMimeType,
          parents: [folderId],
        },
        media: {
          mimeType: fileMimeType,
          body: createReadStream(filePath),
        },
      });

    await this.drive.permissions.create({
      fileId: response?.data?.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const webViewLinkData: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.get({
        fileId: response?.data?.id,
        fields: "webViewLink",
      });

    await this.job.updateProgress(95);
    return webViewLinkData?.data?.webViewLink;
  };

  private uploadSingleFile = async (
    fileName: string,
    filePath: string,
    fileMimeType: string
  ): Promise<string> => {
    if (!existsSync(filePath)) {
      throw Error(`${filePath} does not exist`);
    }

    const folderName = "Niwder";
    let folder = await this.searchFolder(folderName);

    if (!folder) {
      folder = await this.createFolder(folderName);
    }

    const shareURL = await this.saveFile(
      fileName,
      filePath,
      fileMimeType,
      folder.id
    );

    await this.job.updateProgress(97);
    return shareURL;
  };

  private static getAllFiles = async (
    dirPath: string,
    arrayOfIDs: string[],
    drive: drive_v3.Drive,
    parentID: string
  ) => {
    let files = readdirSync(dirPath);

    const promises = files.map(async (file) => {
      let filePath: string = `${dirPath}/${file}`;
      if (statSync(filePath).isDirectory()) {
        const response = await drive.files.create({
          requestBody: {
            name: file,
            parents: [parentID],
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        });
        arrayOfIDs = await GDriveService.getAllFiles(
          filePath,
          arrayOfIDs,
          drive,
          response.data.id
        );
      } else {
        const fileMimeType = mime.lookup(file) || "application/octet-stream";
        await drive.files.create({
          requestBody: {
            name: file,
            mimeType: fileMimeType,
            parents: [parentID],
          },
          media: {
            mimeType: fileMimeType,
            body: createReadStream(path.join(dirPath, file)),
          },
        });
        arrayOfIDs.push(parentID);
      }
    });

    await Promise.all(promises);
    return arrayOfIDs;
  };

  private uploadDirectory = async (
    fileName: string,
    filePath: string
  ): Promise<string> => {
    if (!existsSync(filePath)) {
      throw Error(`${filePath} does not exist`);
    }

    const folderName = "Niwder";
    let folder = await this.searchFolder(folderName);

    if (!folder) {
      folder = await this.createFolder(folderName);
    }

    const fileIDs: string[] = await GDriveService.getAllFiles(
      path.dirname(filePath),
      [],
      this.drive,
      folder.id
    );

    await this.drive.permissions.create({
      fileId: fileIDs[0],
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const webViewLinkData: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.get({
        fileId: fileIDs[0],
        fields: "webViewLink",
      });

    await this.job.updateProgress(97);
    return webViewLinkData?.data?.webViewLink;
  };

  public uploadFile = async (
    fileName: string,
    filePath: string,
    fileMimeType: string,
    directory: boolean
  ): Promise<string> => {
    if (directory) {
      return await this.uploadDirectory(fileName, filePath);
    } else {
      return await this.uploadSingleFile(fileName, filePath, fileMimeType);
    }
  };
}
