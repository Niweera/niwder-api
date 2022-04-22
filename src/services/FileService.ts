import type {
  DirectLinkRecord,
  ServeFileObject,
} from "../utilities/interfaces";
import FirebaseService from "./FirebaseService";

export default class FileService {
  private readonly firebaseService: FirebaseService;

  constructor() {
    this.firebaseService = new FirebaseService();
  }

  serve = async (fileID: string): Promise<ServeFileObject | null> => {
    const fileObject: DirectLinkRecord | null =
      await this.firebaseService.getFilePath(fileID);

    if (fileObject) {
      return {
        name: fileObject.name,
        path: fileObject.filePath,
      };
    } else {
      return null;
    }
  };
}
