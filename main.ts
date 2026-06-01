import { app, BrowserWindow, ipcMain, crashReporter } from 'electron';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { rm, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { hostname } from 'os';
import AutoLaunch from 'auto-launch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Packaged app uses `dist/`; dev uses `public/`. */
function resolveWindowIconPath(): string | undefined {
  const candidates = [
    join(__dirname, '../public/verisign-logo.png'),
    join(__dirname, '../dist/verisign-logo.png'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

// Enable crash reporting
crashReporter.start({
  productName: 'DigitalSignagePlayer',
  companyName: 'DigitalSignage',
  submitURL: '',
  uploadToServer: false,
});

// Configure auto-launch
const autoLauncher = new AutoLaunch({
  name: 'Digital Signage Player',
  path: app.getPath('exe'),
});

// Enable auto-launch
autoLauncher.enable().catch((err: Error) => {
  console.error('Auto-launch error:', err);
});

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Check if we're in development mode
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function createWindow() {
  // Create media cache directory if it doesn't exist
  const mediaCachePath = join(app.getPath('userData'), 'media-cache');
  if (!existsSync(mediaCachePath)) {
    mkdirSync(mediaCachePath, { recursive: true });
  }

  const windowIcon = resolveWindowIconPath();
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev, // Only fullscreen in production
    kiosk: !isDev, // Only kiosk mode in production
    frame: isDev, // Show frame in development
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false, // Don't show until ready
  });

  // Prevent window from being closed (only in production)
  if (!isDev) {
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        return false;
      }
    });

    // Prevent minimize (only in production)
    mainWindow.on('minimize', (event: Electron.Event) => {
      event.preventDefault();
      mainWindow?.restore();
    });
  }

  // Add keyboard shortcut to exit in development (Ctrl+Shift+Q)
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'q') {
        isQuitting = true;
        app.quit();
      }
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load the app
  if (isDev) {
    // In development, connect to Vite dev server
    // Try common ports (Vite will use the first available)
    const tryPorts = ['5173', '5174', '5175', '5176'];
    let connected = false;
    
    const tryConnect = (portIndex: number) => {
      if (portIndex >= tryPorts.length) {
        if (!connected) {
          console.error('Vite dev server not found on any port');
          mainWindow?.loadURL(`data:text/html,<html><body style="font-family: Arial; padding: 20px; text-align: center;"><h1>Vite Dev Server Not Found</h1><p>Please run <code>npm run dev</code> in a terminal first.</p><p>Then restart this app.</p><p>Tried ports: ${tryPorts.join(', ')}</p></body></html>`);
        }
        return;
      }
      
      const port = tryPorts[portIndex];
      const devUrl = `http://localhost:${port}`;
      
      mainWindow?.loadURL(devUrl).then(() => {
        console.log(`✓ Connected to Vite dev server on port ${port}`);
        connected = true;
        mainWindow?.webContents.openDevTools();
      }).catch(() => {
        // Try next port
        tryConnect(portIndex + 1);
      });
    };
    
    // Start trying ports
    tryConnect(0);
  } else {
    // Production: load from dist
    const indexPath = join(__dirname, '../dist/index.html');
    if (existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('Production build not found. Run "npm run dist" first.');
      mainWindow.loadURL(`data:text/html,<html><body style="font-family: Arial; padding: 20px; text-align: center;"><h1>Build Not Found</h1><p>Please run <code>npm run dist</code> to build the app first.</p></body></html>`);
    }
  }

  // Handle window errors
  mainWindow.webContents.on('crashed', () => {
    console.error('Window crashed, reloading...');
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  // Handle unresponsive
  mainWindow.on('unresponsive', () => {
    console.error('Window unresponsive, reloading...');
    if (mainWindow) {
      mainWindow.reload();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Handle app crashes - restart automatically
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render process gone:', details);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.reload();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-player-fingerprints', () => {
  const userData = app.getPath('userData');
  const serial1 = createHash('sha256')
    .update(`${userData}|${hostname()}|${process.platform}`)
    .digest('hex')
    .slice(0, 32);
  const serial2 = createHash('sha256')
    .update(`${app.getVersion()}|${userData}`)
    .digest('hex')
    .slice(0, 32);
  return { serial1, serial2 };
});

ipcMain.handle('read-screen-code', async () => {
  const { readFileSync, existsSync } = await import('fs');
  const { join } = await import('path');
  const codePath = join(app.getPath('userData'), 'screen-code.json');
  
  if (existsSync(codePath)) {
    try {
      const data = JSON.parse(readFileSync(codePath, 'utf-8'));
      if (data.code && /^\d{6}$/.test(data.code)) {
        return data.code;
      }
    } catch (error) {
      console.error('Error reading screen code:', error);
    }
  }
  
  return null;
});

ipcMain.handle('save-screen-code', async (_, code: string) => {
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  const codePath = join(app.getPath('userData'), 'screen-code.json');
  
  try {
    writeFileSync(codePath, JSON.stringify({ code }), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving screen code:', error);
    return false;
  }
});

ipcMain.handle('get-media-cache-path', () => {
  return join(app.getPath('userData'), 'media-cache');
});

ipcMain.handle('clear-media-cache-dir', async () => {
  const cacheDir = join(app.getPath('userData'), 'media-cache');
  try {
    await rm(cacheDir, { recursive: true, force: true });
    await mkdir(cacheDir, { recursive: true });
    return true;
  } catch (error) {
    console.error('clear-media-cache-dir failed:', error);
    return false;
  }
});

ipcMain.handle('check-file-exists', async (_, filePath: string) => {
  const { existsSync } = await import('fs');
  return existsSync(filePath);
});

ipcMain.handle('save-media-file', async (_, filePath: string, buffer: ArrayBuffer) => {
  const { writeFileSync } = await import('fs');
  const { dirname } = await import('path');
  const { mkdirSync, existsSync } = await import('fs');
  
  try {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(filePath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error('Error saving media file:', error);
    return false;
  }
});

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Allow localhost ports for dev server
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    if (!isLocalhost && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});

