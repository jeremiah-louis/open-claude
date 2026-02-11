// ---------------------------------------------------------------------------
// Error categories – add new domains here as the app grows
// ---------------------------------------------------------------------------
export enum ErrorCategory {
  CLIENT = "CLIENT",
  FILE_SYSTEM = "FILE_SYSTEM",
  // NETWORK = "NETWORK",  ← uncomment when needed
}

// ---------------------------------------------------------------------------
// Numeric error codes grouped by category
//   CLIENT      1xxx
//   FILE_SYSTEM 2xxx
//   NETWORK     3xxx  (reserved)
// ---------------------------------------------------------------------------
export enum ErrorCode {
  // Client
  CLIENT_UNKNOWN = 1000,
  CLIENT_VALIDATION = 1001,
  CLIENT_NOT_FOUND = 1002,

  // File system
  FS_UNKNOWN = 2000,
  FS_READ = 2001,
  FS_WRITE = 2002,
  FS_NOT_FOUND = 2003,
  FS_PERMISSION_DENIED = 2004,
}

// ---------------------------------------------------------------------------
// Serialisable error model – this is what crosses the IPC boundary
// ---------------------------------------------------------------------------
export interface AppErrorModel {
  message: string;
  code: ErrorCode;
  category: ErrorCategory;
  path: string; // origin of the error (file path, component, url, etc.)
  timestamp: string;
  cause?: string;
}

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly path: string;
  readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    path: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.category = category;
    this.path = path;
    this.timestamp = new Date().toISOString();
  }

  toModel(): AppErrorModel {
    return {
      message: this.message,
      code: this.code,
      category: this.category,
      path: this.path,
      timestamp: this.timestamp,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Domain-specific subclasses
// ---------------------------------------------------------------------------

export class FileSystemError extends AppError {
  constructor(message: string, code: ErrorCode, path: string, options?: { cause?: unknown }) {
    super(message, code, ErrorCategory.FILE_SYSTEM, path, options);
    this.name = "FileSystemError";
  }

  /**
   * Build a FileSystemError from a raw caught error, mapping common Node
   * error codes to the appropriate ErrorCode automatically.
   */
  static from(error: unknown, path: string): FileSystemError {
    const raw = error as NodeJS.ErrnoException;
    const message = raw?.message ?? "Unknown file system error";

    let code: ErrorCode;
    switch (raw?.code) {
      case "ENOENT":
        code = ErrorCode.FS_NOT_FOUND;
        break;
      case "EACCES":
      case "EPERM":
        code = ErrorCode.FS_PERMISSION_DENIED;
        break;
      default:
        code = ErrorCode.FS_UNKNOWN;
    }

    return new FileSystemError(message, code, path, { cause: error });
  }
}

export class ClientError extends AppError {
  constructor(message: string, code: ErrorCode, path: string, options?: { cause?: unknown }) {
    super(message, code, ErrorCategory.CLIENT, path, options);
    this.name = "ClientError";
  }
}
