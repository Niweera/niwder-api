import LogDNAWinston from "logdna-winston";
import os from "os";
import winston, { Logger } from "winston";
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

const createLogger = (app: string): Logger => {
  const logDNAWinston: any = new LogDNAWinston({
    key: keys.LOGDNA_INGESTION_KEY,
    hostname: os.hostname(),
    ip: ip,
    mac: mac,
    app: app,
    handleExceptions: true,
    env: "Production",
    level: "debug",
    indexMeta: true,
  });

  const transform = winston.format((info) => {
    info.message = `${info.message} ${(info[SPLAT as any] || []).join(" ")}`;
    return info;
  });

  return winston.createLogger({
    level: "debug",
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(transform(), winston.format.simple()),
      }),
      logDNAWinston,
    ],
    exitOnError: false,
  });
};

export const WorkerLogger: Logger = createLogger("Niwder-Worker");

export const DBWorkerLogger: Logger = createLogger("Niwder-DBWorker");

export const TorrentsWorkerLogger: Logger = createLogger(
  "Niwder-Torrents-Worker"
);
