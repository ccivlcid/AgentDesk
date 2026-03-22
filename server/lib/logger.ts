import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const logsDir = process.env.LOGS_DIR ?? path.join(process.cwd(), "logs");

// Ensure logs directory exists
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // ignore
}

const logFilePath = path.join(logsDir, "server.log");

// Resolve pino-pretty absolute path for pino.transport (pnpm strict resolution)
let pinoPrettyPath = "pino-pretty";
try {
  const req = createRequire(import.meta.url);
  pinoPrettyPath = req.resolve("pino-pretty");
} catch {
  // fallback
}

const logger = isDev
  ? pino(
      { level: process.env.LOG_LEVEL ?? "debug" },
      pino.transport({
        targets: [
          // Console: colorized pretty output
          {
            target: pinoPrettyPath,
            options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            level: process.env.LOG_LEVEL ?? "debug",
          },
          // File: plain-text pretty output (no color codes)
          {
            target: pinoPrettyPath,
            options: {
              colorize: false,
              translateTime: "yyyy-mm-dd HH:MM:ss",
              ignore: "pid,hostname",
              destination: logFilePath,
              mkdir: true,
            },
            level: process.env.LOG_LEVEL ?? "debug",
          },
        ],
      }),
    )
  : pino(
      { level: process.env.LOG_LEVEL ?? "info" },
      pino.destination({ dest: logFilePath, mkdir: true, sync: false }),
    );

export default logger;
