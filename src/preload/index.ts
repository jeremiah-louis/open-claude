import { contextBridge } from "electron";
import { ipcRenderer } from "electron/renderer";
import { GetVersionsFn } from "@shared/types";

// The preload process plays a middleware role in bridging
// the call from the front end, and the function in the main process

if (!process.contextIsolated) {
  throw new Error("Context isolation must be enabled in the Browser window");
}

try {
  // Front end can call the function by using window.context.<Function name>
  contextBridge.exposeInMainWorld("context", {
    getVersions: (...args: Parameters<GetVersionsFn>) =>
      ipcRenderer.invoke("getVersions", ...args),
    triggerIPC: () => ipcRenderer.invoke("triggerIPC"),
  });

  // Native API - accessible via window.api
  contextBridge.exposeInMainWorld("api", {
    fs: {
      readFile: (filePath: string) => ipcRenderer.invoke("fs:readFile", filePath),
      writeFile: (filePath: string, content: string) => ipcRenderer.invoke("fs:writeFile", filePath, content),
      readDir: (dirPath: string) => ipcRenderer.invoke("fs:readDir", dirPath),
    },
    dialog: {
      openFile: (options?: Electron.OpenDialogOptions) => ipcRenderer.invoke("dialog:openFile", options),
      openDirectory: (options?: Electron.OpenDialogOptions) => ipcRenderer.invoke("dialog:openDirectory", options),
      saveFile: (options?: Electron.SaveDialogOptions) => ipcRenderer.invoke("dialog:saveFile", options),
    },
    system: {
      getInfo: () => ipcRenderer.invoke("system:getInfo"),
      getPaths: () => ipcRenderer.invoke("system:getPaths"),
    },
    app: {
      minimize: () => ipcRenderer.invoke("app:minimize"),
      maximize: () => ipcRenderer.invoke("app:maximize"),
      close: () => ipcRenderer.invoke("app:close"),
      quit: () => ipcRenderer.invoke("app:quit"),
      getVersion: () => ipcRenderer.invoke("app:getVersion"),
    },
  });
} catch (error) {
  console.error("Error occured when establishing context bridge: ", error);
}
