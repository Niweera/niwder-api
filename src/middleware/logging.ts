import LogDNAWinston from "logdna-winston";
import ExpressWinston from "express-winston";
import keys from "../keys";
import os from "os";
import type { Application, RequestHandler, ErrorRequestHandler } from "express";
import winston from "winston";
import getIPAddress from "../utilities/getIPAddress";
import macAddress from "macaddress";

let ip: string = "192.168.1.1"; //placeholder IP address is set (small price to pay until Express v5)
let mac: string = "00:00:00:00:00:00"; //placeholder MAC address is set (small price to pay until Express v5)

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
  app: "Niwder-API",
  handleExceptions: true,
  env: "Production",
  level: "debug",
  indexMeta: true,
});

export default winston.createLogger({
  level: "debug",
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    logDNAWinston,
  ],
  exitOnError: false,
});

const options = {
  transports: [logDNAWinston],
};

export const WinstonLogger = (app: Application): void => {
  const logger: RequestHandler = ExpressWinston.logger(options);
  app.use(logger);
};

export const WinstonErrorLogger = (app: Application): void => {
  const errorLogger: ErrorRequestHandler = ExpressWinston.errorLogger(options);
  app.use(errorLogger);
};
