module.exports = {
  apps: [
    {
      name: "niwder-api",
      script: "./dist/src/index.js",
      args: ["--color"],
      exec_mode: "fork",
      instances: 1,
    },
    {
      name: "niwder-worker",
      script: "./dist/src/worker/index.js",
      args: ["--color"],
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
