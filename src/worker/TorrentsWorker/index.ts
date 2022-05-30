import IORedis from "ioredis";
import keys from "../../keys";
import { Job, Worker } from "bullmq";
import TorrentsToGDriveWorker from "./TorrentsToGDriveWorker";
import TorrentsToMegaWorker from "./TorrentsToMegaWorker";
import TorrentsToDirectWorker from "./TorrentsToDirectWorker";
import FCMService from "../Services/FCMService";
import WebTorrent, { Instance } from "webtorrent";
import FirebaseService from "../Services/FirebaseService";
import logging from "../Services/LoggingService";
import DBService from "../Services/DBService";

const connection: IORedis.Redis = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const client: Instance = new WebTorrent();

const worker: Worker = new Worker(
  keys.TORRENTS_QUEUE,
  async (job: Job) => {
    try {
      FirebaseService.attachInterruptionsListener(
        DBService.listenToInterruptions(worker, job)
      );

      switch (job.data.queue) {
        case keys.TORRENTS_TO_GDRIVE_QUEUE: {
          const torrentsToGDriveWorker: TorrentsToGDriveWorker =
            new TorrentsToGDriveWorker(job, client);
          await torrentsToGDriveWorker.run();
          break;
        }
        case keys.TORRENTS_TO_MEGA_QUEUE: {
          const torrentsToMegaWorker: TorrentsToMegaWorker =
            new TorrentsToMegaWorker(job, client);
          await torrentsToMegaWorker.run();
          break;
        }
        case keys.TORRENTS_TO_DIRECT_QUEUE: {
          const torrentsToDirectWorker: TorrentsToDirectWorker =
            new TorrentsToDirectWorker(job, client);
          await torrentsToDirectWorker.run();
          break;
        }
        default: {
          break;
        }
      }
    } catch (e) {
      throw e;
    }
  },
  { connection }
);

worker.on("active", (job: Job) => {
  logging.info(keys.TORRENTS_QUEUE, job.name, job.data.url, "active");
});

worker.on("closed", () => {
  logging.info(keys.TORRENTS_QUEUE, "closed");
});

worker.on("closing", () => {
  logging.info(keys.TORRENTS_QUEUE, "closing");
});

worker.on("completed", (job: Job) => {
  logging.info(keys.TORRENTS_QUEUE, job.name, job.data.url, "completed");
  FirebaseService.removeInterruptionsListeners();
});

worker.on("drained", () => {
  logging.info(keys.TORRENTS_QUEUE, "is empty");
});

worker.on("error", (error: Error) => {
  logging.error(keys.TORRENTS_QUEUE, "[-]", error.message);
});

worker.on("failed", async (job: Job, error: Error) => {
  const fcmService: FCMService = new FCMService(job.data.uid);
  await fcmService.sendErrorMessage({
    job: job.data.url,
    error: error.message,
  });

  const firebaseService: FirebaseService = new FirebaseService(
    job,
    job.data.queue
  );
  await firebaseService.removeTransferring();

  logging.error(
    keys.TORRENTS_QUEUE,
    job.name,
    job.data.url,
    "[-]",
    error.message
  );
  FirebaseService.removeInterruptionsListeners();
});

worker.on("progress", (job: Job, progress: number) => {
  logging.info(keys.TORRENTS_QUEUE, job.name, progress);
});

const shutDownTorrentsWorker = async () => {
  FirebaseService.removeInterruptionsListeners();
  await worker.close(true);
  client.destroy(async (error: Error) => {
    if (error) logging.error(error.message);
    logging.info("WebTorrent client destroyed");
    process.exit(0);
  });
};

process.on("uncaughtException", (err: Error) => {
  logging.error("Uncaught exception:", err.message);
});
process.on("SIGINT", shutDownTorrentsWorker);
process.on("SIGTERM", shutDownTorrentsWorker);
