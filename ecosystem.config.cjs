/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)\s*$/);
    if (!match) continue;

    const [, key] = match;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvironmentFile(path.join(__dirname, ".env"));

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
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379/1",
        XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY,
        XENDIT_WEBHOOK_SECRET: process.env.XENDIT_WEBHOOK_SECRET,
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
