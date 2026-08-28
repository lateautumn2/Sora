import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";

import sharp, { type Metadata } from "sharp";

import { getDatabaseConnection } from "@/lib/db/client";
import { getEnvironment } from "@/lib/env";

const maxUploadBytes = 10 * 1024 * 1024;
const supportedFormats = new Map([
  ["jpeg", { extension: "jpg", mimeType: "image/jpeg" }],
  ["png", { extension: "png", mimeType: "image/png" }],
  ["webp", { extension: "webp", mimeType: "image/webp" }],
  ["gif", { extension: "gif", mimeType: "image/gif" }],
  ["avif", { extension: "avif", mimeType: "image/avif" }],
]);

export interface MediaItem {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  sha256: string;
  altText: string;
  createdAt: number;
}

export type MediaSelectionItem = Pick<MediaItem, "id" | "storageKey" | "originalName" | "altText">;

export function listMedia(limit = 30, offset = 0): MediaItem[] {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, storage_key AS storageKey, original_name AS originalName,
              mime_type AS mimeType, byte_size AS byteSize, width, height,
              sha256, alt_text AS altText, created_at AS createdAt
       FROM media ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as MediaItem[];
}

export function listMediaForSelection(limit = 200): MediaSelectionItem[] {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, storage_key AS storageKey, original_name AS originalName, alt_text AS altText
       FROM media ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as MediaSelectionItem[];
}

/** 统计媒体文件总数，供媒体页分页计算总页数。 */
export function countMedia(): number {
  const row = getDatabaseConnection()
    .sqlite.prepare("SELECT COUNT(*) AS total FROM media")
    .get() as { total: number };
  return row.total;
}

function timestampName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function mediaDirectory(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function imageBaseName(value: string, extension: string, date: Date): string {
  // 名称会进入实际文件路径：移除路径分隔符、控制字符和 Windows 不允许的字符，
  // 同时限制长度，为实际扩展名和可能的冲突后缀预留空间。
  const cleaned = value
    .trim()
    .replace(/\.[^./\\]*$/u, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/^\.+|\.+$/gu, "")
    .trim();
  const fallback = cleaned || timestampName(date);
  return fallback.slice(0, Math.max(1, 255 - extension.length - 1));
}

async function writeMediaFile(
  input: Buffer,
  uploadRoot: string,
  directory: string,
  baseName: string,
  extension: string,
): Promise<{ storageKey: string; targetPath: string; fileName: string }> {
  const sqlite = getDatabaseConnection().sqlite;
  let suffix = 0;

  while (true) {
    const fileName = `${baseName}${suffix ? `-${suffix}` : ""}.${extension}`;
    const storageKey = `${directory}/${fileName}`;
    const targetPath = resolve(uploadRoot, storageKey);
    if (!targetPath.startsWith(`${uploadRoot}${sep}`)) {
      throw new Error("MEDIA_PATH_INVALID");
    }

    // 同名文件和同名数据库记录都要避开。后缀只用于处理同一秒内的重名上传，
    // 正常上传仍保持用户填写的名称，未填写时则保持 YYYYMMDDHHmmss 规范。
    const existing = sqlite
      .prepare("SELECT 1 AS present FROM media WHERE storage_key = ? LIMIT 1")
      .get(storageKey);
    if (existing) {
      suffix += 1;
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    try {
      await writeFile(targetPath, input, { flag: "wx" });
      return { storageKey, targetPath, fileName };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        suffix += 1;
        continue;
      }
      throw error;
    }
  }
}

/**
 * 保存上传图片。第二个参数兼容现有的 altText 表单字段，但其值现在同时作为
 * 图片名称使用；这样管理页和编辑器上传接口都能得到一致的文件命名行为。
 */
export async function storeMedia(file: File, imageName: string): Promise<MediaItem> {
  if (file.size <= 0 || file.size > maxUploadBytes) {
    throw new Error("MEDIA_SIZE_INVALID");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new Error("MEDIA_TYPE_INVALID");
  }
  const format = metadata.format ? supportedFormats.get(metadata.format) : undefined;
  if (!format) {
    throw new Error("MEDIA_TYPE_INVALID");
  }

  const now = new Date();
  const id = randomUUID();
  const uploadRoot = resolve(getEnvironment().uploadDir);
  const baseName = imageBaseName(imageName, format.extension, now);
  const { storageKey, targetPath, fileName } = await writeMediaFile(
    input,
    uploadRoot,
    mediaDirectory(now),
    baseName,
    format.extension,
  );
  const item: MediaItem = {
    id,
    storageKey,
    originalName: fileName,
    mimeType: format.mimeType,
    byteSize: input.byteLength,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sha256: createHash("sha256").update(input).digest("hex"),
    altText: imageName.trim().slice(0, 300),
    createdAt: Date.now(),
  };

  try {
    getDatabaseConnection()
      .sqlite.prepare(
        `INSERT INTO media (
           id, storage_key, original_name, mime_type, byte_size, width, height,
           sha256, alt_text, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        item.id,
        item.storageKey,
        item.originalName,
        item.mimeType,
        item.byteSize,
        item.width,
        item.height,
        item.sha256,
        item.altText,
        item.createdAt,
        item.createdAt,
      );
  } catch (error) {
    await unlink(targetPath).catch(() => undefined);
    throw error;
  }
  return item;
}

export async function deleteMedia(id: string): Promise<void> {
  const sqlite = getDatabaseConnection().sqlite;
  const item = sqlite
    .prepare("SELECT storage_key AS storageKey FROM media WHERE id = ?")
    .get(id) as { storageKey: string } | undefined;
  if (!item) return;
  sqlite.prepare("DELETE FROM media WHERE id = ?").run(id);
  const uploadRoot = resolve(getEnvironment().uploadDir);
  const targetPath = resolve(uploadRoot, item.storageKey);
  if (targetPath.startsWith(`${uploadRoot}${sep}`)) {
    await unlink(targetPath).catch(() => undefined);
  }
}

export async function readMedia(
  storageKey: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const uploadRoot = resolve(getEnvironment().uploadDir);
  const targetPath = resolve(uploadRoot, storageKey);
  if (!targetPath.startsWith(`${uploadRoot}${sep}`)) return null;
  const row = getDatabaseConnection()
    .sqlite.prepare("SELECT mime_type AS mimeType FROM media WHERE storage_key = ?")
    .get(storageKey) as { mimeType: string } | undefined;
  if (!row) return null;
  try {
    return { data: await readFile(targetPath), mimeType: row.mimeType };
  } catch {
    return null;
  }
}

export function suggestedMediaMarkdown(item: MediaItem): string {
  const alt = item.altText || item.originalName.replace(extname(item.originalName), "");
  return `![${alt.replaceAll("]", "\\]")}](\/media\/${item.storageKey})`;
}
