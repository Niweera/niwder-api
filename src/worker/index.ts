import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import keys from "../keys";
import MegaToGDriveWorker from "./MegaToGDriveWorker";
import GDriveToMegaWorker from "./GDriveToMegaWorker";
import DirectToGDriveWorker from "./DirectToGDriveWorker";
import DirectToMegaWorker from "./DirectToMegaWorker";

const connection = new IORedis(keys.REDIS_URL, {
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
        default: {
          break;
        }
      }
    } catch (e) {
      console.log(e.message);
    }
  },
  { connection }
);

worker.on("active", (job: Job) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, "active");
});

worker.on("closed", () => {
  console.log(keys.MAIN_QUEUE, "closed");
});

worker.on("closing", () => {
  console.log(keys.MAIN_QUEUE, "closing");
});

worker.on("completed", (job: Job) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, "completed");
});

worker.on("drained", () => {
  console.log(keys.MAIN_QUEUE, "drained");
});

worker.on("error", (err: Error) => {
  console.error(keys.MAIN_QUEUE, err);
});

worker.on("failed", (job: Job, error: Error) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, error);
});

worker.on("progress", (job: Job, progress: number) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, progress);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
