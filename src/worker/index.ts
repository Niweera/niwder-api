import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import keys from "../keys";
import MegaToGDriveWorker from "./Workers/MegaToGDriveWorker";
import GDriveToMegaWorker from "./Workers/GDriveToMegaWorker";
import DirectToGDriveWorker from "./Workers/DirectToGDriveWorker";
import DirectToMegaWorker from "./Workers/DirectToMegaWorker";
import GDriveToDirectWorker from "./Workers/GDriveToDirectWorker";
import MegaToDirectWorker from "./Workers/MegaToDirectWorker";
import FCMService from "./Services/FCMService";
import { WorkerLogger as logging } from "./Services/LoggingService";

const connection: IORedis.Redis = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker: Worker = new Worker(
  keys.MAIN_QUEUE,
  async (job: Job) => {
    try {
      switch (job.data.queue) {
        case keys.MEGA_TO_GDRIVE_QUEUE: {
          const megaToGDriveWorker: MegaToGDriveWorker = new MegaToGDriveWorker(
            job
          );
          await megaToGDriveWorker.run();
          break;
        }
        case keys.GDRIVE_TO_MEGA_QUEUE: {
          const gDriveToMegaWorker: GDriveToMegaWorker = new GDriveToMegaWorker(
            job
          );
          await gDriveToMegaWorker.run();
          break;
        }
        case keys.DIRECT_TO_GDRIVE_QUEUE: {
          const directToGDriveWorker: DirectToGDriveWorker =
            new DirectToGDriveWorker(job);
          await directToGDriveWorker.run();
          break;
        }
        case keys.DIRECT_TO_MEGA_QUEUE: {
          const directToMegaWorker: DirectToMegaWorker = new DirectToMegaWorker(
            job
          );
          await directToMegaWorker.run();
          break;
        }
        case keys.GDRIVE_TO_DIRECT_QUEUE: {
          const gDriveToDirectWorker: GDriveToDirectWorker =
            new GDriveToDirectWorker(job);
          await gDriveToDirectWorker.run();
          break;
        }
        case keys.MEGA_TO_DIRECT_QUEUE: {
          const megaToDirectWorker: MegaToDirectWorker = new MegaToDirectWorker(
            job
          );
          await megaToDirectWorker.run();
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
  logging.info(keys.MAIN_QUEUE, job.name, job.data.url, "active");
});

worker.on("closed", () => {
  logging.info(keys.MAIN_QUEUE, "closed");
});

worker.on("closing", () => {
  logging.info(keys.MAIN_QUEUE, "closing");
});

worker.on("completed", (job: Job) => {
  logging.info(keys.MAIN_QUEUE, job.name, job.data.url, "completed");
});

worker.on("drained", () => {
  logging.info(keys.MAIN_QUEUE, "is empty");
});

worker.on("error", (error: Error) => {
  logging.error(keys.MAIN_QUEUE, "[-]", error.message);
});

worker.on("failed", async (job: Job, error: Error) => {
  const fcmService: FCMService = new FCMService(job.data.uid, logging);
  await fcmService.sendErrorMessage({
    job: job.data.url,
    error: error.message,
  });
  logging.info(keys.MAIN_QUEUE, job.name, job.data.url, "[-]", error.message);
});

worker.on("progress", (job: Job, progress: number) => {
  logging.info(keys.MAIN_QUEUE, job.name, job.data.url, progress);
});

const shutDownWorker = async () => {
  await worker.close(true);
  process.exit(0);
};

process.on("uncaughtException", (err: Error) => {
  logging.error("Uncaught exception:", err.message);
});
process.on("SIGINT", shutDownWorker);
process.on("SIGTERM", shutDownWorker);
