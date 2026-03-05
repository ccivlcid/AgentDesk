/**
 * AgentDesk Electron main process.
 * Starts the bundled server in-process, then opens a window to http://127.0.0.1:8790
 * Logs: packaged exe → <exe 디렉터리>/logs, 개발 시 → userData/logs
 */
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const PORT = Number(process.env.PORT) || 8790;
const HOST = "127.0.0.1";

let logStream = null;

function ensureLogDir() {
  // 패키징된 exe: exe가 있는 폴더/logs (옮겨서 써도 그 폴더에 생성)
  const baseDir = app.isPackaged
    ? path.dirname(app.getPath("exe"))
    : app.getPath("userData");
  const logDir = path.join(baseDir, "logs");
  try {
    fs.mkdirSync(logDir, { recursive: true });
    return logDir;
  } catch (e) {
    return null;
  }
}

function log(message, level = "INFO") {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}\n`;
  if (logStream && logStream.writable) {
    logStream.write(line);
  }
  if (level !== "INFO" || process.env.AGENTDESK_DEBUG) {
    console.error(line.trim());
  }
}

function initLog() {
  const logDir = ensureLogDir();
  if (!logDir) return;
  const logPath = path.join(logDir, "agentdesk-main.log");
  try {
    logStream = fs.createWriteStream(logPath, { flags: "a" });
    log(`AgentDesk starting (version ${app.getVersion()})`);
  } catch (e) {
    console.error("[AgentDesk] Could not open log file:", e);
  }
}

function waitForServer(maxAttempts = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      const req = http.get(`http://${HOST}:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        tryNext();
      });
      req.on("error", tryNext);
      req.setTimeout(2000, () => {
        req.destroy();
        tryNext();
      });
    };
    function tryNext() {
      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error("Server did not become ready in time"));
        return;
      }
      setTimeout(tick, intervalMs);
    }
    tick();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL(`http://${HOST}:${PORT}`);
  win.on("closed", () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  initLog();
  const appPath = app.getAppPath();
  // When running from electron-builder package, appPath is resources/app or resources/app.asar
  process.env.AGENTDESK_SERVER_DIR = path.join(appPath, "dist-server");
  process.env.AGENTDESK_DIST_DIR = path.join(appPath, "dist");
  process.env.AGENTDESK_VERSION = app.getVersion();
  process.env.HOST = HOST;

  // asarUnpack된 node_modules(sharp) + asar 내 node_modules(sharp 의존성 detect-libc 등)를 require 경로에 추가
  if (app.isPackaged) {
    const unpackedNodeModules = path.join(process.resourcesPath, "app.asar.unpacked", "node_modules");
    const asarNodeModules = path.join(appPath, "node_modules");
    if (fs.existsSync(unpackedNodeModules)) module.paths.unshift(unpackedNodeModules);
    if (fs.existsSync(asarNodeModules)) module.paths.unshift(asarNodeModules);
    const sharpPath = path.join(unpackedNodeModules, "sharp");
    if (fs.existsSync(sharpPath)) {
      try {
        require(sharpPath);
      } catch (e) {
        log(`Pre-load sharp failed: ${e && e.message}`, "ERROR");
      }
    }
  }

  const serverPath = path.join(appPath, "dist-server", "agentdesk-server.cjs");
  try {
    require(serverPath);
    log("Server module loaded");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    log(`Failed to start server: ${msg}`, "ERROR");
    if (stack) log(stack, "ERROR");
    const logDir = ensureLogDir();
    const logHint = logDir ? `\n\n로그: ${path.join(logDir, "agentdesk-main.log")}` : "";
    dialog.showErrorBox("AgentDesk", `서버를 시작할 수 없습니다.\n\n${msg}${logHint}`);
    app.quit();
    return;
  }

  waitForServer()
    .then(() => {
      log("Server ready, opening window");
      createWindow();
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : "";
      log(`Server health check failed: ${msg}`, "ERROR");
      if (stack) log(stack, "ERROR");
      const logDir = ensureLogDir();
      const logHint = logDir ? `\n\n로그: ${path.join(logDir, "agentdesk-main.log")}` : "";
      dialog.showErrorBox("AgentDesk", `서버가 준비되지 않았습니다.\n\n${msg}${logHint}`);
      app.quit();
    });
});

app.on("window-all-closed", () => {
  app.quit();
});
