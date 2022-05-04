import fastFolderSize from "fast-folder-size";
import { promisify } from "util";

export default promisify(fastFolderSize);
