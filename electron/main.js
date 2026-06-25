const { app, BrowserWindow, Tray, Menu, nativeImage, clipboard, ipcMain, dialog, shell, globalShortcut } = require('electron');
const { join } = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { loadConfig, saveConfig } = require('./config');
const store = require('./store');

let tray = null;
let window = null;
let lastText = '';
let lastImageHash = '';
let pollTimer = null;
let deletedHashes = new Set(); // 记录刚被删除的内容哈希，防止重新保存

function createWindow() {
  window = new BrowserWindow({
    width: 380,
    height: 520,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  const isDev = !app.isPackaged;
  if (isDev) {
    window.loadURL('http://localhost:5173');
  } else {
    window.loadFile(join(__dirname, '../dist/index.html'));
  }
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });
}

function createTray() {
  const iconPath = join(__dirname, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('剪贴板管理');
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示应用', click: () => showWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.on('click', () => toggleWindow());
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu));
}

function toggleWindow() {
  if (window.isVisible()) window.hide();
  else showWindow();
}

function showWindow() {
  const trayBounds = tray.getBounds();
  const windowBounds = window.getBounds();
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  window.setPosition(x, y, false);
  window.show();
  window.focus();
  // 通知渲染进程窗口已显示
  window.webContents.send('window-shown');
}

function makeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

function notifyRenderer() {
  if (window && !window.isDestroyed()) {
    window.webContents.send('clipboard-changed');
  }
}

function pollClipboard() {
  try {
    const config = loadConfig();
    if (!config.clipboardMonitoring) return;

    // 检测图片
    const image = clipboard.readImage();
    if (image && !image.isEmpty()) {
      const buffer = image.toPNG();
      const hash = makeHash(buffer.toString('base64'));
      // 跳过刚删除的内容
      if (deletedHashes.has(hash)) {
        lastImageHash = hash;
        lastText = '';
        return;
      }
      if (hash !== lastImageHash) {
        lastImageHash = hash;
        lastText = '';
        store.saveImageRecord(buffer, hash, 'png');
        notifyRenderer();
      }
      return;
    }

    // 检测文本
    const text = clipboard.readText();
    if (text && text.trim().length > 0) {
      const hash = makeHash(text);
      // 跳过刚删除的内容
      if (deletedHashes.has(hash)) {
        lastText = text;
        return;
      }
      if (text !== lastText) {
        lastText = text;
        lastImageHash = '';
        store.saveTextRecord(text, hash);
        notifyRenderer();
      }
    }
  } catch (e) {
    console.error('剪贴板监听出错:', e.message);
  }
}

function registerHotkey(shortcut) {
  // 先注销旧的快捷键
  globalShortcut.unregisterAll();
  if (shortcut) {
    var ret = globalShortcut.register(shortcut, function () {
      if (window) {
        if (window.isVisible()) {
          window.hide();
        } else {
          showWindow();
        }
      }
    });
    if (!ret) {
      console.error('快捷键注册失败:', shortcut);
    }
  }
}

function registerIPC() {
  ipcMain.handle('get-history', () => {
    return store.getAll();
  });

  ipcMain.handle('delete-record', (event, id) => {
    const record = store.getAll().find(r => r.id === id);
    if (record && record.hash) {
      deletedHashes.add(record.hash);
      // 3秒后清除，允许重新保存用户主动复制的相同内容
      setTimeout(() => deletedHashes.delete(record.hash), 3000);
    }
    store.deleteRecord(id);
    return store.getAll();
  });

  ipcMain.handle('clear-all', () => {
    // 记录所有被清空内容的哈希
    store.getAll().forEach(r => {
      if (r.hash) {
        deletedHashes.add(r.hash);
        setTimeout(() => deletedHashes.delete(r.hash), 3000);
      }
    });
    store.clearAll();
    // 重置内部状态
    lastText = clipboard.readText() || '';
    const img = clipboard.readImage();
    lastImageHash = (img && !img.isEmpty()) ? makeHash(img.toPNG().toString('base64')) : '';
    return store.getAll();
  });

  ipcMain.handle('copy-text', (event, text) => {
    clipboard.writeText(text);
    lastText = text;
    lastImageHash = '';
    return true;
  });

  ipcMain.handle('copy-image', (event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      const img = nativeImage.createFromBuffer(buffer);
      clipboard.writeImage(img);
      lastText = '';
      lastImageHash = makeHash(buffer.toString('base64'));
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('read-image', (event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return 'data:image/png;base64,' + buffer.toString('base64');
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('get-config', () => {
    return loadConfig();
  });

  ipcMain.handle('update-hotkey', (event, newShortcut) => {
    registerHotkey(newShortcut);
    return true;
  });

  ipcMain.handle('save-config', (event, newConfig) => {
    saveConfig(newConfig);
    store.init(newConfig.saveDir);
    store.cleanupByRetention(newConfig.retentionDays);
    // 更新快捷键
    registerHotkey(newConfig.hotkey);
    return loadConfig();
  });

  ipcMain.handle('open-save-dir', () => {
    const config = loadConfig();
    if (config.saveDir) shell.openPath(config.saveDir);
  });

  ipcMain.handle('select-save-dir', async () => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: config.saveDir,
      title: '选择剪贴板记录保存目录',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
}

app.whenReady().then(() => {
  const config = loadConfig();
  store.init(config.saveDir);
  store.cleanupByRetention(config.retentionDays);

  // 启动时记录当前剪贴板，避免旧内容被存入
  lastText = clipboard.readText() || '';
  const initImage = clipboard.readImage();
  if (initImage && !initImage.isEmpty()) {
    lastImageHash = makeHash(initImage.toPNG().toString('base64'));
  }

  createWindow();
  createTray();
  registerIPC();
  registerHotkey(config.hotkey);

  pollTimer = setInterval(pollClipboard, 500);

  if (process.platform === 'darwin') {
    app.dock.hide();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (pollTimer) clearInterval(pollTimer);
});
