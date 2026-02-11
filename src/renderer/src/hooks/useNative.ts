import type { NativeAPI } from "@shared/types";

export function useNative(): NativeAPI {
  if (typeof window === "undefined" || !window.api) {
    // Return a mock API for development or non-Electron environments
    const notAvailable = () =>
      Promise.reject(new Error("Native API not available in this environment"));

    return {
      fs: {
        readFile: notAvailable,
        writeFile: notAvailable,
        readDir: notAvailable,
      },
      dialog: {
        openFile: notAvailable,
        openDirectory: notAvailable,
        saveFile: notAvailable,
      },
      system: {
        getInfo: notAvailable,
        getPaths: notAvailable,
      },
      app: {
        minimize: notAvailable,
        maximize: notAvailable,
        close: notAvailable,
        quit: notAvailable,
        getVersion: notAvailable,
      },
    };
  }

  return window.api;
}
