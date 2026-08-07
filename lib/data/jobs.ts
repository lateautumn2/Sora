import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import { DataApiError } from "@/lib/data/api";
import { getEnvironment } from "@/lib/env";

export const JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DataJobKind = "content-import" | "backup-export" | "backup-restore";

export function getRuntimeDataRoot(): string {
  return dirname(resolve(getEnvironment().databasePath));
}

export function getDataJobsRoot(): string {
  return join(getRuntimeDataRoot(), "data-jobs");
}

export function getRestoreRequestPath(): string {
  return join(getRuntimeDataRoot(), "restore-request.json");
}

export function getMaintenanceMarkerPath(): string {
  return join(getRuntimeDataRoot(), "maintenance.json");
}

export function resolveJobDirectory(kind: DataJobKind, jobId: string): string {
  if (!JOB_ID_PATTERN.test(jobId)) throw new DataApiError("JOB_NOT_FOUND", "任务不存在", 404);
  const root = resolve(getDataJobsRoot(), kind);
  const target = resolve(root, jobId);
  if (!target.startsWith(`${root}${sep}`))
    throw new DataApiError("JOB_NOT_FOUND", "任务不存在", 404);
  return target;
}

export async function createJobDirectory(
  kind: DataJobKind,
): Promise<{ jobId: string; path: string }> {
  const jobId = randomUUID();
  const path = resolveJobDirectory(kind, jobId);
  await mkdir(path, { recursive: false });
  return { jobId, path };
}

export async function writeJobMetadata(path: string, value: unknown): Promise<void> {
  const target = join(path, "job.json");
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, target);
}

export async function readJobMetadata<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(join(path, "job.json"), "utf8")) as T;
  } catch {
    throw new DataApiError("JOB_NOT_FOUND", "任务不存在或已过期", 404);
  }
}

export async function acquireJobLock(path: string): Promise<() => Promise<void>> {
  try {
    const lock = await open(join(path, "job.lock"), "wx", 0o600);
    await lock.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new DataApiError("JOB_BUSY", "任务正在处理中", 409);
    }
    throw error;
  }
  return () => rm(join(path, "job.lock"), { force: true });
}

export async function cleanupExpiredJobs(maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const root = getDataJobsRoot();
  await mkdir(root, { recursive: true });
  let protectedJobId: string | undefined;
  try {
    const request = JSON.parse(await readFile(getRestoreRequestPath(), "utf8")) as {
      jobId?: string;
    };
    protectedJobId = request.jobId;
  } catch {
    protectedJobId = undefined;
  }
  for (const kind of ["content-import", "backup-export", "backup-restore"] as const) {
    const kindRoot = join(root, kind);
    await mkdir(kindRoot, { recursive: true });
    for (const entry of await readdir(kindRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === protectedJobId) continue;
      const path = join(kindRoot, entry.name);
      const metadata = await stat(path);
      if (Date.now() - metadata.mtimeMs > maxAgeMs) {
        await rm(path, { recursive: true, force: true });
      }
    }
  }
}
