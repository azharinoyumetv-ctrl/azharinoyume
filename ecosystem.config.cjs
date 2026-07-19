module.exports = {
  apps: [
    {
      name: "azyume-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/azharinoyume",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379/1",
      },
      max_memory_restart: "768M",
      restart_delay: 3000,
      watch: false,
    },
    {
      name: "azyume-worker",
      script: "node_modules/.bin/tsx",
      args: "src/worker.ts",
      cwd: "/var/www/azharinoyume",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379/1",
      },
      max_memory_restart: "768M",
      restart_delay: 5000,
      watch: false,
      kill_timeout: 120000,
    },
  ],
};
