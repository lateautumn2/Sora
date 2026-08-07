import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, open, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";

import yauzl, { type Entry } from "yauzl";
import yazl from "yazl";

import { getEnvironment } from "@/lib/env";

export class ArchiveError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}

function safeArchivePath(value: string): string {
  if (
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    /^[a-zA-Z]:/.test(value)
  ) {
    throw new ArchiveError("ARCHIVE_PATH_INVALID", "压缩包包含不安全路径");
  }
  const directory = value.endsWith("/");
  const parts = value.split("/").filter((part, index, values) => {
    return !(directory && index === values.length - 1 && part === "");
  });
  if (parts.length === 0 || parts.some((part) => !part || part === "." || part === "..")) {
    throw new ArchiveError("ARCHIVE_PATH_INVALID", "压缩包包含不安全路径");
  }
  return `${parts.join("/")}${directory ? "/" : ""}`;
}

function resolveArchivePath(root: string, archivePath: string): string {
  const target = resolve(root, ...archivePath.replace(/\/$/, "").split("/"));
  const resolvedRoot = resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${sep}`)) {
    throw new ArchiveError("ARCHIVE_PATH_INVALID", "压缩包路径超出目标目录");
  }
  return target;
}

function isSymbolicLink(entry: Entry): boolean {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (mode & 0o170000) === 0o120000;
}

export async function saveArchiveRequest(request: Request, targetPath: string): Promise<number> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/zip" && contentType !== "application/octet-stream") {
    throw new ArchiveError("ARCHIVE_TYPE_UNSUPPORTED", "仅支持 ZIP 压缩包", 415);
  }
  if (!request.body) throw new ArchiveError("ARCHIVE_BODY_MISSING", "没有收到压缩包内容", 400);

  const environment = getEnvironment();
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > environment.dataArchiveMaxBytes) {
    throw new ArchiveError("ARCHIVE_TOO_LARGE", "压缩包超过允许大小", 413);
  }

  await mkdir(dirname(targetPath), { recursive: true });
  const file = await open(targetPath, "wx");
  const reader = request.body.getReader();
  let bytes = 0;
  const signature = Buffer.alloc(4);
  let signatureBytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > environment.dataArchiveMaxBytes) {
        throw new ArchiveError("ARCHIVE_TOO_LARGE", "压缩包超过允许大小", 413);
      }
      if (signatureBytes < signature.length) {
        const copied = Math.min(signature.length - signatureBytes, chunk.value.byteLength);
        Buffer.from(chunk.value).copy(signature, signatureBytes, 0, copied);
        signatureBytes += copied;
      }
      await file.write(chunk.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    await file.close();
    await rm(targetPath, { force: true });
    throw error;
  }
  await file.close();

  const signatureText = signature.subarray(0, signatureBytes).toString("binary");
  if (
    bytes < 4 ||
    !["PK\u0003\u0004", "PK\u0005\u0006", "PK\u0007\u0008"].includes(signatureText)
  ) {
    await rm(targetPath, { force: true });
    throw new ArchiveError("ARCHIVE_SIGNATURE_INVALID", "文件不是有效 ZIP 压缩包", 415);
  }
  return bytes;
}

export interface ExtractedArchive {
  entries: number;
  expandedBytes: number;
}

export async function extractArchive(
  archivePath: string,
  destination: string,
): Promise<ExtractedArchive> {
  const environment = getEnvironment();
  await mkdir(destination, { recursive: true });
  const zip = await yauzl.openPromise(archivePath, {
    autoClose: false,
    decodeStrings: true,
    lazyEntries: true,
    strictFileNames: true,
    validateEntrySizes: true,
  });
  const seen = new Set<string>();
  let entries = 0;
  let expandedBytes = 0;
  try {
    for await (const entry of zip.eachEntry()) {
      entries += 1;
      if (entries > environment.dataArchiveMaxEntries) {
        throw new ArchiveError("ARCHIVE_ENTRY_LIMIT", "压缩包条目数量超过限制", 413);
      }
      if (entry.isEncrypted() || !entry.canDecodeFileData()) {
        throw new ArchiveError("ARCHIVE_ENTRY_UNSUPPORTED", "压缩包包含加密或不支持的条目");
      }
      if (isSymbolicLink(entry)) {
        throw new ArchiveError("ARCHIVE_LINK_REJECTED", "压缩包不能包含符号链接");
      }

      const archiveEntryPath = safeArchivePath(entry.fileName);
      const collisionKey = archiveEntryPath.replace(/\/$/, "").toLocaleLowerCase("en-US");
      if (seen.has(collisionKey)) {
        throw new ArchiveError("ARCHIVE_ENTRY_DUPLICATED", "压缩包包含重复路径");
      }
      seen.add(collisionKey);

      if (entry.uncompressedSize > environment.dataArchiveMaxEntryBytes) {
        throw new ArchiveError("ARCHIVE_ENTRY_TOO_LARGE", "压缩包单个条目超过限制", 413);
      }
      expandedBytes += entry.uncompressedSize;
      if (expandedBytes > environment.dataArchiveMaxExpandedBytes) {
        throw new ArchiveError("ARCHIVE_EXPANDED_TOO_LARGE", "压缩包展开大小超过限制", 413);
      }

      const targetPath = resolveArchivePath(destination, archiveEntryPath);
      if (archiveEntryPath.endsWith("/")) {
        await mkdir(targetPath, { recursive: true });
        continue;
      }
      await mkdir(dirname(targetPath), { recursive: true });
      const source = await zip.openReadStreamPromise(entry);
      await pipeline(source, createWriteStream(targetPath, { flags: "wx", mode: 0o600 }));
    }
    return { entries, expandedBytes };
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    if (error instanceof ArchiveError) throw error;
    throw new ArchiveError("ARCHIVE_INVALID", "ZIP 压缩包损坏或无法读取");
  } finally {
    zip.close();
  }
}

async function collectArchiveFiles(root: string, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: Array<{ path: string; size: number; mtime: Date }> = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) {
      throw new ArchiveError("ARCHIVE_SOURCE_LINK", "备份源目录不能包含符号链接");
    }
    if (metadata.isDirectory()) files.push(...(await collectArchiveFiles(root, path)));
    else if (metadata.isFile()) files.push({ path, size: metadata.size, mtime: metadata.mtime });
  }
  return files;
}

export async function createArchive(sourceDirectory: string, outputPath: string): Promise<number> {
  const partialPath = `${outputPath}.partial-${process.pid}-${Date.now()}`;
  await mkdir(dirname(outputPath), { recursive: true });
  const zip = new yazl.ZipFile();
  const destination = createWriteStream(partialPath, { flags: "wx", mode: 0o600 });
  const completed = new Promise<void>((resolvePromise, reject) => {
    destination.once("close", resolvePromise);
    destination.once("error", reject);
    zip.outputStream.once("error", reject);
  });
  try {
    zip.outputStream.pipe(destination);
    for (const file of await collectArchiveFiles(sourceDirectory)) {
      const archiveEntryPath = relative(sourceDirectory, file.path).replaceAll("\\", "/");
      zip.addFile(file.path, archiveEntryPath, {
        compress: true,
        mtime: file.mtime,
        mode: 0o100600,
      });
    }
    zip.end();
    await completed;
    await rename(partialPath, outputPath);
    return (await stat(outputPath)).size;
  } catch (error) {
    if ("destroy" in zip.outputStream && typeof zip.outputStream.destroy === "function") {
      zip.outputStream.destroy();
    }
    destination.destroy();
    await rm(partialPath, { force: true });
    throw error;
  }
}

export function archiveReadStream(path: string) {
  return createReadStream(path);
}
