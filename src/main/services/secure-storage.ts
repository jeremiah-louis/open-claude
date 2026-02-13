import { safeStorage, app } from "electron";
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const KEY_FILE = "api-key.enc";

function getKeyPath(): string {
  return join(app.getPath("userData"), KEY_FILE);
}

export function storeApiKey(apiKey: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available");
  }

  const encrypted = safeStorage.encryptString(apiKey);
  const keyPath = getKeyPath();
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, encrypted);
}

export function getStoredApiKey(): string | null {
  const keyPath = getKeyPath();

  if (!existsSync(keyPath)) {
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  try {
    const encrypted = readFileSync(keyPath);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export function clearApiKey(): void {
  const keyPath = getKeyPath();
  if (existsSync(keyPath)) {
    unlinkSync(keyPath);
  }
}
