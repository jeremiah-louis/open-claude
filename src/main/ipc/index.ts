import { registerFileSystemHandlers } from "./handlers";

export function registerIpcHandlers(): void {
  registerFileSystemHandlers();
}
