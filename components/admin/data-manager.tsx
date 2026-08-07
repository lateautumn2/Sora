"use client";

import { DatabaseBackup, Download, FileArchive, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState } from "react";

interface ContentJob {
  jobId: string;
  state: string;
  counts: {
    posts: number;
    pages: number;
    categories: number;
    tags: number;
    media: number;
    comments: number;
  };
}

interface RestoreJob {
  jobId: string;
  state: string;
  backup: {
    createdAt: string;
    databaseBytes: number;
    uploads: number;
  };
}

interface ApiResult<T> {
  data?: T;
  error?: { message?: string };
}

function uploadArchive<T>(
  file: File,
  endpoint: string,
  onProgress: (value: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint);
    request.setRequestHeader("Content-Type", "application/zip");
    request.setRequestHeader("X-Sora-Filename", file.name);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("网络连接中断，请重新上传"));
    request.onload = () => {
      const response = request.response as ApiResult<T> | null;
      if (request.status >= 200 && request.status < 300 && response?.data) resolve(response.data);
      else reject(new Error(response?.error?.message || "上传处理失败"));
    };
    request.send(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function postJson<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.data) throw new Error(result.error?.message || "操作失败");
  return result.data;
}

export function DataManager() {
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentJob, setContentJob] = useState<ContentJob | null>(null);
  const [contentBusy, setContentBusy] = useState(false);
  const [contentProgress, setContentProgress] = useState(0);
  const [contentMessage, setContentMessage] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreJob, setRestoreJob] = useState<RestoreJob | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");

  const contentCounts = useMemo(() => {
    if (!contentJob) return [];
    return [
      ["文章", contentJob.counts.posts],
      ["页面", contentJob.counts.pages],
      ["分类", contentJob.counts.categories],
      ["标签", contentJob.counts.tags],
      ["评论", contentJob.counts.comments],
      ["图片", contentJob.counts.media],
    ] as const;
  }, [contentJob]);

  async function analyzeContentPackage() {
    if (!contentFile) return;
    setContentBusy(true);
    setContentProgress(0);
    setContentJob(null);
    setContentMessage("正在上传内容包");
    try {
      const job = await uploadArchive<ContentJob>(
        contentFile,
        "/api/v1/admin/data/content-packages",
        setContentProgress,
      );
      setContentJob(job);
      setContentMessage("分析与导入预演通过");
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "内容包处理失败");
    } finally {
      setContentBusy(false);
    }
  }

  async function importContentPackage() {
    if (!contentJob) return;
    setContentBusy(true);
    setContentMessage("正在备份现有数据并导入内容");
    try {
      const job = await postJson<ContentJob>(
        `/api/v1/admin/data/content-packages/${contentJob.jobId}/import`,
      );
      setContentJob(job);
      setContentMessage("内容包已导入并验证通过");
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "内容包导入失败");
    } finally {
      setContentBusy(false);
    }
  }

  async function analyzeRestore() {
    if (!restoreFile) return;
    setRestoreBusy(true);
    setRestoreProgress(0);
    setRestoreJob(null);
    setRestoreMessage("正在上传并校验完整备份");
    try {
      const job = await uploadArchive<RestoreJob>(
        restoreFile,
        "/api/v1/admin/data/backups/restore",
        setRestoreProgress,
      );
      setRestoreJob(job);
      setRestoreMessage("备份结构、哈希和 SQLite 完整性校验通过");
    } catch (error) {
      setRestoreMessage(error instanceof Error ? error.message : "备份校验失败");
    } finally {
      setRestoreBusy(false);
    }
  }

  async function confirmRestore() {
    if (!restoreJob || restoreConfirmation !== "RESTORE") return;
    setRestoreBusy(true);
    setRestoreMessage("正在提交恢复请求");
    try {
      const result = await postJson<RestoreJob & { message?: string }>(
        `/api/v1/admin/data/backups/restore/${restoreJob.jobId}/confirm`,
        { confirmation: restoreConfirmation },
      );
      setRestoreJob(result);
      setRestoreMessage(result.message ?? "恢复请求已提交");
    } catch (error) {
      setRestoreMessage(error instanceof Error ? error.message : "恢复请求提交失败");
    } finally {
      setRestoreBusy(false);
    }
  }

  return (
    <div>
      <header className="border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">数据管理</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">内容迁移与完整数据备份</p>
      </header>

      <section className="border-b border-[var(--border)] py-8">
        <div className="flex items-center gap-2">
          <FileArchive aria-hidden="true" size={20} />
          <h2 className="text-lg font-semibold">导入内容包</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            accept=".zip,application/zip"
            aria-label="选择内容包 ZIP"
            className="form-input max-w-xl flex-1 py-2"
            disabled={contentBusy || contentJob?.state === "SUCCEEDED"}
            onChange={(event) => {
              setContentFile(event.target.files?.[0] ?? null);
              setContentJob(null);
              setContentMessage("");
            }}
            type="file"
          />
          <button
            className="primary-button justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!contentFile || contentBusy || Boolean(contentJob)}
            onClick={() => void analyzeContentPackage()}
            type="button"
          >
            <Upload aria-hidden="true" size={17} />
            上传并分析
          </button>
        </div>
        {contentBusy && contentProgress > 0 && contentProgress < 100 ? (
          <progress
            aria-label="内容包上传进度"
            className="mt-4 w-full max-w-xl"
            max="100"
            value={contentProgress}
          />
        ) : null}
        {contentMessage ? (
          <p className="mt-4 text-sm" role="status">
            {contentMessage}
          </p>
        ) : null}
        {contentJob ? (
          <div className="mt-5 bg-[var(--surface)] p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {contentCounts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="mt-1 font-mono text-base font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {contentJob.state === "READY" ? (
              <button
                className="primary-button mt-5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={contentBusy}
                onClick={() => void importContentPackage()}
                type="button"
              >
                <DatabaseBackup aria-hidden="true" size={17} />
                确认导入
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="border-b border-[var(--border)] py-8">
        <div className="flex items-center gap-2">
          <DatabaseBackup aria-hidden="true" size={20} />
          <h2 className="text-lg font-semibold">导出完整备份</h2>
        </div>
        <a className="primary-button mt-4 w-fit" href="/api/v1/admin/data/backups/export">
          <Download aria-hidden="true" size={17} />
          下载完整备份
        </a>
        <p className="mt-3 text-sm text-[var(--danger)]">
          备份包含管理员凭据和评论者信息，请妥善保管。
        </p>
      </section>

      <section className="py-8">
        <div className="flex items-center gap-2">
          <RotateCcw aria-hidden="true" size={20} />
          <h2 className="text-lg font-semibold">恢复完整备份</h2>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            accept=".zip,application/zip"
            aria-label="选择完整备份 ZIP"
            className="form-input max-w-xl flex-1 py-2"
            disabled={restoreBusy || restoreJob?.state === "PENDING_RESTART"}
            onChange={(event) => {
              setRestoreFile(event.target.files?.[0] ?? null);
              setRestoreJob(null);
              setRestoreConfirmation("");
              setRestoreMessage("");
            }}
            type="file"
          />
          <button
            className="primary-button justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!restoreFile || restoreBusy || Boolean(restoreJob)}
            onClick={() => void analyzeRestore()}
            type="button"
          >
            <Upload aria-hidden="true" size={17} />
            上传并校验
          </button>
        </div>
        {restoreBusy && restoreProgress > 0 && restoreProgress < 100 ? (
          <progress
            aria-label="备份上传进度"
            className="mt-4 w-full max-w-xl"
            max="100"
            value={restoreProgress}
          />
        ) : null}
        {restoreMessage ? (
          <p className="mt-4 text-sm" role="status">
            {restoreMessage}
          </p>
        ) : null}
        {restoreJob ? (
          <div className="mt-5 bg-[var(--surface)] p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[var(--muted)]">备份时间</dt>
                <dd className="mt-1">
                  {new Date(restoreJob.backup.createdAt).toLocaleString("zh-CN")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">数据库</dt>
                <dd className="mt-1 font-mono">{formatBytes(restoreJob.backup.databaseBytes)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">上传文件</dt>
                <dd className="mt-1 font-mono">{restoreJob.backup.uploads}</dd>
              </div>
            </dl>
            {restoreJob.state === "READY" ? (
              <div className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
                <input
                  aria-label="输入 RESTORE 确认恢复"
                  autoComplete="off"
                  className="form-input flex-1 font-mono"
                  onChange={(event) => setRestoreConfirmation(event.target.value)}
                  placeholder="RESTORE"
                  value={restoreConfirmation}
                />
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--danger)] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={restoreBusy || restoreConfirmation !== "RESTORE"}
                  onClick={() => void confirmRestore()}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={17} />
                  确认恢复
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
