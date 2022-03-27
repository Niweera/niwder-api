import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import keys from "../keys";
import MegaToGDriveWorker from "./MegaToGDriveWorker";

const connection = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker: Worker = new Worker(
  keys.MAIN_QUEUE,
  async (job: Job) => {
    switch (job.data.queue) {
      case keys.MEGA_TO_GDRIVE_QUEUE: {
        const megaToGDriveWorker: MegaToGDriveWorker = new MegaToGDriveWorker(
          job
        );
        return await megaToGDriveWorker.run();
      }
      default: {
        return;
      }
    }
  },
  { connection }
);

worker.on("completed", (job: Job) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, "completed");
});

worker.on("progress", (job: Job, progress: number) => {
  console.log(keys.MAIN_QUEUE, job.name, job.data.url, progress);
});

worker.on("error", (err) => {
  console.error(keys.MAIN_QUEUE, err);
});
