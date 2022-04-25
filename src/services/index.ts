import keys from "../keys";
import IORedis from "ioredis";
import { Job, Queue } from "bullmq";
import { createHash } from "crypto";

const connection: IORedis.Redis = new IORedis(keys.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const mainQueue: Queue = new Queue(keys.MAIN_QUEUE, { connection });
const torrentsQueue: Queue = new Queue(keys.TORRENTS_QUEUE, { connection });

export default class Service {
  queueJob = async (
    url: string,
    uid: string,
    workerQueue: Queue,
    queueName: string,
    kwargs?: Record<string, any>
  ): Promise<Job> => {
    const name: string = createHash("sha256")
      .update(url)
      .digest("hex")
      .slice(0, 10);
    return await workerQueue.add(name, {
      queue: queueName,
      url,
      uid,
      ...kwargs,
    });
  };

  serve = async (
    url: string,
    uid: string,
    queueName: string,
    kwargs?: Record<string, any>
  ): Promise<void> => {
    const job: Job = await this.queueJob(
      url,
      uid,
      mainQueue,
      queueName,
      kwargs
    );
    console.log(`job added [${job.name}] [${url}]`);
  };

  queueTorrents = async (
    url: string,
    uid: string,
    queueName: string,
    kwargs?: Record<string, any>
  ): Promise<void> => {
    const job: Job = await this.queueJob(
      url,
      uid,
      torrentsQueue,
      queueName,
      kwargs
    );
    console.log(`job added [${job.name}] [${url}]`);
  };
}
