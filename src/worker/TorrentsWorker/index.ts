import IORedis from "ioredis";
import keys from "../../keys";
import { Job, Worker } from "bullmq";
import TorrentsToGDriveWorker from "./TorrentsToGDriveWorker";
import TorrentsToMegaWorker from "./TorrentsToMegaWorker";
import TorrentsToDirectWorker from "./TorrentsToDirectWorker";
import FCMService from "../FCMService";

const connection: IORedis.Redis = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker: Worker = new Worker(
  keys.TORRENTS_QUEUE,
  async (job: Job) => {
    try {
      switch (job.data.queue) {
        case keys.TORRENTS_TO_GDRIVE_QUEUE: {
          const torrentsToGDriveWorker: TorrentsToGDriveWorker =
            new TorrentsToGDriveWorker(job);
          await torrentsToGDriveWorker.run();
          break;
        }
        case keys.TORRENTS_TO_MEGA_QUEUE: {
          const torrentsToMegaWorker: TorrentsToMegaWorker =
            new TorrentsToMegaWorker(job);
          await torrentsToMegaWorker.run();
          break;
        }
        case keys.TORRENTS_TO_DIRECT_QUEUE: {
          const torrentsToDirectWorker: TorrentsToDirectWorker =
            new TorrentsToDirectWorker(job);
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
  console.log(keys.TORRENTS_QUEUE, job.name, job.data.url, "active");
});

worker.on("closed", () => {
  console.log(keys.TORRENTS_QUEUE, "closed");
});

worker.on("closing", () => {
  console.log(keys.TORRENTS_QUEUE, "closing");
});

worker.on("completed", (job: Job) => {
  console.log(keys.TORRENTS_QUEUE, job.name, job.data.url, "completed");
});

worker.on("drained", () => {
  console.log(keys.TORRENTS_QUEUE, "drained");
});

worker.on("error", (error: Error) => {
  console.error(keys.TORRENTS_QUEUE, "[-]", error.message);
});

worker.on("failed", async (job: Job, error: Error) => {
  const fcmService: FCMService = new FCMService(job.data.uid);
  await fcmService.sendErrorMessage({
    job: job.data.url,
    error: error.message,
  });
  console.log(
    keys.TORRENTS_QUEUE,
    job.name,
    job.data.url,
    "[-]",
    error.message
  );
});

worker.on("progress", (job: Job, progress: number) => {
  console.log(keys.TORRENTS_QUEUE, job.name, job.data.url, progress);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
