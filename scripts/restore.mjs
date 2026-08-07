import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import Database from "better-sqlite3";

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function safeRelativePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[a-zA-Z]:/.test(value) ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Restore refused: unsafe upload path ${String(value)}.`);
  }
  return value;
}

function resolveInside(root, value) {
  const target = resolve(root, ...safeRelativePath(value).split("/"));
  const resolvedRoot = resolve(root);
  if (!target.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Restore refused: upload path escapes backup root.`);
  }
  return target;
}

async function listFiles(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true, recursive: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => relative(root, resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function validateBackup(backupDirectory) {
  const manifestPath = join(backupDirectory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    (manifest.format !== undefined && manifest.format !== "sora-full-backup") ||
    manifest.version !== 1 ||
    manifest.database?.path !== "blog.db" ||
    !Number.isInteger(manifest.database?.bytes) ||
    !/^[a-f0-9]{64}$/.test(manifest.database?.sha256 ?? "") ||
    !Array.isArray(manifest.uploads)
  ) {
    throw new Error("Restore refused: unsupported or incomplete manifest.");
  }

  const backupDatabase = join(backupDirectory, "blog.db");
  const databaseMetadata = await stat(backupDatabase);
  if (
    databaseMetadata.size !== manifest.database.bytes ||
    (await sha256(backupDatabase)) !== manifest.database.sha256
  ) {
    throw new Error("Restore refused: database checksum or size mismatch.");
  }

  const uploadRoot = resolve(backupDirectory, "uploads");
  const declared = new Set();
  for (const file of manifest.uploads) {
    const path = safeRelativePath(file?.path);
    const key = path.toLocaleLowerCase("en-US");
    if (
      declared.has(key) ||
      !Number.isInteger(file.bytes) ||
      file.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(file.sha256 ?? "")
    ) {
      throw new Error(`Restore refused: invalid upload manifest entry ${path}.`);
    }
    declared.add(key);
    const source = resolveInside(uploadRoot, path);
    const metadata = await stat(source);
    if (metadata.size !== file.bytes || (await sha256(source)) !== file.sha256) {
      throw new Error(`Restore refused: upload checksum or size mismatch for ${path}.`);
    }
  }
  const actualFiles = await listFiles(uploadRoot);
  if (
    actualFiles.length !== manifest.uploads.length ||
    actualFiles.some((path) => !declared.has(path.toLocaleLowerCase("en-US")))
  ) {
    throw new Error("Restore refused: uploads contain missing or undeclared files.");
  }

  const sqlite = new Database(backupDatabase, { readonly: true, fileMustExist: true });
  try {
    const quickCheck = sqlite.pragma("quick_check");
    if (quickCheck.length !== 1 || quickCheck[0]?.quick_check !== "ok") {
      throw new Error("Restore refused: SQLite quick_check failed.");
    }
    const tables = new Set(
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name),
    );
    const missing = ["posts", "user", "settings"].filter((table) => !tables.has(table));
    if (missing.length > 0) {
      throw new Error(
        `Restore refused: database is not a Sora backup; missing ${missing.join(", ")}.`,
      );
    }
  } finally {
    sqlite.close();
  }
  return { manifest, backupDatabase, uploadRoot };
}

const backupArgument = process.argv.find((value, index) => index > 1 && !value.startsWith("--"));
if (!backupArgument) fail("Usage: node scripts/restore.mjs <backup-directory> --confirm");
const backupDirectory = resolve(backupArgument);

let validated;
try {
  validated = await validateBackup(backupDirectory);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (process.argv.includes("--validate-only")) {
  const result = {
    valid: true,
    createdAt: validated.manifest.createdAt,
    databaseBytes: validated.manifest.database.bytes,
    uploads: validated.manifest.uploads.length,
  };
  console.log(
    process.argv.includes("--json") ? JSON.stringify(result) : "Backup validation passed.",
  );
  process.exit(0);
}
if (!process.argv.includes("--confirm")) {
  fail("Restore refused: pass --confirm after stopping the application.");
}

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/blog.db");
const uploadDirectory = resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
const suffix = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const stagedDatabase = `${databasePath}.restore-${suffix}`;
const stagedUploads = `${uploadDirectory}.restore-${suffix}`;
const previousDatabase = `${databasePath}.before-restore-${suffix}`;
const previousUploads = `${uploadDirectory}.before-restore-${suffix}`;
const sidecars = ["-wal", "-shm"].map((extension) => ({
  current: `${databasePath}${extension}`,
  previous: `${databasePath}${extension}.before-restore-${suffix}`,
}));

await mkdir(dirname(databasePath), { recursive: true });
await cp(validated.backupDatabase, stagedDatabase, { force: false });
await mkdir(stagedUploads, { recursive: true });
await cp(validated.uploadRoot, stagedUploads, { recursive: true, force: false });
if ((await listFiles(stagedUploads)).length !== validated.manifest.uploads.length) {
  await rm(stagedDatabase, { force: true });
  await rm(stagedUploads, { recursive: true, force: true });
  fail("Restore refused: staged upload count is incomplete.");
}

const previousPaths = [];
let installedDatabase = false;
let installedUploads = false;
try {
  for (const pair of [
    { current: databasePath, previous: previousDatabase },
    ...sidecars,
    { current: uploadDirectory, previous: previousUploads },
  ]) {
    if (await exists(pair.current)) {
      await rename(pair.current, pair.previous);
      previousPaths.push(pair);
    }
  }
  await rename(stagedDatabase, databasePath);
  installedDatabase = true;
  await rename(stagedUploads, uploadDirectory);
  installedUploads = true;
} catch (error) {
  if (installedUploads) await rm(uploadDirectory, { recursive: true, force: true });
  if (installedDatabase) await rm(databasePath, { force: true });
  for (const pair of previousPaths.reverse()) {
    if (await exists(pair.previous)) await rename(pair.previous, pair.current);
  }
  await rm(stagedDatabase, { force: true });
  await rm(stagedUploads, { recursive: true, force: true });
  fail(
    `Restore failed and previous data was rolled back: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const result = { restored: true, backupDirectory, previousSuffix: `.before-restore-${suffix}` };
console.log(
  process.argv.includes("--json")
    ? JSON.stringify(result)
    : `Restore completed from ${backupDirectory}. Previous data retained with suffix ${result.previousSuffix}.`,
);
