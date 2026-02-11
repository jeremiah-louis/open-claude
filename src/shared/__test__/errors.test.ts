import { describe, it, expect } from "vitest";
import {
  AppError,
  ClientError,
  FileSystemError,
  ErrorCategory,
  ErrorCode,
} from "../errors";

describe("AppError", () => {
  it("serialises to a model with all fields", () => {
    const err = new AppError(
      "something broke",
      ErrorCode.CLIENT_UNKNOWN,
      ErrorCategory.CLIENT,
      "/app/component",
    );
    const model = err.toModel();

    expect(model.message).toBe("something broke");
    expect(model.code).toBe(ErrorCode.CLIENT_UNKNOWN);
    expect(model.category).toBe(ErrorCategory.CLIENT);
    expect(model.path).toBe("/app/component");
    expect(model.timestamp).toBeTruthy();
    expect(model.cause).toBeUndefined();
  });

  it("includes cause when provided", () => {
    const cause = new Error("root cause");
    const err = new AppError(
      "wrapper",
      ErrorCode.CLIENT_UNKNOWN,
      ErrorCategory.CLIENT,
      "/x",
      { cause },
    );

    expect(err.toModel().cause).toBe("root cause");
  });
});

describe("FileSystemError", () => {
  it("sets category to FILE_SYSTEM automatically", () => {
    const err = new FileSystemError("fail", ErrorCode.FS_READ, "/tmp/file.txt");
    expect(err.category).toBe(ErrorCategory.FILE_SYSTEM);
    expect(err.name).toBe("FileSystemError");
  });

  describe(".from()", () => {
    it("maps ENOENT to FS_NOT_FOUND", () => {
      const raw = Object.assign(new Error("no such file"), { code: "ENOENT" });
      const err = FileSystemError.from(raw, "/missing.txt");

      expect(err.code).toBe(ErrorCode.FS_NOT_FOUND);
      expect(err.path).toBe("/missing.txt");
      expect(err.toModel().cause).toBe("no such file");
    });

    it("maps EACCES to FS_PERMISSION_DENIED", () => {
      const raw = Object.assign(new Error("permission denied"), { code: "EACCES" });
      const err = FileSystemError.from(raw, "/secret");

      expect(err.code).toBe(ErrorCode.FS_PERMISSION_DENIED);
    });

    it("maps EPERM to FS_PERMISSION_DENIED", () => {
      const raw = Object.assign(new Error("operation not permitted"), { code: "EPERM" });
      const err = FileSystemError.from(raw, "/secret");

      expect(err.code).toBe(ErrorCode.FS_PERMISSION_DENIED);
    });

    it("falls back to FS_UNKNOWN for unrecognised codes", () => {
      const raw = Object.assign(new Error("disk on fire"), { code: "EIO" });
      const err = FileSystemError.from(raw, "/dev/sda");

      expect(err.code).toBe(ErrorCode.FS_UNKNOWN);
    });
  });
});

describe("ClientError", () => {
  it("sets category to CLIENT automatically", () => {
    const err = new ClientError("bad input", ErrorCode.CLIENT_VALIDATION, "/form");
    expect(err.category).toBe(ErrorCategory.CLIENT);
    expect(err.name).toBe("ClientError");
    expect(err.code).toBe(ErrorCode.CLIENT_VALIDATION);
  });
});
