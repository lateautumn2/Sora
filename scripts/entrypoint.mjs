import { spawn, execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/blog.db");
const dataRoot = dirname(databasePath);
const requestPath = join(dataRoot, "restore-request.json");
const maintenancePath = join(dataRoot, "maintenance.json");

async function applyPendingRestore() {
  let request;
  try {
    request = JSON.parse(await readFile(requestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw new Error(`Cannot read pending restore request: ${error.message}`);
  }
  if (
    request?.version !== 1 ||
    typeof request.jobId !== "string" ||
    typeof request.backupDirectory !== "string"
  ) {
    throw new Error("Pending restore request is invalid; application remains in maintenance mode.");
  }
  const expectedJobRoot = resolve(dataRoot, "data-jobs", "backup-restore", request.jobId);
  const backupDirectory = resolve(request.backupDirectory);
  if (
    !backupDirectory.startsWith(`${expectedJobRoot}${sep}`) ||
    backupDirectory !== join(expectedJobRoot, "package")
  ) {
    throw new Error("Pending restore directory is outside the approved restore job.");
  }

  console.log(`Applying pending Sora restore job ${request.jobId}.`);
  execFileSync(
    process.execPath,
    [resolve("scripts/restore.mjs"), backupDirectory, "--confirm", "--json"],
    { cwd: process.cwd(), env: process.env, stdio: "inherit", windowsHide: true },
  );
  await rm(requestPath, { force: true });
  await rm(maintenancePath, { force: true });
  await rm(expectedJobRoot, { recursive: true, force: true });
  console.log(`Pending Sora restore job ${request.jobId} completed.`);
}

async function applyDatabaseMigrations() {
  // 首次部署与升级时 schema 可能滞后，启动服务前先应用迁移。
  // migrate.mjs 幂等执行，容器重复启动不会重复应用已执行的迁移。
  execFileSync(process.execPath, [resolve("scripts/migrate.mjs")], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
}

await applyPendingRestore();
await applyDatabaseMigrations();

if (process.env.SORA_APPLY_RESTORE_ONLY === "1" || process.argv.includes("--restore-only")) {
  process.exit(0);
}

const server = spawn(process.execPath, [resolve("server.js")], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.once("error", (error) => {
  console.error("Failed to start Sora server", error);
  process.exitCode = 1;
});
server.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
