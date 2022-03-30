import keys from "../keys";
import IORedis from "ioredis";
import { Job, Queue } from "bullmq";
import { createHash } from "crypto";

const connection = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const queue = new Queue(keys.MAIN_QUEUE, { connection });

export default class Service {
  megaToGDrive = async (url: string, uid: string): Promise<void> => {
    const name: string = createHash("sha256")
      .update(url)
      .digest("hex")
      .slice(0, 10);
    const job: Job = await queue.add(name, {
      queue: keys.MEGA_TO_GDRIVE_QUEUE,
      url,
      uid,
    });
    console.log(`job added [${job.name}] [${url}]`);
  };

  gDriveToMega = async (url: string, uid: string): Promise<void> => {
    const name: string = createHash("sha256")
      .update(url)
      .digest("hex")
      .slice(0, 10);
    const job: Job = await queue.add(name, {
      queue: keys.GDRIVE_TO_MEGA_QUEUE,
      url,
      uid,
    });
    console.log(`job added [${job.name}] [${url}]`);
  };
}
