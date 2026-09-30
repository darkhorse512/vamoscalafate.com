/**
 * PM2 process configuration.
 *
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save                 # persist across reboots
 *   pm2 startup              # print the systemd unit command to run once
 *
 * Both apps run the standalone server produced by `pnpm build`, NOT
 * `next start` - Next.js does not support `next start` with
 * `output: 'standalone'`.
 *
 * `.cjs` because the repo's package.json does not set "type": "module" but
 * PM2 config is CommonJS regardless; the explicit extension avoids ambiguity.
 */

const path = require('node:path')

const ROOT = __dirname

/** Shared settings. */
const common = {
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  // A process that restarts more than 10 times is broken, not flaky -
  // stop flapping and leave it down so the failure is visible.
  max_restarts: 10,
  min_uptime: '20s',
  restart_delay: 4000,
  // Restart if RSS grows past this; catches a slow leak before the VPS OOMs.
  max_memory_restart: '600M',
  // Give in-flight requests (a payment webhook, say) time to finish.
  kill_timeout: 10000,
  listen_timeout: 15000,
  wait_ready: false,
  merge_logs: true,
  // The app logs structured JSON with its own timestamp; PM2 adding a second
  // one would corrupt each line for a log shipper.
  time: false,
  watch: false,
}

module.exports = {
  apps: [
    {
      ...common,
      name: 'vamoscalafate-web',
      cwd: path.join(ROOT, 'web'),
      script: path.join(ROOT, 'web', '.next', 'standalone', 'web', 'server.js'),
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Binding to loopback only: Nginx is the sole entry point, and the
        // Node port must never be reachable from the Internet.
        HOSTNAME: '127.0.0.1',
      },
      out_file: '/var/log/vamoscalafate/web.out.log',
      error_file: '/var/log/vamoscalafate/web.err.log',
    },
    {
      ...common,
      name: 'vamoscalafate-admin',
      cwd: path.join(ROOT, 'admin'),
      script: path.join(ROOT, 'admin', '.next', 'standalone', 'admin', 'server.js'),
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
      },
      out_file: '/var/log/vamoscalafate/admin.out.log',
      error_file: '/var/log/vamoscalafate/admin.err.log',
    },
  ],
}
