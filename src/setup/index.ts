import { renderFile } from "template-file";
import axios, { AxiosResponse } from "axios";
import { existsSync, writeFileSync } from "fs";
import * as firebase from "firebase-admin";
import * as serviceAccount from "../keys/serviceAccountKey.json";
import type { ServiceAccount } from "firebase-admin";
import { Database, getDatabase } from "firebase-admin/database";
import type { DataSnapshot } from "@firebase/database-types";

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
    console.log(`New ServerID: 0`);
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

  console.log(`New ServerID: ${newServerID}`);
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
  console.log("VHost file created");
};

const getIPAddress = async (): Promise<string> => {
  const response: AxiosResponse = await axios.get(
    `https://api64.ipify.org?format=json`
  );

  const ipAddress: string = response.data.ip;
  console.log("ipAddress:", ipAddress);
  return ipAddress;
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
    console.log("DNS record creation allowed: true");
    return true;
  }

  const dnsNames: string[] = Object.values(dnsRecords)
    .map((record: DNSRecord) => (re.test(record.name) ? record.name : ""))
    .filter(Boolean);

  const isAllowed: boolean = !Boolean(dnsNames.length);

  console.log("DNS record creation allowed:", isAllowed);
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

  console.log(`DNS record created for ${serverName} :=> ${ipAddress}`);
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
    console.log(e);
    process.exit(0);
  }
})();
