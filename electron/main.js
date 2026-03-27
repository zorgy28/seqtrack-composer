const { app, BrowserWindow, session, shell, Menu } = require("electron");
const path = require("path");
const { createServer } = require("http");
const next = require("next");

// ─── M3 GPU Optimization Flags ──────────────────────────────────
// MUST be set before app.whenReady() — Chromium reads these at GPU process init.

// Force GPU rasterization for all 2D content (CSS, Canvas, SVG).
// On M3, this offloads waveform/spectrum/landmark canvas to the 10-core GPU.
app.commandLine.appendSwitch("enable-gpu-rasterization");

// Enable zero-copy texture uploads. On Apple Silicon's unified memory (UMA),
// CPU and GPU share the same RAM — this eliminates redundant memcpy operations.
app.commandLine.appendSwitch("enable-zero-copy");

// Use IOSurface (macOS native GPU memory primitive) for compositing buffers.
// Eliminates format conversion when Chromium's compositor hands off to the window server.
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");

// Use Metal ANGLE backend directly — skip OpenGL-to-Metal translation layer.
// On M3, this uses the Metal 3 driver directly with lower command buffer overhead.
app.commandLine.appendSwitch("use-angle", "metal");

// Metal: native Metal GPU backend
// CanvasOopRasterization: move Canvas 2D ops to GPU process (frees renderer main thread)
// SkiaGraphite: next-gen Skia backend built on Metal (not translated from OpenGL)
app.commandLine.appendSwitch(
  "enable-features",
  "Metal,CanvasOopRasterization,SkiaGraphite"
);

// Hardware-accelerated video decode for any media playback
app.commandLine.appendSwitch("enable-accelerated-video-decode");

// ─── App State ──────────────────────────────────────────────────

let mainWindow = null;
let nextApp = null;
let serverPort = 3000;

const isDev = !app.isPackaged;

// ─── Next.js Server ─────────────────────────────────────────────

async function startNextServer() {
  const dir = isDev ? process.cwd() : path.join(app.getAppPath(), "..");

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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
