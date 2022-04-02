import { Auth, drive_v3, google } from "googleapis";
import keys from "../keys";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  WriteStream,
} from "fs";
import type { Job } from "bullmq";
import type { GaxiosResponse } from "gaxios";
import path from "path";
import mime from "mime-types";
import type { FileObject } from "../utilities/interfaces";
import type { Readable } from "stream";

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

    await this.job.updateProgress(96);
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

  private static createDriveFiles = async (
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
        arrayOfIDs = await GDriveService.createDriveFiles(
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

    const fileIDs: string[] = await GDriveService.createDriveFiles(
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

  private getGDriveFile = async (
    fileId: string
  ): Promise<drive_v3.Schema$File> => {
    const response = await this.drive.files.get({
      fileId,
      fields: "id,name,mimeType,size",
    });
    return response.data;
  };

  private fileSize = (bytes: number): string => {
    const exp = Math.floor(Math.log(bytes) / Math.log(1024));
    const result = (bytes / Math.pow(1024, exp)).toFixed(2);

    return (
      result + " " + (exp === 0 ? "bytes" : "KMGTPEZY".charAt(exp - 1) + "B")
    );
  };

  public downloadFile = async (
    fileId: string,
    basePath: string
  ): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      const file: drive_v3.Schema$File = await this.getGDriveFile(fileId);

      const downloadPath: string = path.join(basePath, file.name);
      const response: GaxiosResponse<Readable> = await this.drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      const destination: WriteStream = createWriteStream(downloadPath);
      let progress: number = 0;

      response.data
        .on("error", (err) => {
          return reject(err);
        })
        .on("close", () => {
          if (existsSync(downloadPath)) {
            return resolve({
              fileName: file.name,
              filePath: downloadPath,
              fileMimeType: file.mimeType,
              fileSize: Number(file.size),
              directory: false,
            });
          } else {
            return reject(new Error(`${downloadPath} is missing`));
          }
        })
        .on("data", (d) => {
          progress += d.length;
          console.log(
            "\x1b[A\x1b[G\x1b[2K%s: %s - %s of %s",
            file.name.slice(0, Math.max(0, process.stdout.columns - 32)),
            Math.round((progress / Number(file.size)) * 100) + "%",
            this.fileSize(progress),
            this.fileSize(Number(file.size))
          );
        })
        .pipe(destination);
    });
  };

  private static getDriveFiles = async (
    drive: drive_v3.Drive,
    parentID: string,
    dirPath: string
  ) => {
    let arrayOfFiles: drive_v3.Schema$File[] = [];
    let pageToken: string = null;
    let results: GaxiosResponse<drive_v3.Schema$FileList> =
      await drive.files.list({
        q: `'${parentID}' in parents`,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageToken: pageToken,
      });

    arrayOfFiles = arrayOfFiles.concat(results.data.files);
    pageToken = results.data.nextPageToken;

    while (pageToken) {
      results = await drive.files.list({
        q: `'${parentID}' in parents`,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageToken: pageToken,
      });

      arrayOfFiles = arrayOfFiles.concat(results.data.files);
      pageToken = results.data.nextPageToken;
    }

    const promises = arrayOfFiles.map(async (file) => {
      return new Promise<void>(async (resolve, reject) => {
        const filePath: string = path.join(dirPath, file.name);
        if (file.mimeType === "application/vnd.google-apps.folder") {
          if (!existsSync(filePath)) {
            mkdirSync(filePath);
          }
          await GDriveService.getDriveFiles(drive, file.id, filePath);
          return resolve();
        } else {
          const response: GaxiosResponse<Readable> = await drive.files.get(
            { fileId: file.id, alt: "media" },
            { responseType: "stream" }
          );
          const destination: WriteStream = createWriteStream(filePath);

          response.data
            .on("error", (err) => {
              return reject(err);
            })
            .on("close", () => {
              if (existsSync(filePath)) {
                return resolve();
              } else {
                return reject(new Error(`${filePath} missing`));
              }
            })
            .pipe(destination);
        }
      });
    });

    await Promise.all(promises);
  };

  public downloadFolder = async (
    fileId: string,
    basePath: string
  ): Promise<FileObject> => {
    const file: drive_v3.Schema$File = await this.getGDriveFile(fileId);
    const pathDir: string = path.join(basePath, file.name);
    if (!existsSync(pathDir)) {
      mkdirSync(pathDir);
    }
    await GDriveService.getDriveFiles(this.drive, fileId, pathDir);
    return {
      fileName: file.name,
      filePath: pathDir,
      fileMimeType: "inode/directory",
      fileSize: 0,
      directory: true,
    };
  };
}
