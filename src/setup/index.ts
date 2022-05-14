import { renderFile } from "template-file";
import axios, { AxiosResponse } from "axios";
import { existsSync, writeFileSync } from "fs";
import type { ServiceAccount } from "firebase-admin";
import * as firebase from "firebase-admin";
import * as serviceAccount from "../keys/serviceAccountKey.json";
import { Database, getDatabase } from "firebase-admin/database";
import type { DataSnapshot } from "@firebase/database-types";
import LogDNAWinston from "logdna-winston";
import os from "os";
import macAddress from "macaddress";
import keys from "../keys";
import winston, { Logform, Logger } from "winston";
import { SPLAT } from "triple-beam";

let ip: string = "192.168.1.1";
let mac: string = "00:00:00:00:00:00";

const getIPAddress = async (): Promise<string> => {
  const response: AxiosResponse = await axios.get(
    `https://api64.ipify.org?format=json`
  );
  return response.data.ip;
};

getIPAddress()
  .then((res) => (ip = res))
  .catch();
macAddress
  .one()
  .then((res) => (mac = res))
  .catch();

const logDNAWinston: any = new LogDNAWinston({
  key: keys.LOGDNA_INGESTION_KEY,
  hostname: os.hostname(),
  ip: ip,
  mac: mac,
  app: "Niwder-Worker",
  handleExceptions: true,
  env: "Production",
  level: "debug",
  indexMeta: true,
});

const transform: Logform.FormatWrap = winston.format((info) => {
  info.message = `${info.message} ${(info[SPLAT as any] || []).join(" ")}`;
  return info;
});

const logging: Logger = winston.createLogger({
  level: "debug",
  transports: [new winston.transports.Console(), logDNAWinston],
  format: winston.format.combine(transform(), winston.format.simple()),
  exitOnError: false,
});

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount as ServiceAccount),
  databaseURL: "https://niwder-io-default-rtdb.firebaseio.com/",
});

const db: Database = getDatabase();
const re = /niwder-files-(\d+)\.niweera\.gq/;

type DNSRecord = {
  name: string;
  ip: string;
};
type DNS = DNSRecord[];

const getNewServerID = async (): Promise<number> => {
  const response: DataSnapshot = await db.ref("dns").once("value");
  const dnsRecords: DNS = response.val();

  if (!dnsRecords) {
    logging.info(`New ServerID: 0`);
    return 0;
  }

  const dnsNames: string[] = Object.values(dnsRecords)
    .map((record: DNSRecord) => (re.test(record.name) ? record.name : ""))
    .filter(Boolean);

  const serverIDs: number[] = dnsNames
    .map((name: string) => name.replace(re, "$1"))
    .map((id: string) => parseInt(id))
    .sort((a: number, b: number) => a - b);

  const newServerID: number = Boolean(serverIDs.length)
    ? serverIDs.pop() + 1
    : 0;

  logging.info(`New ServerID: ${newServerID}`);
  return newServerID;
};

const setupVHost = async (serverID: number): Promise<void> => {
  const vhostPath: string = "/home/gcp/niwder-api/assets/vhost-template";
  const finalVHostPath: string =
    "/home/gcp/niwder-api/assets/niwder-files.niweera.gq";

  if (!existsSync(vhostPath))
    throw new Error("VHost template file is missing!");

  const vhost: string = await renderFile(vhostPath, { server_id: serverID });

  writeFileSync(finalVHostPath, vhost);
  logging.info("VHost file created");
};

const allowCreateDNSRecord = async (
  serverName: string,
  ipAddress: string
): Promise<boolean> => {
  const response: DataSnapshot = await db
    .ref("dns")
    .orderByChild("ip")
    .equalTo(ipAddress)
    .once("value");

  const dnsRecords: DNS = response.val();

  if (!dnsRecords) {
    logging.info("DNS record creation allowed: true");
    return true;
  }

  const dnsNames: string[] = Object.values(dnsRecords)
    .map((record: DNSRecord) => (re.test(record.name) ? record.name : ""))
    .filter(Boolean);

  const isAllowed: boolean = !Boolean(dnsNames.length);

  logging.info("DNS record creation allowed:", isAllowed);
  return isAllowed;
};

const createDNSRecord = async (
  serverName: string,
  ipAddress: string
): Promise<void> => {
  const isAllowed: boolean = await allowCreateDNSRecord(serverName, ipAddress);

  if (!isAllowed) throw new Error(`${ipAddress} has already a DNS record`);

  await db.ref("dns").push().set({
    ip: ipAddress,
    name: serverName,
  });

  logging.info(`DNS record created for ${serverName} :=> ${ipAddress}`);
};

(async () => {
  try {
    const serverID: number = await getNewServerID();
    await setupVHost(serverID);
    const ipAddress: string = await getIPAddress();
    const serverName: string = `niwder-files-${serverID}.niweera.gq`;
    await createDNSRecord(serverName, ipAddress);
    process.exit(0);
  } catch (e) {
    logging.error(e);
    process.exit(0);
  }
})();
