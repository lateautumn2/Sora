#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve, sep } from "node:path";

const PACKAGE_FORMAT = "sora-content-package";
const PACKAGE_VERSION = 1;
const CONTENT_STATUSES = new Set(["DRAFT", "PUBLISHED", "TRASHED"]);
const VISIBILITIES = new Set(["PUBLIC", "PRIVATE"]);
const COMMENT_STATUSES = new Set(["PENDING", "APPROVED", "SPAM", "TRASHED"]);
let DatabaseConstructor;
let hljs;
let Marked;
let Renderer;
let sanitizeHtml;
let sharp;

async function loadDatabaseDependency() {
  DatabaseConstructor ??= (await import("better-sqlite3")).default;
}

async function loadImportDependencies() {
  await loadDatabaseDependency();
  hljs ??= (await import("highlight.js")).default;
  ({ Marked, Renderer } = await import("marked"));
  sanitizeHtml ??= (await import("sanitize-html")).default;
  sharp ??= (await import("sharp")).default;
}

function parseArguments(argv) {
  const values = argv.filter((value) => value !== "--");
  const command = values.shift();
  const options = {
    command,
    source: "./converted/halo",
    database: process.env.DATABASE_PATH ?? "./data/blog.db",
    uploads: process.env.UPLOAD_DIR ?? "./data/uploads",
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--source") options.source = values[++index];
    else if (value === "--database") options.database = values[++index];
    else if (value === "--uploads") options.uploads = values[++index];
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return options;
}

function printHelp() {
  console.log(`Sora 通用内容包导入器

用法：
  node scripts/content-import.mjs analyze --source ./converted/halo
  node scripts/content-import.mjs dry-run --source ./converted/halo
  node scripts/content-import.mjs import --source ./converted/halo
  node scripts/content-import.mjs verify --source ./converted/halo

可选参数：
  --database <path>   SQLite 路径，默认读取 DATABASE_PATH 或 ./data/blog.db
  --uploads <path>    上传目录，默认读取 UPLOAD_DIR 或 ./data/uploads`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function addError(result, code, object, message) {
  result.errors.push({ code, object, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafePackagePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.startsWith("/")) {
    return false;
  }
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}

function resolveInside(root, packagePath) {
  if (!isSafePackagePath(packagePath)) throw new Error(`不安全的包内路径：${packagePath}`);
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, ...packagePath.split("/"));
  if (!target.startsWith(`${resolvedRoot}${sep}`)) throw new Error(`路径越界：${packagePath}`);
  return target;
}

function toTimestamp(value, fieldName) {
  if (value === null || value === undefined) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${fieldName} 不是有效 ISO 时间：${value}`);
  return timestamp;
}

function safeStoragePart(value) {
  const cleaned = String(value)
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);
  return cleaned || "file";
}

function mediaStorageKey(media) {
  const fileName = safeStoragePart(media.originalName || basename(media.path));
  const extension = extname(fileName) || extname(media.path);
  const finalName = extension ? fileName : `${fileName}.bin`;
  return `imported/${safeStoragePart(media.id)}/${finalName}`;
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function inspectPackage(sourceDirectory) {
  const sourceRoot = resolve(sourceDirectory);
  const result = {
    sourceRoot,
    manifest: null,
    markdown: new Map(),
    mediaFiles: new Map(),
    errors: [],
    warnings: [],
    counts: {},
  };

  let manifest;
  try {
    manifest = JSON.parse(await readFile(resolve(sourceRoot, "manifest.json"), "utf8"));
  } catch (error) {
    addError(result, "MANIFEST_READ_FAILED", "manifest.json", error.message);
    return result;
  }
  result.manifest = manifest;
  if (
    !isRecord(manifest) ||
    manifest.format !== PACKAGE_FORMAT ||
    manifest.version !== PACKAGE_VERSION
  ) {
    addError(
      result,
      "PACKAGE_VERSION_UNSUPPORTED",
      "manifest.json",
      `仅支持 ${PACKAGE_FORMAT} v${PACKAGE_VERSION}`,
    );
    return result;
  }

  for (const field of ["categories", "tags", "media", "items"]) {
    if (!Array.isArray(manifest[field])) {
      addError(result, "MANIFEST_FIELD_INVALID", field, `${field} 必须是数组`);
      manifest[field] = [];
    }
  }

  const ensureUnique = (values, field, type) => {
    const seen = new Set();
    for (const value of values) {
      const key = value?.[field];
      if (typeof key !== "string" || !key.trim()) {
        addError(result, "IDENTIFIER_INVALID", type, `${field} 必须是非空字符串`);
      } else if (seen.has(key)) {
        addError(result, "IDENTIFIER_DUPLICATED", key, `${type}.${field} 重复`);
      }
      seen.add(key);
    }
    return seen;
  };

  const categoryIds = ensureUnique(manifest.categories, "id", "category");
  const tagIds = ensureUnique(manifest.tags, "id", "tag");
  const mediaIds = ensureUnique(manifest.media, "id", "media");
  const itemIds = ensureUnique(manifest.items, "id", "item");
  ensureUnique(manifest.categories, "slug", "category");
  ensureUnique(manifest.tags, "slug", "tag");
  ensureUnique(manifest.items, "slug", "item");

  for (const category of manifest.categories) {
    if (!category.name || !category.slug) {
      addError(result, "CATEGORY_INVALID", category.id, "分类必须包含 name 与 slug");
    }
    if (category.parentId && !categoryIds.has(category.parentId)) {
      addError(result, "CATEGORY_PARENT_MISSING", category.id, `找不到父分类 ${category.parentId}`);
    }
  }
  for (const tag of manifest.tags) {
    if (!tag.name || !tag.slug)
      addError(result, "TAG_INVALID", tag.id, "标签必须包含 name 与 slug");
  }

  for (const media of manifest.media) {
    if (
      !isSafePackagePath(media.path) ||
      typeof media.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(media.sha256) ||
      !Number.isInteger(media.byteSize) ||
      media.byteSize < 0 ||
      typeof media.mimeType !== "string" ||
      !media.mimeType.startsWith("image/")
    ) {
      addError(result, "MEDIA_INVALID", media.id, "媒体路径、哈希、大小或 MIME 不合法");
      continue;
    }
    try {
      const path = resolveInside(sourceRoot, media.path);
      const data = await readFile(path);
      if (data.byteLength !== media.byteSize) {
        addError(result, "MEDIA_SIZE_MISMATCH", media.id, "媒体大小与 manifest 不一致");
      }
      if (sha256(data) !== media.sha256) {
        addError(result, "MEDIA_HASH_MISMATCH", media.id, "媒体 SHA-256 与 manifest 不一致");
      }
      result.mediaFiles.set(media.id, { path, data });
    } catch (error) {
      addError(result, "MEDIA_READ_FAILED", media.id, error.message);
    }
  }

  const allCommentIds = new Set();
  for (const item of manifest.items) {
    if (
      !["POST", "PAGE"].includes(item.kind) ||
      !item.title ||
      !item.slug ||
      !CONTENT_STATUSES.has(item.status) ||
      !VISIBILITIES.has(item.visibility) ||
      !isSafePackagePath(item.markdown)
    ) {
      addError(result, "CONTENT_INVALID", item.id, "内容基础字段不合法");
      continue;
    }
    for (const categoryId of item.categories ?? []) {
      if (!categoryIds.has(categoryId)) {
        addError(result, "CONTENT_CATEGORY_MISSING", item.id, `找不到分类 ${categoryId}`);
      }
    }
    for (const tagId of item.tags ?? []) {
      if (!tagIds.has(tagId))
        addError(result, "CONTENT_TAG_MISSING", item.id, `找不到标签 ${tagId}`);
    }
    for (const mediaId of item.media ?? []) {
      if (!mediaIds.has(mediaId))
        addError(result, "CONTENT_MEDIA_MISSING", item.id, `找不到媒体 ${mediaId}`);
    }

    try {
      toTimestamp(item.createdAt, `${item.id}.createdAt`);
      toTimestamp(item.updatedAt, `${item.id}.updatedAt`);
      toTimestamp(item.publishedAt, `${item.id}.publishedAt`);
      const markdownPath = resolveInside(sourceRoot, item.markdown);
      const markdown = await readFile(markdownPath, "utf8");
      if (item.markdownSha256 && sha256(markdown) !== item.markdownSha256) {
        addError(result, "MARKDOWN_HASH_MISMATCH", item.id, "Markdown SHA-256 与 manifest 不一致");
      }
      result.markdown.set(item.id, markdown);
    } catch (error) {
      addError(result, "MARKDOWN_READ_FAILED", item.id, error.message);
    }

    const comments = Array.isArray(item.comments) ? item.comments : [];
    const localCommentIds = ensureUnique(comments, "id", `item:${item.id}:comment`);
    for (const comment of comments) {
      if (allCommentIds.has(comment.id)) {
        addError(result, "COMMENT_ID_DUPLICATED", comment.id, "评论 ID 在不同内容间重复");
      }
      allCommentIds.add(comment.id);
      if (!COMMENT_STATUSES.has(comment.status) || !comment.authorName || !comment.content) {
        addError(result, "COMMENT_INVALID", comment.id, "评论状态、作者或内容不合法");
      }
      if (comment.parentId && !localCommentIds.has(comment.parentId)) {
        addError(result, "COMMENT_PARENT_MISSING", comment.id, `找不到父评论 ${comment.parentId}`);
      }
      try {
        toTimestamp(comment.createdAt, `${comment.id}.createdAt`);
        toTimestamp(comment.updatedAt, `${comment.id}.updatedAt`);
        toTimestamp(comment.approvedAt, `${comment.id}.approvedAt`);
      } catch (error) {
        addError(result, "COMMENT_TIME_INVALID", comment.id, error.message);
      }
    }
  }

  result.counts = {
    items: itemIds.size,
    posts: manifest.items.filter((item) => item.kind === "POST").length,
    pages: manifest.items.filter((item) => item.kind === "PAGE").length,
    categories: categoryIds.size,
    tags: tagIds.size,
    media: mediaIds.size,
    comments: allCommentIds.size,
  };
  return result;
}

function assertPackageValid(inspection) {
  if (inspection.errors.length > 0) {
    const preview = inspection.errors
      .slice(0, 8)
      .map((error) => `${error.code}(${error.object}): ${error.message}`)
      .join("\n");
    throw new Error(`内容包校验失败，共 ${inspection.errors.length} 项：\n${preview}`);
  }
}

function openDatabase(databasePath, readonly = false) {
  const path = resolve(databasePath);
  if (!DatabaseConstructor) throw new Error("数据库依赖尚未加载");
  const sqlite = new DatabaseConstructor(path, { readonly, fileMustExist: true });
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const requiredTables = ["posts", "categories", "tags", "media", "comments", "post_revisions"];
  const tables = new Set(
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name),
  );
  const missing = requiredTables.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    sqlite.close();
    throw new Error(`目标数据库尚未迁移，缺少表：${missing.join(", ")}`);
  }
  return { sqlite, path };
}

async function detectConflicts(inspection, sqlite, uploadDirectory) {
  const conflicts = [];
  const manifest = inspection.manifest;
  const checks = [
    ["categories", manifest.categories, ["id", "slug"]],
    ["tags", manifest.tags, ["id", "slug", "name"]],
    ["posts", manifest.items, ["id", "slug"]],
    ["media", manifest.media, ["id"]],
  ];
  for (const [table, rows, fields] of checks) {
    for (const row of rows) {
      for (const field of fields) {
        if (sqlite.prepare(`SELECT 1 FROM ${table} WHERE ${field} = ? LIMIT 1`).get(row[field])) {
          conflicts.push({ type: "DATABASE", object: `${table}.${field}`, value: row[field] });
        }
      }
    }
  }
  for (const item of manifest.items) {
    for (const comment of item.comments ?? []) {
      if (sqlite.prepare("SELECT 1 FROM comments WHERE id = ? LIMIT 1").get(comment.id)) {
        conflicts.push({ type: "DATABASE", object: "comments.id", value: comment.id });
      }
    }
  }

  const uploadRoot = resolve(uploadDirectory);
  for (const media of manifest.media) {
    const storageKey = mediaStorageKey(media);
    const target = resolveInside(uploadRoot, storageKey);
    if (await fileExists(target)) {
      conflicts.push({ type: "FILE", object: storageKey, value: target });
    }
  }
  return conflicts;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function createMarkdownParser() {
  const renderer = new Renderer();
  const headingCounts = new Map();
  renderer.code = ({ text, lang }) => {
    const requested = lang?.trim().split(/\s+/)[0] ?? "";
    const language = requested && hljs.getLanguage(requested) ? requested : undefined;
    const highlighted = language
      ? hljs.highlight(text, { language }).value
      : hljs.highlightAuto(text).value;
    const className = language ? `hljs language-${escapeAttribute(language)}` : "hljs";
    return `<pre><code class="${className}">${highlighted}</code></pre>\n`;
  };
  renderer.heading = ({ depth, text }) => {
    const base =
      text
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "section";
    const count = headingCounts.get(base) ?? 0;
    headingCounts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    return `<h${depth} id="${escapeAttribute(id)}">${text}</h${depth}>\n`;
  };
  renderer.link = ({ href, title, text }) => {
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
    return `<a href="${escapeAttribute(href)}"${titleAttribute} rel="nofollow noopener noreferrer">${text}</a>`;
  };
  return new Marked({ gfm: true, breaks: false, renderer });
}

function plainTextFromHtml(html) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value) {
  const cjk =
    value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)
      ?.length ?? 0;
  const words =
    value
      .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
      .match(/[\p{Letter}\p{Number}]+(?:['-][\p{Letter}\p{Number}]+)*/gu)?.length ?? 0;
  return cjk + words;
}

function renderMarkdown(source, requestedExcerpt) {
  const unsafe = String(createMarkdownParser().parse(source));
  const html = sanitizeHtml(unsafe, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "details",
      "div",
      "em",
      "figcaption",
      "figure",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "kbd",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "sub",
      "summary",
      "sup",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      code: ["class"],
      div: ["class"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      span: ["class"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
  });
  const plainText = plainTextFromHtml(html);
  const wordCount = countWords(plainText);
  const fallbackExcerpt =
    plainText.length > 160 ? `${plainText.slice(0, 160).trim()}...` : plainText;
  return {
    html,
    plainText,
    excerpt: requestedExcerpt?.trim() || fallbackExcerpt,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 300)),
  };
}

function renderComment(source) {
  const unsafe = String(createMarkdownParser().parse(source));
  return sanitizeHtml(unsafe, {
    allowedTags: ["a", "blockquote", "br", "code", "em", "li", "ol", "p", "pre", "strong", "ul"],
    allowedAttributes: { a: ["href", "title", "rel"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}

function rewritePackageMedia(markdown, manifest) {
  let rewritten = markdown;
  for (const media of manifest.media) {
    const target = `/media/${mediaStorageKey(media)}`;
    const references = [
      `../${media.path}`,
      `./${media.path}`,
      media.path,
      `/${media.path}`,
      encodeURI(`../${media.path}`),
      ...(media.sourceUrls ?? []),
    ];
    for (const reference of new Set(references.filter(Boolean))) {
      rewritten = rewritten.replaceAll(reference, target);
    }
  }
  return rewritten;
}

async function prepareMedia(inspection, uploadRoot, stageRoot) {
  const prepared = [];
  for (const media of inspection.manifest.media) {
    const storageKey = mediaStorageKey(media);
    const source = inspection.mediaFiles.get(media.id);
    const stagePath = resolveInside(stageRoot, storageKey);
    await mkdir(dirname(stagePath), { recursive: true });
    await copyFile(source.path, stagePath);
    let metadata = {};
    try {
      metadata = await sharp(source.data, { animated: true }).metadata();
    } catch {
      throw new Error(`媒体 ${media.id} 不是 Sora 可读取的图片`);
    }
    prepared.push({
      ...media,
      storageKey,
      stagePath,
      targetPath: resolveInside(uploadRoot, storageKey),
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    });
  }
  return prepared;
}

function sortComments(comments) {
  const remaining = new Map(comments.map((comment) => [comment.id, comment]));
  const ordered = [];
  const inserted = new Set();
  while (remaining.size > 0) {
    let progressed = false;
    for (const [id, comment] of remaining) {
      if (!comment.parentId || inserted.has(comment.parentId)) {
        ordered.push(comment);
        inserted.add(id);
        remaining.delete(id);
        progressed = true;
      }
    }
    if (!progressed) throw new Error("评论父链存在循环");
  }
  return ordered;
}

async function importPackage(inspection, databasePath, uploadDirectory) {
  assertPackageValid(inspection);
  const uploadRoot = resolve(uploadDirectory);
  await mkdir(uploadRoot, { recursive: true });
  const connection = openDatabase(databasePath);
  const { sqlite } = connection;
  const conflicts = await detectConflicts(inspection, sqlite, uploadRoot);
  if (conflicts.length > 0) {
    sqlite.close();
    throw new Error(
      `检测到 ${conflicts.length} 个冲突，已按 abort 策略终止。首项：${JSON.stringify(conflicts[0])}`,
    );
  }

  const runId = randomUUID();
  const stageRoot = resolve(uploadRoot, `.import-stage-${runId}`);
  const moved = [];
  await mkdir(stageRoot, { recursive: true });
  try {
    const preparedMedia = await prepareMedia(inspection, uploadRoot, stageRoot);
    for (const media of preparedMedia) {
      await mkdir(dirname(media.targetPath), { recursive: true });
      await rename(media.stagePath, media.targetPath);
      moved.push(media.targetPath);
    }

    const manifest = inspection.manifest;
    sqlite.transaction(() => {
      for (const category of manifest.categories) {
        const now = toTimestamp(category.createdAt, `${category.id}.createdAt`) ?? Date.now();
        sqlite
          .prepare(
            `INSERT INTO categories (
               id, name, slug, description, parent_id, sort_order, created_at, updated_at
             ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
          )
          .run(
            category.id,
            category.name,
            category.slug,
            category.description ?? "",
            category.sortOrder ?? 0,
            now,
            toTimestamp(category.updatedAt, `${category.id}.updatedAt`) ?? now,
          );
      }
      for (const category of manifest.categories) {
        if (category.parentId) {
          sqlite
            .prepare("UPDATE categories SET parent_id = ? WHERE id = ?")
            .run(category.parentId, category.id);
        }
      }
      for (const tag of manifest.tags) {
        const now = toTimestamp(tag.createdAt, `${tag.id}.createdAt`) ?? Date.now();
        sqlite
          .prepare(
            `INSERT INTO tags (id, name, slug, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            tag.id,
            tag.name,
            tag.slug,
            tag.description ?? "",
            now,
            toTimestamp(tag.updatedAt, `${tag.id}.updatedAt`) ?? now,
          );
      }
      for (const media of preparedMedia) {
        const createdAt = toTimestamp(media.createdAt, `${media.id}.createdAt`) ?? Date.now();
        sqlite
          .prepare(
            `INSERT INTO media (
               id, storage_key, original_name, mime_type, byte_size, width, height,
               sha256, alt_text, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
          )
          .run(
            media.id,
            media.storageKey,
            media.originalName,
            media.mimeType,
            media.byteSize,
            media.width,
            media.height,
            media.sha256,
            createdAt,
            createdAt,
          );
      }

      for (const item of manifest.items) {
        const sourceContent = rewritePackageMedia(inspection.markdown.get(item.id), manifest);
        const rendered = renderMarkdown(sourceContent, item.excerpt);
        const createdAt = toTimestamp(item.createdAt, `${item.id}.createdAt`) ?? Date.now();
        const updatedAt = toTimestamp(item.updatedAt, `${item.id}.updatedAt`) ?? createdAt;
        const publishedAt = toTimestamp(item.publishedAt, `${item.id}.publishedAt`);
        const comments = item.comments ?? [];
        const approvedComments = comments.filter((comment) => comment.status === "APPROVED").length;
        sqlite
          .prepare(
            `INSERT INTO posts (
               id, kind, title, slug, excerpt, source_content, source_format,
               rendered_html, plain_text, status, visibility, allow_comment,
               pinned, published_at, created_at, updated_at, word_count,
               reading_minutes, view_count, upvote_count, comment_count
             ) VALUES (
               ?, ?, ?, ?, ?, ?, 'MARKDOWN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             )`,
          )
          .run(
            item.id,
            item.kind,
            item.title,
            item.slug,
            rendered.excerpt,
            sourceContent,
            rendered.html,
            rendered.plainText,
            item.status,
            item.visibility,
            item.allowComment ? 1 : 0,
            item.kind === "POST" && item.pinned ? 1 : 0,
            publishedAt,
            createdAt,
            updatedAt,
            rendered.wordCount,
            rendered.readingMinutes,
            Math.max(0, Number(item.stats?.views) || 0),
            Math.max(0, Number(item.stats?.upvotes) || 0),
            approvedComments,
          );
        sqlite
          .prepare(
            `INSERT INTO post_revisions (
               id, post_id, title, excerpt, source_content, source_format, reason, created_at
             ) VALUES (?, ?, ?, ?, ?, 'MARKDOWN', 'MIGRATION', ?)`,
          )
          .run(randomUUID(), item.id, item.title, rendered.excerpt, sourceContent, updatedAt);

        if (item.kind === "POST") {
          item.categories.forEach((categoryId, index) => {
            sqlite
              .prepare(
                "INSERT INTO post_categories (post_id, category_id, sort_order) VALUES (?, ?, ?)",
              )
              .run(item.id, categoryId, index);
          });
          for (const tagId of item.tags) {
            sqlite
              .prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)")
              .run(item.id, tagId);
          }
        }

        const commentRoots = new Map();
        for (const comment of sortComments(comments)) {
          const parentRoot = comment.parentId ? commentRoots.get(comment.parentId) : null;
          const rootId = comment.parentId ? (parentRoot ?? comment.parentId) : null;
          commentRoots.set(comment.id, rootId ?? comment.id);
          const commentCreatedAt =
            toTimestamp(comment.createdAt, `${comment.id}.createdAt`) ?? createdAt;
          const commentUpdatedAt =
            toTimestamp(comment.updatedAt, `${comment.id}.updatedAt`) ?? commentCreatedAt;
          sqlite
            .prepare(
              `INSERT INTO comments (
                 id, post_id, parent_id, root_id, status, author_name, author_email,
                 author_website, content, rendered_html, ip_hash, user_agent_summary,
                 created_at, updated_at, approved_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              comment.id,
              item.id,
              comment.parentId,
              rootId,
              comment.status,
              comment.authorName,
              comment.authorEmail ?? "",
              comment.authorWebsite || null,
              comment.content,
              renderComment(comment.content),
              `imported:${sha256(`${comment.id}:${comment.authorEmail ?? ""}`).slice(0, 32)}`,
              comment.userAgent || null,
              commentCreatedAt,
              commentUpdatedAt,
              toTimestamp(comment.approvedAt, `${comment.id}.approvedAt`),
            );
        }
      }
    })();

    const violations = sqlite.pragma("foreign_key_check");
    if (violations.length > 0) throw new Error(`导入后存在 ${violations.length} 个外键违规`);
    const report = {
      format: PACKAGE_FORMAT,
      version: PACKAGE_VERSION,
      runId,
      importedAt: new Date().toISOString(),
      database: connection.path,
      counts: inspection.counts,
      status: "SUCCEEDED",
    };
    const reportDirectory = resolve(dirname(connection.path), "import-reports");
    await mkdir(reportDirectory, { recursive: true });
    const reportPath = resolve(reportDirectory, `${report.importedAt.replaceAll(":", "-")}.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return { report, reportPath };
  } catch (error) {
    for (const path of moved.reverse()) await rm(path, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
    sqlite.close();
  }
}

async function verifyPackage(inspection, databasePath, uploadDirectory) {
  assertPackageValid(inspection);
  const { sqlite } = openDatabase(databasePath, true);
  const failures = [];
  try {
    for (const item of inspection.manifest.items) {
      const row = sqlite
        .prepare("SELECT source_content AS sourceContent FROM posts WHERE id = ? AND slug = ?")
        .get(item.id, item.slug);
      if (!row) failures.push({ object: item.id, message: "数据库中缺少内容" });
      else if (!row.sourceContent.includes("/media/") && (item.media ?? []).length > 0) {
        failures.push({ object: item.id, message: "正文中的包内媒体链接未完成改写" });
      }
      for (const comment of item.comments ?? []) {
        if (
          !sqlite
            .prepare("SELECT 1 FROM comments WHERE id = ? AND post_id = ?")
            .get(comment.id, item.id)
        ) {
          failures.push({ object: comment.id, message: "数据库中缺少评论" });
        }
      }
    }
    for (const media of inspection.manifest.media) {
      const storageKey = mediaStorageKey(media);
      const row = sqlite
        .prepare("SELECT sha256, byte_size AS byteSize FROM media WHERE id = ? AND storage_key = ?")
        .get(media.id, storageKey);
      if (!row || row.sha256 !== media.sha256 || row.byteSize !== media.byteSize) {
        failures.push({ object: media.id, message: "媒体数据库记录不匹配" });
        continue;
      }
      try {
        const data = await readFile(resolveInside(resolve(uploadDirectory), storageKey));
        if (sha256(data) !== media.sha256)
          failures.push({ object: media.id, message: "媒体文件哈希不匹配" });
      } catch (error) {
        failures.push({ object: media.id, message: `媒体文件读取失败：${error.message}` });
      }
    }
    const violations = sqlite.pragma("foreign_key_check");
    if (violations.length > 0)
      failures.push({ object: "database", message: `${violations.length} 个外键违规` });
  } finally {
    sqlite.close();
  }
  return failures;
}

function printInspection(inspection) {
  console.log(`内容包：${inspection.sourceRoot}`);
  console.log(`计数：${JSON.stringify(inspection.counts)}`);
  console.log(`错误：${inspection.errors.length}；警告：${inspection.warnings.length}`);
}

async function main(options) {
  if (options.help || !options.command) {
    printHelp();
    return;
  }
  if (!["analyze", "dry-run", "import", "verify"].includes(options.command)) {
    throw new Error(`未知命令：${options.command}`);
  }
  const inspection = await inspectPackage(options.source);
  printInspection(inspection);
  assertPackageValid(inspection);

  if (options.command === "analyze") {
    console.log("分析通过：内容包结构、Markdown 与媒体哈希有效。");
    return;
  }
  if (options.command === "verify") {
    await loadDatabaseDependency();
    const failures = await verifyPackage(inspection, options.database, options.uploads);
    if (failures.length > 0) throw new Error(`验证失败：${JSON.stringify(failures.slice(0, 8))}`);
    console.log("验证通过：数据库对象、正文媒体链接、附件哈希与外键均一致。");
    return;
  }

  if (options.command === "dry-run") {
    await loadDatabaseDependency();
    const { sqlite } = openDatabase(options.database, true);
    try {
      const conflicts = await detectConflicts(inspection, sqlite, options.uploads);
      if (conflicts.length > 0) {
        throw new Error(
          `检测到 ${conflicts.length} 个冲突：${JSON.stringify(conflicts.slice(0, 8))}`,
        );
      }
    } finally {
      sqlite.close();
    }
    console.log("预演通过：目标数据库和上传目录无冲突，未写入任何数据。");
    return;
  }

  await loadImportDependencies();
  const imported = await importPackage(inspection, options.database, options.uploads);
  console.log(`导入完成：${JSON.stringify(imported.report.counts)}`);
  console.log(`导入报告：${imported.reportPath}`);
}

try {
  await main(parseArguments(process.argv.slice(2)));
} catch (error) {
  console.error(`内容包操作失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
