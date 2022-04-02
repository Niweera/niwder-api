import type { ObjectSchema } from "joi";

export type FileObject = {
  fileName: string;
  filePath: string;
  fileMimeType: string;
  fileSize: number;
  directory: boolean;
};

type Scope = {
  [scope: string]: ObjectSchema;
};

export type Model = {
  scopes: Scope;
};

export type Validator = {
  [models: string]: Model;
};
