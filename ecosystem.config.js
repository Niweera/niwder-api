module.exports = {
  apps: [
    {
      name: "na",
      script: "./dist/src/index.js",
      args: ["--color"],
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "nw",
      script: "./dist/src/worker/index.js",
      args: ["--color"],
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "ntw",
      script: "./dist/src/worker/TorrentsWorker/index.js",
      args: ["--color"],
      instances: "1",
      exec_mode: "cluster",
    },
  ],
};
