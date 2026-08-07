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

export function listMedia(): MediaItem[] {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, storage_key AS storageKey, original_name AS originalName,
              mime_type AS mimeType, byte_size AS byteSize, width, height,
              sha256, alt_text AS altText, created_at AS createdAt
       FROM media ORDER BY created_at DESC`,
    )
    .all() as MediaItem[];
}

export async function storeMedia(file: File, altText: string): Promise<MediaItem> {
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
  const storageKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${format.extension}`;
  const uploadRoot = resolve(getEnvironment().uploadDir);
  const targetPath = resolve(uploadRoot, storageKey);
  if (!targetPath.startsWith(`${uploadRoot}${sep}`)) {
    throw new Error("MEDIA_PATH_INVALID");
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, input, { flag: "wx" });
  const item: MediaItem = {
    id,
    storageKey,
    originalName: file.name.slice(0, 255) || `image.${format.extension}`,
    mimeType: format.mimeType,
    byteSize: input.byteLength,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sha256: createHash("sha256").update(input).digest("hex"),
    altText: altText.trim().slice(0, 300),
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
