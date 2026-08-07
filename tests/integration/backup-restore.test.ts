import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("backup and restore scripts", () => {
  it("verifies checksums and restores SQLite with uploads while retaining previous data", () => {
    const directory = mkdtempSync(join(tmpdir(), "sora-blog-backup-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "data", "blog.db");
    const uploadDirectory = join(directory, "data", "uploads");
    const backupRoot = join(directory, "backups");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, "image.txt"), "original-upload", "utf8");

    const environment = {
      ...process.env,
      DATABASE_PATH: databasePath,
      UPLOAD_DIR: uploadDirectory,
    };
    execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: process.cwd(),
      env: environment,
    });
    const sqlite = new Database(databasePath);
    sqlite.exec("CREATE TABLE backup_marker (value TEXT NOT NULL)");
    sqlite.prepare("INSERT INTO backup_marker (value) VALUES (?)").run("original-database");
    sqlite.close();

    execFileSync(process.execPath, ["scripts/backup.mjs", "--output", backupRoot], {
      cwd: process.cwd(),
      env: environment,
    });
    const backupDirectory = join(backupRoot, readdirSync(backupRoot)[0] ?? "missing");
    const manifest = JSON.parse(readFileSync(join(backupDirectory, "manifest.json"), "utf8")) as {
      format: string;
      database: { sha256: string };
      uploads: Array<{ path: string; sha256: string }>;
    };
    expect(manifest.format).toBe("sora-full-backup");
    expect(manifest.database.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.uploads).toHaveLength(1);
    const validation = execFileSync(
      process.execPath,
      ["scripts/restore.mjs", backupDirectory, "--validate-only", "--json"],
      { cwd: process.cwd(), env: environment, encoding: "utf8" },
    );
    expect(JSON.parse(validation)).toMatchObject({ valid: true, uploads: 1 });

    const changed = new Database(databasePath);
    changed.prepare("UPDATE backup_marker SET value = ?").run("changed-database");
    changed.close();
    writeFileSync(join(uploadDirectory, "image.txt"), "changed-upload", "utf8");

    const restoreJobId = "12345678-1234-4123-8123-123456789abc";
    const restoreJob = join(directory, "data", "data-jobs", "backup-restore", restoreJobId);
    const stagedBackup = join(restoreJob, "package");
    cpSync(backupDirectory, stagedBackup, { recursive: true });
    writeFileSync(
      join(directory, "data", "restore-request.json"),
      JSON.stringify({
        version: 1,
        jobId: restoreJobId,
        backupDirectory: stagedBackup,
        requestedAt: new Date().toISOString(),
      }),
      "utf8",
    );
    writeFileSync(join(directory, "data", "maintenance.json"), "{}", "utf8");

    execFileSync(process.execPath, ["scripts/entrypoint.mjs"], {
      cwd: process.cwd(),
      env: { ...environment, SORA_APPLY_RESTORE_ONLY: "1" },
    });
    const restored = new Database(databasePath, { readonly: true });
    const row = restored.prepare("SELECT value FROM backup_marker").get() as { value: string };
    restored.close();
    expect(row.value).toBe("original-database");
    expect(readFileSync(join(uploadDirectory, "image.txt"), "utf8")).toBe("original-upload");
    expect(
      readdirSync(join(directory, "data")).some((name) => name.includes("before-restore")),
    ).toBe(true);
    expect(existsSync(join(directory, "data", "restore-request.json"))).toBe(false);
    expect(existsSync(join(directory, "data", "maintenance.json"))).toBe(false);
    expect(existsSync(restoreJob)).toBe(false);
  });
});
