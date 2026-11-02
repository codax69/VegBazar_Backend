module.exports = {
  apps: [
    {
      name: "vegbazar-backend",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      node_args: "--max-old-space-size=384",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
