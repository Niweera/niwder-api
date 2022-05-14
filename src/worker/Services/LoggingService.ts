import LogDNAWinston from "logdna-winston";
import os from "os";
import winston, { Logform } from "winston";
import macAddress from "macaddress";
import getIPAddress from "../../utilities/getIPAddress";
import keys from "../../keys";
import { SPLAT } from "triple-beam";

let ip: string = "192.168.1.1";
let mac: string = "00:00:00:00:00:00";

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

export default winston.createLogger({
  level: "debug",
  transports: [new winston.transports.Console(), logDNAWinston],
  format: winston.format.combine(transform(), winston.format.simple()),
  exitOnError: false,
});
