module.exports = {
  apps: [
    {
      name: "niwder-api",
      script: "./dist/src/index.js",
      args: ["--color"],
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "niwder-worker",
      script: "./dist/src/worker/index.js",
      args: ["--color"],
      instances: "max",
      exec_mode: "cluster",
    },
  ],
};
