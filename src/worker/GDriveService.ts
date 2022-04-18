import { Auth, drive_v3, google } from "googleapis";
import keys from "../keys";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  WriteStream,
} from "fs";
import type { Job } from "bullmq";
import type { GaxiosResponse } from "gaxios";
import path from "path";
import mime from "mime-types";
import type { FileObject } from "../utilities/interfaces";
import type { Readable } from "stream";
import os from "os";
import FirebaseService from "./FirebaseService";

export default class GDriveService {
  private readonly drive: drive_v3.Drive;
  private readonly job: Job;
  private readonly dbPath: string;

  constructor(job: Job, dbPath: string, drive: drive_v3.Drive) {
    this.job = job;
    this.dbPath = dbPath;
    this.drive = drive;
  }

  public static build = async (
    job: Job,
    dbPath: string
  ): Promise<GDriveService> => {
    const firebaseService: FirebaseService = new FirebaseService(job, dbPath);

    const refreshToken: string = await firebaseService.getRefreshToken();

    const client: Auth.OAuth2Client = new google.auth.OAuth2(
      keys.GOOGLE_DRIVE_CLIENT_ID,
      keys.GOOGLE_DRIVE_CLIENT_SECRET,
      keys.GOOGLE_DRIVE_REDIRECT_URI
    );

    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken });

      const drive = google.drive({
        version: "v3",
        auth: client,
      });

      return new GDriveService(job, dbPath, drive);
    } else {
      throw new Error("refreshToken is missing");
    }
  };

  private searchFolder = async (
    folderName: string
  ): Promise<drive_v3.Schema$File | null> => {
    const results: GaxiosResponse<drive_v3.Schema$FileList> =
      await this.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
        fields: "files(id, name)",
      });

    await this.job.updateProgress(50);
    return results.data.files ? results.data.files[0] : null;
  };

  private createFolder = async (
    folderName: string
  ): Promise<drive_v3.Schema$File> => {
    const response: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.create({
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
    let fileSize = statSync(filePath).size;

    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      this.dbPath
    );

    const response: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.create(
        {
          requestBody: {
            name: fileName,
            mimeType: fileMimeType,
            parents: [folderId],
          },
          media: {
            mimeType: fileMimeType,
            body: createReadStream(filePath),
          },
        },
        {
          onUploadProgress: async (evt) => {
            const progress = (evt.bytesRead / fileSize) * 100;
            await firebaseService.recordTransferring({
              name: fileName,
              message: `Transferring to Google Drive`,
              percentage: Math.round(progress),
            });
          },
        }
      );

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

    const folderName: string = keys.GDRIVE_FOLDER_NAME;
    let folder: drive_v3.Schema$File = await this.searchFolder(folderName);

    if (!folder) {
      folder = await this.createFolder(folderName);
    }

    const shareURL: string = await this.saveFile(
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
    parentID: string,
    firebaseService: FirebaseService
  ) => {
    let files: string[] = readdirSync(dirPath);

    const promises: Promise<void>[] = files.map(async (file) => {
      let filePath: string = `${dirPath}/${file}`;
      let fileSize = statSync(path.join(dirPath, file)).size;
      if (statSync(filePath).isDirectory()) {
        const response: GaxiosResponse<drive_v3.Schema$File> =
          await drive.files.create({
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
          response.data.id,
          firebaseService
        );
      } else {
        const fileMimeType: string =
          mime.lookup(file) || "application/octet-stream";
        await drive.files.create(
          {
            requestBody: {
              name: file,
              mimeType: fileMimeType,
              parents: [parentID],
            },
            media: {
              mimeType: fileMimeType,
              body: createReadStream(path.join(dirPath, file)),
            },
          },
          {
            onUploadProgress: async (evt) => {
              const progress = (evt.bytesRead / fileSize) * 100;
              await firebaseService.recordTransferring({
                name: file,
                message: `Transferring to Google Drive`,
                percentage: Math.round(progress),
              });
            },
          }
        );
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

    const folderName: string = keys.GDRIVE_FOLDER_NAME;
    let folder: drive_v3.Schema$File | null = await this.searchFolder(
      folderName
    );

    if (!folder) {
      folder = await this.createFolder(folderName);
    }

    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      this.dbPath
    );

    const fileIDs: string[] = await GDriveService.createDriveFiles(
      path.dirname(filePath),
      [],
      this.drive,
      folder.id,
      firebaseService
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
    const response: GaxiosResponse<drive_v3.Schema$File> =
      await this.drive.files.get({
        fileId,
        fields: "id,name,mimeType,size",
      });
    return response.data;
  };

  private fileSize = (bytes: number): string => {
    const exp: number = Math.floor(Math.log(bytes) / Math.log(1024));
    const result: string = (bytes / Math.pow(1024, exp)).toFixed(2);

    return (
      result + " " + (exp === 0 ? "bytes" : "KMGTPEZY".charAt(exp - 1) + "B")
    );
  };

  private downloadFile = async (
    fileId: string,
    basePath: string
  ): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      try {
        const file: drive_v3.Schema$File = await this.getGDriveFile(fileId);

        const downloadPath: string = path.join(basePath, file.name);
        const response: GaxiosResponse<Readable> = await this.drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" }
        );

        const destination: WriteStream = createWriteStream(downloadPath);
        let progress: number = 0;

        const firebaseService: FirebaseService = new FirebaseService(
          this.job,
          this.dbPath
        );

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
          .on("data", async (d) => {
            progress += d.length;
            console.log(
              "\x1b[A\x1b[G\x1b[2K%s: %s - %s of %s",
              file.name.slice(0, Math.max(0, process.stdout.columns - 32)),
              Math.round((progress / Number(file.size)) * 100) + "%",
              this.fileSize(progress),
              this.fileSize(Number(file.size))
            );

            await firebaseService.recordTransferring({
              name: file.name,
              message: `Transferring from Google Drive`,
              percentage: Math.round((progress / Number(file.size)) * 100),
            });
          })
          .pipe(destination);
      } catch (e) {
        reject(e);
      }
    });
  };

  private static getDriveFiles = async (
    drive: drive_v3.Drive,
    parentID: string,
    dirPath: string,
    firebaseService: FirebaseService
  ) => {
    let arrayOfFiles: drive_v3.Schema$File[] = [];
    let pageToken: string = null;
    let results: GaxiosResponse<drive_v3.Schema$FileList> =
      await drive.files.list({
        q: `'${parentID}' in parents`,
        fields: "nextPageToken, files(id, name, mimeType, size)",
        pageToken: pageToken,
      });

    arrayOfFiles = arrayOfFiles.concat(results.data.files);
    pageToken = results.data.nextPageToken;

    while (pageToken) {
      results = await drive.files.list({
        q: `'${parentID}' in parents`,
        fields: "nextPageToken, files(id, name, mimeType, size)",
        pageToken: pageToken,
      });

      arrayOfFiles = arrayOfFiles.concat(results.data.files);
      pageToken = results.data.nextPageToken;
    }

    const promises: Promise<void>[] = arrayOfFiles.map(async (file) => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          const filePath: string = path.join(dirPath, file.name);
          if (file.mimeType === "application/vnd.google-apps.folder") {
            if (!existsSync(filePath)) {
              mkdirSync(filePath);
            }
            await GDriveService.getDriveFiles(
              drive,
              file.id,
              filePath,
              firebaseService
            );
            return resolve();
          } else {
            const response: GaxiosResponse<Readable> = await drive.files.get(
              { fileId: file.id, alt: "media" },
              { responseType: "stream" }
            );
            const destination: WriteStream = createWriteStream(filePath);
            let progress: number = 0;

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
              .on("data", async (d) => {
                progress += d.length;
                await firebaseService.recordTransferring({
                  name: file.name,
                  message: `Transferring from Google Drive`,
                  percentage: Math.round((progress / Number(file.size)) * 100),
                });
              })
              .pipe(destination);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    await Promise.all(promises);
  };

  private downloadFolder = async (
    fileId: string,
    basePath: string
  ): Promise<FileObject> => {
    const file: drive_v3.Schema$File = await this.getGDriveFile(fileId);
    const pathDir: string = path.join(basePath, file.name);
    if (!existsSync(pathDir)) {
      mkdirSync(pathDir);
    }

    const firebaseService: FirebaseService = new FirebaseService(
      this.job,
      this.dbPath
    );
    await GDriveService.getDriveFiles(
      this.drive,
      fileId,
      pathDir,
      firebaseService
    );
    return {
      fileName: file.name,
      filePath: pathDir,
      fileMimeType: "inode/directory",
      fileSize: 0,
      directory: true,
    };
  };

  public downloadFromGDrive = async (): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      try {
        const gDriveLink: string = this.job.data.url;
        console.log(`now downloading ${gDriveLink}\n`);

        const tempDir: string = mkdtempSync(
          path.join(os.tmpdir(), "niwder-tmp")
        );

        const fileRe: RegExp = new RegExp(
          /^https:\/\/drive\.google\.com\/file\/d\/(.*?)\/.*?\??.*$/g
        );

        const folderRe: RegExp = new RegExp(
          /^https:\/\/drive\.google\.com\/drive\/folders\/(.*)\??.*$/g
        );

        if (fileRe.test(gDriveLink)) {
          const fileId: string = gDriveLink.replace(fileRe, "$1");

          const downloadedFile: FileObject = await this.downloadFile(
            fileId,
            tempDir
          );
          await this.job.updateProgress(49);
          return resolve(downloadedFile);
        } else if (folderRe.test(gDriveLink)) {
          const fileId: string = gDriveLink.replace(folderRe, "$1");

          const downloadedFile: FileObject = await this.downloadFolder(
            fileId,
            tempDir
          );
          await this.job.updateProgress(49);
          return resolve(downloadedFile);
        } else {
          return reject(new Error("Google Drive link is not understandable"));
        }
      } catch (e) {
        reject(e);
      }
    });
  };

  public uploadToGDrive = async (
    fileName: string,
    filePath: string,
    fileMimeType: string,
    directory: boolean
  ): Promise<string> => {
    console.log(`now uploading ${filePath} to GDrive`);
    const shareLink: string = await this.uploadFile(
      fileName,
      filePath,
      fileMimeType,
      directory
    );
    await this.job.updateProgress(98);
    rmSync(path.dirname(filePath), { recursive: true });
    return shareLink;
  };
}
