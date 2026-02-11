import type { ElectronAPI } from "@electron-toolkit/preload";
import { electronAPI } from "@electron-toolkit/preload";

export type GetVersionsFn = () => Promise<typeof electronAPI.process.versions>;

export interface FileSystemResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  hostname: string;
  homedir: string;
  tmpdir: string;
  cpus: number;
  memory: {
    total: number;
    free: number;
  };
}

export interface SystemPaths {
  home: string;
  appData: string;
  userData: string;
  temp: string;
  desktop: string;
  documents: string;
  downloads: string;
  music: string;
  pictures: string;
  videos: string;
}

export interface NativeAPI {
  fs: {
    readFile: (filePath: string) => Promise<FileSystemResult<string>>;
    writeFile: (filePath: string, content: string) => Promise<FileSystemResult>;
    readDir: (dirPath: string) => Promise<FileSystemResult<DirectoryEntry[]>>;
  };
  dialog: {
    openFile: (options?: Electron.OpenDialogOptions) => Promise<OpenDialogResult>;
    openDirectory: (options?: Electron.OpenDialogOptions) => Promise<OpenDialogResult>;
    saveFile: (options?: Electron.SaveDialogOptions) => Promise<SaveDialogResult>;
  };
  system: {
    getInfo: () => Promise<SystemInfo>;
    getPaths: () => Promise<SystemPaths>;
  };
  app: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    quit: () => Promise<void>;
    getVersion: () => Promise<string>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: NativeAPI;
  }
}
