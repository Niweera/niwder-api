import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import keys from "../keys";
import MegaToGDriveWorker from "./MegaToGDriveWorker";
import GDriveToMegaWorker from "./GDriveToMegaWorker";
import DirectToGDriveWorker from "./DirectToGDriveWorker";

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

worker
  .on("completed", (job: Job) => {
    console.log(keys.MAIN_QUEUE, job.name, job.data.url, "completed");
  })
  .on("progress", (job: Job, progress: number) => {
    console.log(keys.MAIN_QUEUE, job.name, job.data.url, progress);
  })
  .on("error", (err) => {
    console.error(keys.MAIN_QUEUE, err);
  });
