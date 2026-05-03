const path = require("path");

module.exports = {
  apps: [
    {
      name: "vorixen",
      cwd: __dirname,
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "512M",
      out_file: path.join(__dirname, "logs", "pm2-out.log"),
      error_file: path.join(__dirname, "logs", "pm2-error.log"),
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 3000
      }
    }
  ]
};
