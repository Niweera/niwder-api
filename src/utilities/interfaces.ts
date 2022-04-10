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

export type TransfersData = {
  megaLink?: string;
  gDriveLink?: string;
  directLink?: string;
  timestamp: Object;
  name: string;
  size: number;
  mimeType: string;
};

export type TransferringData = {
  name: string;
  message: string;
  percentage: number;
};

export type ExtendedParsedQs = {
  code?: string;
  error?: string;
  state?: string;
};
