import { mkdir, readFile, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import { extractArchive, saveArchiveRequest } from "@/lib/data/archive";
import { DataApiError } from "@/lib/data/api";
import {
  acquireJobLock,
  cleanupExpiredJobs,
  createJobDirectory,
  getRuntimeDataRoot,
  readJobMetadata,
  resolveJobDirectory,
  writeJobMetadata,
} from "@/lib/data/jobs";
import { runProjectScript } from "@/lib/data/process";
import { getEnvironment } from "@/lib/env";

export interface ContentPackageCounts {
  posts: number;
  pages: number;
  categories: number;
  tags: number;
  media: number;
  comments: number;
}

interface ContentJob {
  jobId: string;
  kind: "content-import";
  state: "READY" | "IMPORTING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
  sourceName: string;
  archiveBytes: number;
  counts: ContentPackageCounts;
  error?: string;
  completedAt?: string;
  automaticBackup?: string;
}

function safeSourceName(value: string | null): string {
  const name = basename((value ?? "content-package.zip").replaceAll("\\", "/"));
  return name.replace(/[^\p{Letter}\p{Number}._ -]+/gu, "-").slice(0, 160) || "content-package.zip";
}

async function readContentCounts(packageDirectory: string): Promise<ContentPackageCounts> {
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(await readFile(join(packageDirectory, "manifest.json"), "utf8"));
  } catch {
    throw new DataApiError("CONTENT_MANIFEST_INVALID", "内容包缺少有效 manifest.json", 422);
  }
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const comments = items.reduce((sum, item) => {
    if (!item || typeof item !== "object") return sum;
    const value = (item as { comments?: unknown }).comments;
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);
  return {
    posts: items.filter((item) => (item as { kind?: unknown })?.kind === "POST").length,
    pages: items.filter((item) => (item as { kind?: unknown })?.kind === "PAGE").length,
    categories: Array.isArray(manifest.categories) ? manifest.categories.length : 0,
    tags: Array.isArray(manifest.tags) ? manifest.tags.length : 0,
    media: Array.isArray(manifest.media) ? manifest.media.length : 0,
    comments,
  };
}

async function runContentCommand(
  command: "analyze" | "dry-run" | "import" | "verify",
  source: string,
) {
  const environment = getEnvironment();
  return runProjectScript(
    "content-import.mjs",
    [
      command,
      "--source",
      source,
      "--database",
      environment.databasePath,
      "--uploads",
      environment.uploadDir,
    ],
    `CONTENT_${command.toUpperCase().replace("-", "_")}_FAILED`,
    command === "dry-run" ? "内容包与现有数据存在冲突" : `内容包${command}阶段失败`,
  );
}

export async function stageContentPackage(request: Request): Promise<ContentJob> {
  await cleanupExpiredJobs();
  const job = await createJobDirectory("content-import");
  const archivePath = join(job.path, "package.zip");
  const packageDirectory = join(job.path, "package");
  try {
    const archiveBytes = await saveArchiveRequest(request, archivePath);
    await extractArchive(archivePath, packageDirectory);
    await runContentCommand("analyze", packageDirectory);
    await runContentCommand("dry-run", packageDirectory);
    const metadata: ContentJob = {
      jobId: job.jobId,
      kind: "content-import",
      state: "READY",
      createdAt: new Date().toISOString(),
      sourceName: safeSourceName(request.headers.get("x-sora-filename")),
      archiveBytes,
      counts: await readContentCounts(packageDirectory),
    };
    await writeJobMetadata(job.path, metadata);
    return metadata;
  } catch (error) {
    await rm(job.path, { recursive: true, force: true });
    throw error;
  }
}

export async function importStagedContentPackage(jobId: string): Promise<ContentJob> {
  const jobDirectory = resolveJobDirectory("content-import", jobId);
  const release = await acquireJobLock(jobDirectory);
  let metadata = await readJobMetadata<ContentJob>(jobDirectory);
  try {
    if (metadata.kind !== "content-import" || metadata.state !== "READY") {
      throw new DataApiError("CONTENT_JOB_NOT_READY", "内容包任务不能再次导入", 409);
    }
    metadata = { ...metadata, state: "IMPORTING", error: undefined };
    await writeJobMetadata(jobDirectory, metadata);
    const packageDirectory = join(jobDirectory, "package");
    await runContentCommand("dry-run", packageDirectory);

    const backupRoot = resolve(getRuntimeDataRoot(), "automatic-backups", "before-content-import");
    await mkdir(backupRoot, { recursive: true });
    const backup = await runProjectScript(
      "backup.mjs",
      ["--output", backupRoot, "--json"],
      "CONTENT_BACKUP_FAILED",
      "导入前备份失败，内容包未写入",
    );
    const backupResult = JSON.parse(backup.stdout.trim().split(/\r?\n/).at(-1) ?? "{}") as {
      path?: string;
    };

    await runContentCommand("import", packageDirectory);
    await runContentCommand("verify", packageDirectory);
    metadata = {
      ...metadata,
      state: "SUCCEEDED",
      completedAt: new Date().toISOString(),
      automaticBackup: backupResult.path ? basename(backupResult.path) : undefined,
    };
    await writeJobMetadata(jobDirectory, metadata);
    await rm(join(jobDirectory, "package.zip"), { force: true });
    await rm(packageDirectory, { recursive: true, force: true });
    return metadata;
  } catch (error) {
    metadata = {
      ...metadata,
      state: "FAILED",
      error: error instanceof Error ? error.message : "内容导入失败",
      completedAt: new Date().toISOString(),
    };
    await writeJobMetadata(jobDirectory, metadata).catch(() => undefined);
    throw error;
  } finally {
    await release();
  }
}
