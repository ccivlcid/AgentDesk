/**
 * kill-port.mjs — dev 서버 시작 전 8790 포트를 점유한 프로세스를 종료합니다.
 * Windows / macOS / Linux 지원.
 */
import { execSync } from "node:child_process";

const PORT = 8790;

try {
  if (process.platform === "win32") {
    // netstat로 PID 찾기
    const output = execSync(`netstat -ano`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    const lines = output.split("\n");
    const pidSet = new Set();
    for (const line of lines) {
      if (line.includes(`:${PORT}`) && line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") pidSet.add(pid);
      }
    }
    for (const pid of pidSet) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`[kill-port] killed PID ${pid} (was using port ${PORT})`);
      } catch { /* already gone */ }
    }
  } else {
    // macOS / Linux: lsof
    try {
      const output = execSync(`lsof -ti tcp:${PORT}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
      const pids = output.trim().split("\n").filter(Boolean);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          console.log(`[kill-port] killed PID ${pid} (was using port ${PORT})`);
        } catch { /* already gone */ }
      }
    } catch { /* no process found */ }
  }
} catch (err) {
  // non-fatal: don't block dev startup
  console.warn(`[kill-port] warning: ${err.message}`);
}
