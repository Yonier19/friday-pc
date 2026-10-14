const { app, BrowserWindow, shell, session, ipcMain, safeStorage, Tray, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { WindowsNotificationReader } = require('./notificationReader.cjs');

let mainWindow = null;
let tray = null;
let serverInstance = null;
let serverPort = 3000;
let isQuitting = false;
let notificationReader = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Configure environment paths for server and data
const userDataDir = app.getPath('userData');
process.env.VIERNES_USER_DATA = userDataDir;

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
  process.env.VIERNES_PACKAGED = '1';
  process.env.VIERNES_STATIC_PATH = path.join(app.getAppPath(), 'dist');
} else {
  process.env.VIERNES_STATIC_PATH = path.join(__dirname, '../dist');
}

// Function to poll the server until it responds
function waitForServer(port, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const req = http.get(`http://127.0.0.1:${port}/api/assistant/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    }

    function retry() {
      if (Date.now() - startTime > timeoutMs) {
        return reject(new Error('Tiempo de espera agotado al conectar con el servidor interno de Viernes.'));
      }
      setTimeout(check, 150);
    }

    check();
  });
}

// Start Express Server
async function bootServer() {
  const isPackaged = app.isPackaged;
  const serverPath = isPackaged
    ? path.join(app.getAppPath(), 'dist-server/server.cjs')
    : path.join(__dirname, '../dist-server/server.cjs');

  try {
    let serverModule;
    if (require('fs').existsSync(serverPath)) {
      serverModule = require(serverPath);
    } else {
      console.log('[Electron] Requeriendo server.ts directamente en desarrollo...');
      serverModule = await import('../server.ts');
    }

    if (serverModule && typeof serverModule.startServer === 'function') {
      const { server, port } = await serverModule.startServer(3000);
      serverInstance = server;
      serverPort = port;
    } else {
      serverPort = 3000;
    }
  } catch (err) {
    console.warn('[Electron] Error iniciando servidor:', err);
    serverPort = 3000;
  }

  await waitForServer(serverPort);
}

// Create System Tray
function createTray() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  try {
    tray = new Tray(iconPath);
    tray.setToolTip('Viernes (FRIDAY) - Asistente IA');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir Viernes',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Iniciar con Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath,
          });
        },
      },
      { type: 'separator' },
      {
        label: 'Salir de Viernes',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Electron] No se pudo inicializar la bandeja del sistema:', err.message);
  }
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Viernes (FRIDAY)',
    backgroundColor: '#05070d',
    autoHideMenuBar: true,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Handle media/microphone/notification permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'notifications'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'microphone', 'audioCapture', 'notifications'];
    return allowed.includes(permission);
  });

  // External link routing
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes(`localhost:${serverPort}`) && !url.includes(`127.0.0.1:${serverPort}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes(`localhost:${serverPort}`) && !url.includes(`127.0.0.1:${serverPort}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// Windows Notifications Reader Setup
function initNotificationReader() {
  notificationReader = new WindowsNotificationReader({
    intervalMs: 4000,
    onNotification: (notif) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notification-received', notif);
      }
    },
  });
  // Auto-start reader
  notificationReader.start();
}

// IPC Handlers
ipcMain.handle('open-external', (event, url) => {
  if (url) shell.openExternal(url);
});

ipcMain.handle('get-user-data-path', () => {
  return userDataDir;
});

ipcMain.handle('launch-edge-app', (event, port) => {
  const targetPort = port || serverPort;
  const targetUrl = `http://localhost:${targetPort}`;
  if (process.platform === 'win32') {
    spawn('msedge', [`--app=${targetUrl}`], { detached: true, stdio: 'ignore' }).unref();
  } else {
    shell.openExternal(targetUrl);
  }
});

ipcMain.handle('get-auto-start', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    path: process.execPath,
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('get-recent-notifications', () => {
  return notificationReader ? notificationReader.getHistory() : [];
});

ipcMain.handle('set-notification-reader-config', (event, config) => {
  if (!notificationReader) return false;
  if (config.enabled !== undefined) {
    if (config.enabled) notificationReader.start();
    else notificationReader.stop();
  }
  if (config.allowedApps || config.blockedApps) {
    notificationReader.setFilters({
      allowedApps: config.allowedApps,
      blockedApps: config.blockedApps,
    });
  }
  return true;
});

ipcMain.handle('encrypt-string', (event, text) => {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(text).toString('base64');
  }
  return Buffer.from(text).toString('base64');
});

ipcMain.handle('decrypt-string', (event, encryptedBase64) => {
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'));
    } catch {
      return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
    }
  }
  return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
});

// Network Proxy Handlers
ipcMain.handle('get-system-proxy', async (event, testUrl = 'https://generativelanguage.googleapis.com') => {
  try {
    const resolved = await session.defaultSession.resolveProxy(testUrl);
    return resolved || 'DIRECT';
  } catch (err) {
    return 'DIRECT';
  }
});

ipcMain.handle('set-network-proxy', async (event, proxyUrl) => {
  try {
    if (proxyUrl && proxyUrl.trim()) {
      const cleanProxy = proxyUrl.trim();
      await session.defaultSession.setProxy({ proxyRules: cleanProxy });
      process.env.HTTPS_PROXY = cleanProxy;
      process.env.HTTP_PROXY = cleanProxy;
      console.log(`[Electron] Proxy de red configurado: ${cleanProxy}`);
    } else {
      await session.defaultSession.setProxy({ mode: 'system' });
      delete process.env.HTTPS_PROXY;
      delete process.env.HTTP_PROXY;
      console.log('[Electron] Proxy de red restablecido a modo del sistema (Direct/System).');
    }
    return { success: true };
  } catch (err) {
    console.warn('[Electron] Error configurando proxy:', err.message);
    return { success: false, error: err.message };
  }
});

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Check if proxy was previously saved in credentials
    const credsPath = path.join(userDataDir, 'viernes_credentials.json');
    if (require('fs').existsSync(credsPath)) {
      try {
        const creds = JSON.parse(require('fs').readFileSync(credsPath, 'utf-8'));
        if (creds.proxy && creds.proxy.trim()) {
          const proxy = creds.proxy.trim();
          await session.defaultSession.setProxy({ proxyRules: proxy });
          process.env.HTTPS_PROXY = proxy;
          process.env.HTTP_PROXY = proxy;
          console.log(`[Electron] Proxy inicial cargado desde UserData: ${proxy}`);
        }
      } catch {}
    }

    await bootServer();
    createWindow();
    createTray();
    initNotificationReader();
  } catch (err) {
    console.error('[Electron] Error al inicializar:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Keep alive in tray unless explicitly quit
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (notificationReader) {
    notificationReader.stop();
  }
  if (serverInstance && typeof serverInstance.close === 'function') {
    try {
      serverInstance.close();
      console.log('[Electron] Servidor Express interno cerrado correctamente.');
    } catch {}
  }
});
