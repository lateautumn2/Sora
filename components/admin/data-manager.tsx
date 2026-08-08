"use client";

import { DatabaseBackup, Download, FileArchive, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPage, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Input } from "@/components/ui/input";

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
    <AdminPage>
      <AdminPageHeader description="内容迁移与完整数据备份。" title="数据管理" />

      <AdminSurface aria-labelledby="content-import-title">
        <div className="admin-data-section-heading">
          <FileArchive aria-hidden="true" size={20} />
          <div>
            <h2 id="content-import-title">导入内容包</h2>
            <p>先分析并预演，再写入现有站点。</p>
          </div>
        </div>
        <div className="admin-data-controls">
          <Field label="选择内容包 ZIP">
            <FileInput
              accept=".zip,application/zip"
              aria-label="选择内容包 ZIP"
              disabled={contentBusy || contentJob?.state === "SUCCEEDED"}
              onChange={(event) => {
                setContentFile(event.target.files?.[0] ?? null);
                setContentJob(null);
                setContentMessage("");
              }}
            />
          </Field>
          <Button
            disabled={!contentFile || contentBusy || Boolean(contentJob)}
            loading={contentBusy}
            onClick={() => void analyzeContentPackage()}
            type="button"
          >
            <Upload aria-hidden="true" size={17} />
            上传并分析
          </Button>
        </div>
        {contentBusy && contentProgress > 0 && contentProgress < 100 ? (
          <progress
            aria-label="内容包上传进度"
            className="admin-progress"
            max="100"
            value={contentProgress}
          />
        ) : null}
        {contentMessage ? (
          <pre className="admin-data-log" role="status">
            {contentMessage}
          </pre>
        ) : null}
        {contentJob ? (
          <div className="admin-data-result">
            <dl className="admin-data-counts">
              {contentCounts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {contentJob.state === "READY" ? (
              <Button
                disabled={contentBusy}
                onClick={() => void importContentPackage()}
                type="button"
              >
                <DatabaseBackup aria-hidden="true" size={17} />
                确认导入
              </Button>
            ) : null}
          </div>
        ) : null}
      </AdminSurface>

      <AdminSurface aria-labelledby="backup-export-title">
        <div className="admin-data-section-heading">
          <DatabaseBackup aria-hidden="true" size={20} />
          <div>
            <h2 id="backup-export-title">导出完整备份</h2>
            <p>下载数据库、上传文件与校验清单。</p>
          </div>
        </div>
        <a className="ui-button ui-button-link admin-data-download" href="/api/v1/admin/data/backups/export">
          <Download aria-hidden="true" size={17} />
          下载完整备份
        </a>
        <p className="admin-danger-copy">备份包含管理员凭据和评论者信息，请妥善保管。</p>
      </AdminSurface>

      <AdminSurface aria-labelledby="backup-restore-title">
        <div className="admin-data-section-heading">
          <RotateCcw aria-hidden="true" size={20} />
          <div>
            <h2 id="backup-restore-title">恢复完整备份</h2>
            <p>校验通过后仍需输入确认词并二次确认。</p>
          </div>
        </div>
        <div className="admin-data-controls">
          <Field label="选择完整备份 ZIP">
            <FileInput
              accept=".zip,application/zip"
              aria-label="选择完整备份 ZIP"
              disabled={restoreBusy || restoreJob?.state === "PENDING_RESTART"}
              onChange={(event) => {
                setRestoreFile(event.target.files?.[0] ?? null);
                setRestoreJob(null);
                setRestoreConfirmation("");
                setRestoreMessage("");
              }}
            />
          </Field>
          <Button
            disabled={!restoreFile || restoreBusy || Boolean(restoreJob)}
            loading={restoreBusy && !restoreJob}
            onClick={() => void analyzeRestore()}
            type="button"
          >
            <Upload aria-hidden="true" size={17} />
            上传并校验
          </Button>
        </div>
        {restoreBusy && restoreProgress > 0 && restoreProgress < 100 ? (
          <progress
            aria-label="备份上传进度"
            className="admin-progress"
            max="100"
            value={restoreProgress}
          />
        ) : null}
        {restoreMessage ? (
          <pre className="admin-data-log" role="status">
            {restoreMessage}
          </pre>
        ) : null}
        {restoreJob ? (
          <div className="admin-data-result">
            <dl className="admin-data-summary">
              <div>
                <dt>备份时间</dt>
                <dd>{new Date(restoreJob.backup.createdAt).toLocaleString("zh-CN")}</dd>
              </div>
              <div>
                <dt>数据库</dt>
                <dd>{formatBytes(restoreJob.backup.databaseBytes)}</dd>
              </div>
              <div>
                <dt>上传文件</dt>
                <dd>{restoreJob.backup.uploads}</dd>
              </div>
            </dl>
            {restoreJob.state === "READY" ? (
              <div className="admin-data-confirmation">
                <Field label="输入 RESTORE 确认恢复">
                  <Input
                    aria-label="输入 RESTORE 确认恢复"
                    autoComplete="off"
                    className="admin-data-confirmation-input"
                    onChange={(event) => setRestoreConfirmation(event.target.value)}
                    placeholder="RESTORE"
                    value={restoreConfirmation}
                  />
                </Field>
                <ConfirmDialog
                  confirmLabel="提交恢复请求"
                  description="服务将在下次启动时恢复该备份。此操作会替换当前数据。"
                  onConfirm={() => void confirmRestore()}
                  title="确认恢复完整备份"
                  trigger={
                    <Button
                      className="ui-button-danger"
                      disabled={restoreBusy || restoreConfirmation !== "RESTORE"}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={17} />
                      确认恢复
                    </Button>
                  }
                  triggerAsChild
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminSurface>
    </AdminPage>
  );
}
