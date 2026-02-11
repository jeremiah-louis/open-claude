import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

export function registerFileSystemHandlers(): void {
  // File System Operations
  ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, "utf-8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:readDir", async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        path: path.join(dirPath, entry.name),
      }));
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Dialog Operations
  ipcMain.handle("dialog:openFile", async (event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      ...options,
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  });

  ipcMain.handle("dialog:openDirectory", async (event, options?: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openDirectory"],
      ...options,
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  });

  ipcMain.handle("dialog:saveFile", async (event, options?: Electron.SaveDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(win!, {
      ...options,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePath,
    };
  });

  // System Information
  ipcMain.handle("system:getInfo", async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      hostname: os.hostname(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
    };
  });

  ipcMain.handle("system:getPaths", async () => {
    return {
      home: app.getPath("home"),
      appData: app.getPath("appData"),
      userData: app.getPath("userData"),
      temp: app.getPath("temp"),
      desktop: app.getPath("desktop"),
      documents: app.getPath("documents"),
      downloads: app.getPath("downloads"),
      music: app.getPath("music"),
      pictures: app.getPath("pictures"),
      videos: app.getPath("videos"),
    };
  });

  // App Control
  ipcMain.handle("app:minimize", async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.minimize();
  });

  ipcMain.handle("app:maximize", async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle("app:close", async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.close();
  });

  ipcMain.handle("app:quit", async () => {
    app.quit();
  });

  ipcMain.handle("app:getVersion", async () => {
    return app.getVersion();
  });
}
