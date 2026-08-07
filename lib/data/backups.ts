import { mkdir, open, rm } from "node:fs/promises";
import { basename, join } from "node:path";

import { createArchive, extractArchive, saveArchiveRequest } from "@/lib/data/archive";
import { DataApiError } from "@/lib/data/api";
import {
  acquireJobLock,
  cleanupExpiredJobs,
  createJobDirectory,
  getMaintenanceMarkerPath,
  getRestoreRequestPath,
  readJobMetadata,
  resolveJobDirectory,
  writeJobMetadata,
} from "@/lib/data/jobs";
import { runProjectScript } from "@/lib/data/process";

interface BackupValidation {
  valid: true;
  createdAt: string;
  databaseBytes: number;
  uploads: number;
}

interface RestoreJob {
  jobId: string;
  kind: "backup-restore";
  state: "READY" | "PENDING_RESTART" | "FAILED";
  createdAt: string;
  sourceName: string;
  archiveBytes: number;
  backup: BackupValidation;
}

export interface BackupExport {
  jobDirectory: string;
  archivePath: string;
  fileName: string;
  bytes: number;
}

function safeSourceName(value: string | null): string {
  const name = basename((value ?? "sora-backup.zip").replaceAll("\\", "/"));
  return name.replace(/[^\p{Letter}\p{Number}._ -]+/gu, "-").slice(0, 160) || "sora-backup.zip";
}

function timestampFilePart(): string {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export async function createFullBackupExport(): Promise<BackupExport> {
  await cleanupExpiredJobs();
  const job = await createJobDirectory("backup-export");
  try {
    const sourceRoot = join(job.path, "source");
    await mkdir(sourceRoot, { recursive: true });
    const result = await runProjectScript(
      "backup.mjs",
      ["--output", sourceRoot, "--json"],
      "BACKUP_EXPORT_FAILED",
      "完整备份生成失败",
    );
    const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1) ?? "{}") as {
      path?: string;
    };
    if (!output.path) throw new DataApiError("BACKUP_EXPORT_FAILED", "完整备份生成失败", 500);
    const fileName = `sora-backup-v1-${timestampFilePart()}.zip`;
    const archivePath = join(job.path, fileName);
    const bytes = await createArchive(output.path, archivePath);
    await writeJobMetadata(job.path, {
      jobId: job.jobId,
      kind: "backup-export",
      state: "READY",
      createdAt: new Date().toISOString(),
      fileName,
      bytes,
    });
    await rm(sourceRoot, { recursive: true, force: true });
    return { jobDirectory: job.path, archivePath, fileName, bytes };
  } catch (error) {
    await rm(job.path, { recursive: true, force: true });
    throw error;
  }
}

async function validateBackupDirectory(path: string): Promise<BackupValidation> {
  const result = await runProjectScript(
    "restore.mjs",
    [path, "--validate-only", "--json"],
    "BACKUP_INVALID",
    "备份校验失败或不是 Sora 完整备份",
  );
  const validation = JSON.parse(
    result.stdout.trim().split(/\r?\n/).at(-1) ?? "{}",
  ) as BackupValidation;
  if (
    validation.valid !== true ||
    typeof validation.createdAt !== "string" ||
    !Number.isInteger(validation.databaseBytes) ||
    !Number.isInteger(validation.uploads)
  ) {
    throw new DataApiError("BACKUP_INVALID", "备份校验结果不完整", 422);
  }
  return validation;
}

export async function stageFullBackupRestore(request: Request): Promise<RestoreJob> {
  await cleanupExpiredJobs();
  const job = await createJobDirectory("backup-restore");
  const archivePath = join(job.path, "backup.zip");
  const backupDirectory = join(job.path, "package");
  try {
    const archiveBytes = await saveArchiveRequest(request, archivePath);
    await extractArchive(archivePath, backupDirectory);
    const metadata: RestoreJob = {
      jobId: job.jobId,
      kind: "backup-restore",
      state: "READY",
      createdAt: new Date().toISOString(),
      sourceName: safeSourceName(request.headers.get("x-sora-filename")),
      archiveBytes,
      backup: await validateBackupDirectory(backupDirectory),
    };
    await writeJobMetadata(job.path, metadata);
    return metadata;
  } catch (error) {
    await rm(job.path, { recursive: true, force: true });
    throw error;
  }
}

export async function requestFullBackupRestore(jobId: string): Promise<RestoreJob> {
  const jobDirectory = resolveJobDirectory("backup-restore", jobId);
  const release = await acquireJobLock(jobDirectory);
  let metadata = await readJobMetadata<RestoreJob>(jobDirectory);
  try {
    if (metadata.kind !== "backup-restore" || metadata.state !== "READY") {
      throw new DataApiError("RESTORE_JOB_NOT_READY", "该备份不能再次提交恢复", 409);
    }
    await validateBackupDirectory(join(jobDirectory, "package"));
    const request = {
      version: 1,
      jobId,
      backupDirectory: join(jobDirectory, "package"),
      requestedAt: new Date().toISOString(),
    };
    let requestCreated = false;
    let markerCreated = false;
    try {
      const requestFile = await open(getRestoreRequestPath(), "wx", 0o600);
      requestCreated = true;
      await requestFile.writeFile(`${JSON.stringify(request, null, 2)}\n`, "utf8");
      await requestFile.close();
      const marker = await open(getMaintenanceMarkerPath(), "wx", 0o600);
      markerCreated = true;
      await marker.writeFile(
        `${JSON.stringify({ reason: "RESTORE", jobId, startedAt: request.requestedAt }, null, 2)}\n`,
        "utf8",
      );
      await marker.close();
      metadata = { ...metadata, state: "PENDING_RESTART" };
      await writeJobMetadata(jobDirectory, metadata);
    } catch (error) {
      if (requestCreated) await rm(getRestoreRequestPath(), { force: true });
      if (markerCreated) await rm(getMaintenanceMarkerPath(), { force: true });
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new DataApiError("RESTORE_ALREADY_PENDING", "已有完整恢复等待执行", 409);
      }
      throw error;
    }
    return metadata;
  } finally {
    await release();
  }
}
