module.exports = {
  apps: [
    {
      name: "azharinoyume-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/azharinoyume",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
      watch: false,
    },
    {
      name: "azharinoyume-worker",
      script: "node_modules/.bin/tsx",
      args: "src/worker.ts",
      cwd: "/var/www/azharinoyume",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      restart_delay: 5000,
      watch: false,
    },
  ],
};
