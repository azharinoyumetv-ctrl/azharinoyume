module.exports = {
  apps: [
    {
      name: "azyume-render-service",
      script: "node_modules/.bin/tsx",
      args: "src/server.ts",
      cwd: "/opt/azyume-render-service",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        RENDER_SERVICE_PORT: process.env.AZYUME_RENDER_PORT || 4100,
        NODE_OPTIONS: "--max-old-space-size=4096",
      },
      max_memory_restart: "3G",
      restart_delay: 5000,
      watch: false,
      kill_timeout: 60000,
    },
  ],
};
