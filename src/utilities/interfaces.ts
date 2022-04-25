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
  magnetLink?: string;
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

export type TorrentsMetadata = {
  name: string;
  magnetURI: string;
  message: string;
  percentage: number;
  timeRemaining: number;
  numPeers: number;
  downloadSpeed: number;
  uploadSpeed: number;
  length: number;
  downloaded: number;
  uploaded: number;
};

export type ExtendedParsedQs = {
  code?: string;
  error?: string;
  state?: string;
};

export type DirectLinkRecord = {
  name: string;
  mimeType: string;
  size: number;
  filePath: string;
};

export type DirectFilePath = {
  filePath: string;
  size?: number;
};

export type DirectLinkData = {
  name: string;
  directLink: string;
  size: number;
};

export type ServeFileObject = {
  name: string;
  path: string;
};

export type FCMDataPayload = {
  job: string;
  error: string;
};
