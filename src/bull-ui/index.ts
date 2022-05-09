import { Queue } from "bullmq";
import IORedis from "ioredis";
import keys from "../keys";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Application } from "express";
import basicAuth from "express-basic-auth";

export default (app: Application): void => {
  const connection: IORedis.Redis = new IORedis(keys.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const mainQueue: Queue = new Queue(keys.MAIN_QUEUE, { connection });
  const torrentsQueue: Queue = new Queue(keys.TORRENTS_QUEUE, { connection });

  const serverAdapter: ExpressAdapter = new ExpressAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(mainQueue), new BullMQAdapter(torrentsQueue)],
    serverAdapter: serverAdapter,
  });

  serverAdapter.setBasePath("/api/bull-ui");
  app.use(
    "/api/bull-ui",
    basicAuth({
      users: { [keys.BULL_UI_USERNAME]: keys.BULL_UI_PASSWORD },
      challenge: true,
      realm: "bull-dashboard",
      unauthorizedResponse: () => ({
        message:
          "This route is only meant for the operators of Niwder.io. If you don't know the username and password why are you here?",
      }),
    })
  );
  app.use("/api/bull-ui", serverAdapter.getRouter());
};
