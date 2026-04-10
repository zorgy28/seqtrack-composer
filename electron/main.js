const { app, BrowserWindow, session, shell, Menu, ipcMain, powerSaveBlocker } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { createServer } = require("http");
const next = require("next");

// ─── GPU Optimization Flags ─────────────────────────────────────
// MUST be set before app.whenReady() — Chromium reads these at GPU process init.

// These flags are safe on all macOS hardware
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-accelerated-video-decode");

// Apple Silicon (arm64) specific: Metal-native rendering pipeline
// These flags use hard overrides that bypass fallback — unsafe on Intel x64 GPUs
if (process.arch === "arm64") {
  // Zero-copy texture uploads: UMA means CPU+GPU share the same RAM
  app.commandLine.appendSwitch("enable-zero-copy");
  // Use IOSurface (macOS native GPU memory primitive) for compositing
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
  // Metal ANGLE backend directly — skip OpenGL-to-Metal translation layer
  app.commandLine.appendSwitch("use-angle", "metal");
  // Metal: native GPU backend
  // CanvasOopRasterization: move Canvas 2D ops to GPU process
  // SkiaGraphite: next-gen Skia backend built on Metal
  app.commandLine.appendSwitch(
    "enable-features",
    "Metal,CanvasOopRasterization,SkiaGraphite"
  );
}

// ─── App State ──────────────────────────────────────────────────

let mainWindow = null;
let nextApp = null;
let httpServer = null;
let serverPort = 3000;

const isDev = !app.isPackaged;

// ─── Next.js Server ─────────────────────────────────────────────

async function startNextServer() {
  const dir = isDev ? process.cwd() : app.getAppPath();

  nextApp = next({
    dev: isDev,
    dir,
    quiet: !isDev,
  });

  await nextApp.prepare();

  const handle = nextApp.getRequestHandler();
  const server = createServer((req, res) => handle(req, res));

  return new Promise((resolve) => {
    // Use port 0 to get a random available port in production,
    // fixed 3000 in dev to match Next.js default
    const port = isDev ? 3000 : 0;
    server.listen(port, "127.0.0.1", () => {
      serverPort = server.address().port;
      httpServer = server;
      console.log(`[SeqTrack] Next.js server ready on http://127.0.0.1:${serverPort}`);
      resolve(server);
    });
  });
}

// ─── Window Creation ────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Keep timing worker at full speed
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── Permissions ────────────────────────────────────────────────

function setupPermissions() {
  // Auto-grant MIDI, SysEx, camera, and audio permissions
  // (eliminates browser permission prompts)
  const allowedPermissions = ["midi", "midiSysex", "media"];

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(allowedPermissions.includes(permission));
    }
  );

  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      return allowedPermissions.includes(permission);
    }
  );
}

// ─── macOS Menu ─────────────────────────────────────────────────

function setupMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(async () => {
  setupPermissions();
  setupMenu();

  if (isDev) {
    // In dev mode, wait for the external Next.js dev server
    const waitOn = require("wait-on");
    try {
      await waitOn({ resources: ["http://127.0.0.1:3000"], timeout: 30000 });
      serverPort = 3000;
    } catch {
      console.error("[SeqTrack] Next.js dev server not available on port 3000");
      app.quit();
      return;
    }
  } else {
    // In production, start embedded Next.js server
    await startNextServer();
  }

  createWindow();

  app.on("activate", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ---------------------------------------------------------------------------
// IPC: Settings persistence to ~/Library/Preferences/
// ---------------------------------------------------------------------------
const PREFS_FILE = path.join(
  os.homedir(),
  "Library",
  "Preferences",
  "com.taktik.seqtrack-composer.json"
);

ipcMain.handle("read-prefs", async () => {
  try {
    const data = fs.readFileSync(PREFS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
});

ipcMain.handle("write-prefs", async (_event, data) => {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[prefs] Failed to write preferences:", err);
    return false;
  }
});

// ---------------------------------------------------------------------------
// IPC: Power save blocker for MIDI playback
// Uses Electron's powerSaveBlocker instead of Screen Wake Lock API — more
// reliable, prevents CPU suspension even when screen is off.
// ---------------------------------------------------------------------------
ipcMain.handle("power-save-start", () => {
  return powerSaveBlocker.start("prevent-app-suspension");
});

ipcMain.handle("power-save-stop", (_event, id) => {
  if (powerSaveBlocker.isStarted(id)) {
    powerSaveBlocker.stop(id);
  }
});

// Send MIDI panic (All Notes Off) before quitting to prevent stuck notes on SEQTRAK
app.on("before-quit", (e) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app-before-quit");
  }
});

app.on("window-all-closed", () => {
  // Close the embedded Next.js server before quitting
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  app.quit();
});
