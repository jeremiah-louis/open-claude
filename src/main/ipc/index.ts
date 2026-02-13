import { registerFileSystemHandlers } from "./handlers";
import { registerClaudeHandlers } from "./claude-handlers";

export function registerIpcHandlers(): void {
  registerFileSystemHandlers();
  registerClaudeHandlers();
}
