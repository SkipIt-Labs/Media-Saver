import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { DownloadManager } from './download/DownloadManager';
import { getSettings, patchSettings } from './settings';
import type { IpcChooseFolderResult, IpcChooseTxtResult, IpcStartBatchArgs, IpcStartSingleArgs } from '../shared/ipc';
import type { DownloadEvent } from '../shared/types';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let downloadManager: DownloadManager | null = null;

function sendToRenderer(evt: DownloadEvent) {
  if (!mainWindow) return;
  mainWindow.webContents.send('dm:event', evt);
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 860,
    minHeight: 640,
    backgroundColor: '#0b1020',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload', 'index.cjs')
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(app.getAppPath(), 'dist-renderer', 'index.html');
    await mainWindow.loadFile(indexHtml);
  }
}

function parseUrlsFromTxt(contents: string): string[] {
  return contents
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

async function registerIpc() {
  ipcMain.handle('ui:chooseDestinationFolder', async (): Promise<IpcChooseFolderResult> => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose destination folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || res.filePaths.length === 0) return { cancelled: true };
    return { cancelled: false, folderPath: res.filePaths[0]! };
  });

  ipcMain.handle('ui:chooseTxtFile', async (): Promise<IpcChooseTxtResult> => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose TXT file',
      properties: ['openFile'],
      filters: [{ name: 'Text files', extensions: ['txt'] }]
    });
    if (res.canceled || res.filePaths.length === 0) return { cancelled: true };
    const filePath = res.filePaths[0]!;
    const contents = await fs.readFile(filePath, 'utf-8');
    const urls = parseUrlsFromTxt(contents);
    return { cancelled: false, filePath, urls };
  });

  ipcMain.handle('ui:startSingle', async (_evt, args: IpcStartSingleArgs) => {
    await downloadManager!.startSingle(args.url, args.options);
  });

  ipcMain.handle('ui:startBatch', async (_evt, args: IpcStartBatchArgs) => {
    await downloadManager!.startBatch(args.urls, args.options);
  });

  ipcMain.handle('ui:cancelCurrent', async () => {
    await downloadManager!.cancelCurrent();
  });

  ipcMain.handle('ui:getSettings', async () => getSettings());
  ipcMain.handle('ui:setSettings', async (_evt, patch) => patchSettings(patch));
}

async function main() {
  await app.whenReady();

  await createMainWindow();

  downloadManager = new DownloadManager({
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    onEvent: sendToRenderer
  });

  await registerIpc();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Ensure single instance (optional but nice on Windows).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  void main();
}



