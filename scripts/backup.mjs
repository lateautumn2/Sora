import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

import Database from "better-sqlite3";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function listFiles(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true, recursive: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const path = resolve(entry.parentPath, entry.name);
      files.push({
        path: relative(root, path).replaceAll("\\", "/"),
        bytes: (await stat(path)).size,
        sha256: await sha256(path),
      });
    }
    return files.sort((left, right) => left.path.localeCompare(right.path));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/blog.db");
const uploadDirectory = resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
const outputRoot = resolve(argument("--output", "./backups"));
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const finalDirectory = join(outputRoot, timestamp);
const stagingDirectory = `${finalDirectory}.partial`;

await rm(stagingDirectory, { recursive: true, force: true });
await mkdir(stagingDirectory, { recursive: true });

const sqlite = new Database(databasePath, { readonly: true, fileMustExist: true });
try {
  await sqlite.backup(join(stagingDirectory, "blog.db"));
} finally {
  sqlite.close();
}

const backupUploads = join(stagingDirectory, "uploads");
await mkdir(backupUploads, { recursive: true });
await cp(uploadDirectory, backupUploads, { recursive: true, force: false }).catch((error) => {
  if (error?.code !== "ENOENT") throw error;
});

const manifest = {
  format: "sora-full-backup",
  version: 1,
  createdAt: new Date().toISOString(),
  source: {
    databaseFile: basename(databasePath),
    uploadDirectory: basename(uploadDirectory),
  },
  database: {
    path: "blog.db",
    bytes: (await stat(join(stagingDirectory, "blog.db"))).size,
    sha256: await sha256(join(stagingDirectory, "blog.db")),
  },
  uploads: await listFiles(backupUploads),
};

await writeFile(
  join(stagingDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
await mkdir(outputRoot, { recursive: true });
await rename(stagingDirectory, finalDirectory);
if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify({
      path: finalDirectory,
      createdAt: manifest.createdAt,
      databaseBytes: manifest.database.bytes,
      uploads: manifest.uploads.length,
    }),
  );
} else {
  console.log(`Backup completed: ${finalDirectory}; uploads: ${manifest.uploads.length}`);
}
