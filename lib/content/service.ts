import { randomUUID } from "node:crypto";

import { getDatabaseConnection } from "@/lib/db/client";
import { renderContent } from "@/lib/content/render";
import { type ContentInput, type SiteSettings, siteSettingsSchema } from "@/lib/content/validation";

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface ContentCover {
  id: string | null;
  url: string;
  storageKey: string | null;
  originalName: string;
  altText: string;
}

export interface ContentSummary {
  id: string;
  kind: "POST" | "PAGE";
  title: string;
  slug: string;
  excerpt: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "TRASHED";
  visibility: "PUBLIC" | "PRIVATE";
  pinned: boolean;
  publishedAt: number | null;
  updatedAt: number;
  wordCount: number;
  readingMinutes: number;
  viewCount: number;
  upvoteCount: number;
  commentCount: number;
  cover: ContentCover | null;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

export interface ContentDetail extends ContentSummary {
  sourceContent: string;
  sourceFormat: "MARKDOWN" | "HTML";
  renderedHtml: string;
  plainText: string;
  allowComment: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
}

interface ContentRow {
  id: string;
  kind: "POST" | "PAGE";
  title: string;
  slug: string;
  excerpt: string | null;
  sourceContent?: string;
  sourceFormat?: "MARKDOWN" | "HTML";
  renderedHtml?: string;
  plainText?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "TRASHED";
  visibility: "PUBLIC" | "PRIVATE";
  allowComment?: number;
  pinned: number;
  publishedAt: number | null;
  updatedAt: number;
  wordCount: number;
  readingMinutes: number;
  viewCount: number;
  upvoteCount: number;
  commentCount: number;
  coverMediaId: string | null;
  coverUrl: string | null;
  coverStorageKey: string | null;
  coverOriginalName: string | null;
  coverAltText: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
}

const summaryColumns = `
  p.id,
  p.kind,
  p.title,
  p.slug,
  p.excerpt,
  p.status,
  p.visibility,
  p.pinned,
  p.published_at AS publishedAt,
  p.updated_at AS updatedAt,
  p.word_count AS wordCount,
  p.reading_minutes AS readingMinutes,
  p.view_count AS viewCount,
  p.upvote_count AS upvoteCount,
  p.comment_count AS commentCount,
  p.cover_media_id AS coverMediaId,
  p.cover_url AS coverUrl,
  (SELECT m.storage_key FROM media m WHERE m.id = p.cover_media_id) AS coverStorageKey,
  (SELECT m.original_name FROM media m WHERE m.id = p.cover_media_id) AS coverOriginalName,
  (SELECT m.alt_text FROM media m WHERE m.id = p.cover_media_id) AS coverAltText
`;

const detailColumns = `
  ${summaryColumns},
  p.source_content AS sourceContent,
  p.source_format AS sourceFormat,
  p.rendered_html AS renderedHtml,
  p.plain_text AS plainText,
  p.allow_comment AS allowComment,
  p.seo_title AS seoTitle,
  p.seo_description AS seoDescription,
  p.canonical_url AS canonicalUrl
`;

function hydrateRows(rows: ContentRow[]): ContentSummary[] {
  if (rows.length === 0) {
    return [];
  }

  const sqlite = getDatabaseConnection().sqlite;
  const placeholders = rows.map(() => "?").join(", ");
  const ids = rows.map((row) => row.id);
  const categoryRows = sqlite
    .prepare(
      `SELECT pc.post_id AS postId, c.id, c.name, c.slug, c.description
       FROM post_categories pc
       JOIN categories c ON c.id = pc.category_id
       WHERE pc.post_id IN (${placeholders})
       ORDER BY pc.sort_order, c.name`,
    )
    .all(...ids) as Array<Omit<TaxonomyItem, "count"> & { postId: string }>;
  const tagRows = sqlite
    .prepare(
      `SELECT pt.post_id AS postId, t.id, t.name, t.slug, t.description
       FROM post_tags pt
       JOIN tags t ON t.id = pt.tag_id
       WHERE pt.post_id IN (${placeholders})
       ORDER BY t.name`,
    )
    .all(...ids) as Array<Omit<TaxonomyItem, "count"> & { postId: string }>;

  return rows.map((row) => ({
    ...row,
    excerpt: row.excerpt ?? "",
    pinned: Boolean(row.pinned),
    cover: row.coverUrl
      ? {
          id: null,
          url: row.coverUrl,
          storageKey: null,
          originalName: "",
          altText: "",
        }
      : row.coverMediaId && row.coverStorageKey
        ? {
            id: row.coverMediaId,
            url: `/media/${row.coverStorageKey}`,
            storageKey: row.coverStorageKey,
            originalName: row.coverOriginalName ?? "",
            altText: row.coverAltText ?? "",
          }
        : null,
    categories: categoryRows
      .filter((item) => item.postId === row.id)
      .map((item) => ({ ...item, count: 0 })),
    tags: tagRows.filter((item) => item.postId === row.id).map((item) => ({ ...item, count: 0 })),
  }));
}

function hydrateDetail(row: ContentRow | undefined): ContentDetail | null {
  if (!row) {
    return null;
  }

  const summary = hydrateRows([row])[0];
  if (!summary || !row.sourceContent || !row.sourceFormat || row.renderedHtml === undefined) {
    return null;
  }

  return {
    ...summary,
    sourceContent: row.sourceContent,
    sourceFormat: row.sourceFormat,
    renderedHtml: row.renderedHtml,
    plainText: row.plainText ?? "",
    allowComment: Boolean(row.allowComment),
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    canonicalUrl: row.canonicalUrl ?? "",
  };
}

export function listPublishedPosts(limit = 10, offset = 0): ContentSummary[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       WHERE p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
       ORDER BY p.pinned DESC, p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(Date.now(), limit, offset) as ContentRow[];
  return hydrateRows(rows);
}

/** 统计公开文章总数，供列表分页计算总页数。 */
export function countPublishedPosts(): number {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT COUNT(*) AS total
       FROM posts p
       WHERE p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?`,
    )
    .get(Date.now()) as { total: number };
  return row.total;
}

export function listPublishedPages(): ContentSummary[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       WHERE p.kind = 'PAGE'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
       ORDER BY p.title`,
    )
    .all(Date.now()) as ContentRow[];
  return hydrateRows(rows);
}

export function getPublishedContentBySlug(
  slug: string,
  kind: "POST" | "PAGE",
): ContentDetail | null {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${detailColumns}
       FROM posts p
       WHERE p.slug = ?
         AND p.kind = ?
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
       LIMIT 1`,
    )
    .get(slug, kind, Date.now()) as ContentRow | undefined;
  return hydrateDetail(row);
}

/** 后台内容列表总数（不含回收站），用于分页计算。 */
export function countAdminContents(
  kind: "POST" | "PAGE",
  status: "ACTIVE" | "TRASHED" = "ACTIVE",
): number {
  const statusClause = status === "TRASHED" ? "p.status = 'TRASHED'" : "p.status <> 'TRASHED'";
  const { total } = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT COUNT(*) AS total
       FROM posts p
       WHERE p.kind = ? AND ${statusClause}`,
    )
    .get(kind) as { total: number };
  return total;
}

/**
 * 后台内容列表（不含回收站）。
 * limit/offset 省略时返回全部，兼容页面（pages）等不分页的调用方。
 */
export function listAdminContents(
  kind: "POST" | "PAGE",
  limit?: number,
  offset = 0,
  status: "ACTIVE" | "TRASHED" = "ACTIVE",
): ContentSummary[] {
  const statusClause = status === "TRASHED" ? "p.status = 'TRASHED'" : "p.status <> 'TRASHED'";
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       WHERE p.kind = ? AND ${statusClause}
       ORDER BY p.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(kind, limit ?? Number.MAX_SAFE_INTEGER, offset) as ContentRow[];
  return hydrateRows(rows);
}

export function getAdminContentById(id: string): ContentDetail | null {
  const row = getDatabaseConnection()
    .sqlite.prepare(`SELECT ${detailColumns} FROM posts p WHERE p.id = ? LIMIT 1`)
    .get(id) as ContentRow | undefined;
  return hydrateDetail(row);
}

export function saveContent(input: ContentInput): string {
  const sqlite = getDatabaseConnection().sqlite;
  const rendered = renderContent(input.sourceContent, input.sourceFormat, input.excerpt);
  const now = Date.now();

  return sqlite.transaction(() => {
    const id = input.id ?? randomUUID();
    const existing = input.id
      ? (sqlite
          .prepare("SELECT published_at AS publishedAt FROM posts WHERE id = ?")
          .get(input.id) as { publishedAt: number | null } | undefined)
      : undefined;
    if (input.id && !existing) {
      throw new Error("CONTENT_NOT_FOUND");
    }

    const publishedAt = input.status === "PUBLISHED" ? (existing?.publishedAt ?? now) : null;
    const values = {
      id,
      kind: input.kind,
      title: input.title,
      slug: input.slug,
      excerpt: rendered.excerpt,
      sourceContent: input.sourceContent,
      sourceFormat: input.sourceFormat,
      renderedHtml: rendered.html,
      plainText: rendered.plainText,
      status: input.status,
      visibility: input.visibility,
      allowComment: input.allowComment ? 1 : 0,
      pinned: input.kind === "POST" && input.pinned ? 1 : 0,
      coverMediaId: input.kind === "POST" && !input.coverUrl ? input.coverMediaId || null : null,
      coverUrl: input.kind === "POST" ? input.coverUrl || null : null,
      publishedAt,
      now,
      wordCount: rendered.wordCount,
      readingMinutes: rendered.readingMinutes,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      canonicalUrl: input.canonicalUrl || null,
    };

    if (existing) {
      sqlite
        .prepare(
          `UPDATE posts SET
             title = @title,
             slug = @slug,
             excerpt = @excerpt,
             source_content = @sourceContent,
             source_format = @sourceFormat,
             rendered_html = @renderedHtml,
             plain_text = @plainText,
             status = @status,
             visibility = @visibility,
              allow_comment = @allowComment,
              pinned = @pinned,
              cover_media_id = @coverMediaId,
              cover_url = @coverUrl,
              published_at = @publishedAt,
             updated_at = @now,
             word_count = @wordCount,
             reading_minutes = @readingMinutes,
             seo_title = @seoTitle,
             seo_description = @seoDescription,
             canonical_url = @canonicalUrl
           WHERE id = @id AND kind = @kind`,
        )
        .run(values);
    } else {
      sqlite
        .prepare(
          `INSERT INTO posts (
             id, kind, title, slug, excerpt, source_content, source_format,
              rendered_html, plain_text, status, visibility, allow_comment,
              pinned, cover_media_id, cover_url, published_at, created_at, updated_at, word_count,
             reading_minutes, seo_title, seo_description, canonical_url
           ) VALUES (
             @id, @kind, @title, @slug, @excerpt, @sourceContent, @sourceFormat,
              @renderedHtml, @plainText, @status, @visibility, @allowComment,
              @pinned, @coverMediaId, @coverUrl, @publishedAt, @now, @now, @wordCount,
             @readingMinutes, @seoTitle, @seoDescription, @canonicalUrl
           )`,
        )
        .run(values);
    }

    sqlite
      .prepare(
        `INSERT INTO post_revisions (
           id, post_id, title, excerpt, source_content, source_format, reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        id,
        input.title,
        rendered.excerpt,
        input.sourceContent,
        input.sourceFormat,
        input.status === "PUBLISHED" ? "PUBLISH" : "MANUAL",
        now,
      );

    sqlite.prepare("DELETE FROM post_categories WHERE post_id = ?").run(id);
    sqlite.prepare("DELETE FROM post_tags WHERE post_id = ?").run(id);

    if (input.kind === "POST") {
      const addCategory = sqlite.prepare(
        "INSERT INTO post_categories (post_id, category_id, sort_order) VALUES (?, ?, ?)",
      );
      input.categoryIds.forEach((categoryId, index) => addCategory.run(id, categoryId, index));
      const addTag = sqlite.prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)");
      input.tagIds.forEach((tagId) => addTag.run(id, tagId));
    }

    return id;
  })();
}

export function trashContent(id: string): void {
  getDatabaseConnection()
    .sqlite.prepare(
      "UPDATE posts SET status = 'TRASHED', published_at = NULL, updated_at = ? WHERE id = ?",
    )
    .run(Date.now(), id);
}

export function restoreContent(id: string): void {
  getDatabaseConnection()
    .sqlite.prepare(
      "UPDATE posts SET status = 'DRAFT', updated_at = ? WHERE id = ? AND status = 'TRASHED'",
    )
    .run(Date.now(), id);
}

export function listCategories(includePrivate = false, limit?: number, offset = 0): TaxonomyItem[] {
  const visibility = includePrivate
    ? "p.kind = 'POST' AND p.status <> 'TRASHED'"
    : "p.kind = 'POST' AND p.status = 'PUBLISHED' AND p.visibility = 'PUBLIC' AND p.published_at <= @now";
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT c.id, c.name, c.slug, c.description, COUNT(DISTINCT p.id) AS count
       FROM categories c
       LEFT JOIN post_categories pc ON pc.category_id = c.id
       LEFT JOIN posts p ON p.id = pc.post_id AND ${visibility}
       GROUP BY c.id
       ORDER BY c.sort_order, c.name
       LIMIT @limit OFFSET @offset`,
    )
    .all({ now: Date.now(), limit: limit ?? Number.MAX_SAFE_INTEGER, offset }) as TaxonomyItem[];
}

export function listTags(includePrivate = false, limit?: number, offset = 0): TaxonomyItem[] {
  const visibility = includePrivate
    ? "p.kind = 'POST' AND p.status <> 'TRASHED'"
    : "p.kind = 'POST' AND p.status = 'PUBLISHED' AND p.visibility = 'PUBLIC' AND p.published_at <= @now";
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT t.id, t.name, t.slug, t.description, COUNT(DISTINCT p.id) AS count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       LEFT JOIN posts p ON p.id = pt.post_id AND ${visibility}
       GROUP BY t.id
       ORDER BY t.name
       LIMIT @limit OFFSET @offset`,
    )
    .all({ now: Date.now(), limit: limit ?? Number.MAX_SAFE_INTEGER, offset }) as TaxonomyItem[];
}

export function countTaxonomies(type: "category" | "tag"): number {
  const table = type === "category" ? "categories" : "tags";
  const row = getDatabaseConnection()
    .sqlite.prepare(`SELECT COUNT(*) AS total FROM ${table}`)
    .get() as { total: number };
  return row.total;
}

export function getTaxonomyPosts(
  type: "category" | "tag",
  slug: string,
  limit = 10,
  offset = 0,
): { taxonomy: TaxonomyItem; posts: ContentSummary[]; total: number } | null {
  const sqlite = getDatabaseConnection().sqlite;
  const table = type === "category" ? "categories" : "tags";
  const joinTable = type === "category" ? "post_categories" : "post_tags";
  const foreignKey = type === "category" ? "category_id" : "tag_id";
  const taxonomy = sqlite
    .prepare(`SELECT id, name, slug, description, 0 AS count FROM ${table} WHERE slug = ? LIMIT 1`)
    .get(slug) as TaxonomyItem | undefined;
  if (!taxonomy) {
    return null;
  }

  const totalRow = sqlite
    .prepare(
      `SELECT COUNT(*) AS total
       FROM posts p
       JOIN ${joinTable} x ON x.post_id = p.id
       WHERE x.${foreignKey} = ?
         AND p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?`,
    )
    .get(taxonomy.id, Date.now()) as { total: number };
  const rows = sqlite
    .prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       JOIN ${joinTable} x ON x.post_id = p.id
       WHERE x.${foreignKey} = ?
         AND p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(taxonomy.id, Date.now(), limit, offset) as ContentRow[];
  const posts = hydrateRows(rows);
  return { taxonomy: { ...taxonomy, count: totalRow.total }, posts, total: totalRow.total };
}

export function searchPublishedPosts(query: string, limit = 20, offset = 0): ContentSummary[] {
  const normalized = normalizeSearchQuery(query);
  const terms = buildSearchTerms(normalized);
  if (!normalized || !terms) {
    return [];
  }

  const contains = `%${escapeLikePattern(normalized)}%`;

  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `WITH fts_matches AS (
         SELECT post_id, bm25(posts_fts) AS relevance
         FROM posts_fts
         WHERE posts_fts MATCH ?
       )
       SELECT ${summaryColumns},
              CASE
                WHEN p.title = ? COLLATE NOCASE THEN 0
                WHEN p.title LIKE ? ESCAPE '\\' THEN 1
                WHEN f.post_id IS NOT NULL THEN 2
                ELSE 3
              END AS searchPriority,
              COALESCE(f.relevance, 1000000) AS searchRelevance
       FROM posts p
       LEFT JOIN fts_matches f ON f.post_id = p.id
       WHERE p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
         AND (
           f.post_id IS NOT NULL
           OR p.title LIKE ? ESCAPE '\\'
           OR COALESCE(p.excerpt, '') LIKE ? ESCAPE '\\'
           OR p.plain_text LIKE ? ESCAPE '\\'
         )
       ORDER BY searchPriority, searchRelevance, p.published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(
      terms,
      normalized,
      contains,
      Date.now(),
      contains,
      contains,
      contains,
      limit,
      offset,
    ) as ContentRow[];
  return hydrateRows(rows);
}

/** 统计搜索结果总数，供搜索页分页计算总页数。 */
export function countSearchPublishedPosts(query: string): number {
  const normalized = normalizeSearchQuery(query);
  const terms = buildSearchTerms(normalized);
  if (!normalized || !terms) {
    return 0;
  }
  const contains = `%${escapeLikePattern(normalized)}%`;
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `WITH fts_matches AS (
         SELECT post_id
         FROM posts_fts
         WHERE posts_fts MATCH ?
       )
       SELECT COUNT(DISTINCT p.id) AS total
       FROM posts p
       LEFT JOIN fts_matches f ON f.post_id = p.id
       WHERE p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
         AND (
           f.post_id IS NOT NULL
           OR p.title LIKE ? ESCAPE '\\'
           OR COALESCE(p.excerpt, '') LIKE ? ESCAPE '\\'
           OR p.plain_text LIKE ? ESCAPE '\\'
         )`,
    )
    .get(terms, Date.now(), contains, contains, contains) as { total: number };
  return row.total;
}

/** 规范化用户输入，避免全角字符和首尾空白造成不一致。 */
function normalizeSearchQuery(query: string): string {
  return query.normalize("NFKC").trim();
}

/** 转义 LIKE 通配符，使用户输入只作为普通文本参与包含匹配。 */
function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/** 把用户输入拆成 FTS5 前缀匹配表达式；无有效关键词时返回空串。 */
function buildSearchTerms(query: string): string {
  return (
    query
      .match(/[\p{Letter}\p{Number}]+/gu)
      ?.map((term) => `"${term.replaceAll('"', '""')}"*`)
      .join(" AND ") ?? ""
  );
}

export function saveTaxonomy(
  type: "category" | "tag",
  input: { id?: string; name: string; slug: string; description: string },
): string {
  const sqlite = getDatabaseConnection().sqlite;
  const table = type === "category" ? "categories" : "tags";
  const id = input.id ?? randomUUID();
  const now = Date.now();
  if (input.id) {
    sqlite
      .prepare(
        `UPDATE ${table} SET name = ?, slug = ?, description = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.name, input.slug, input.description, now, id);
  } else {
    sqlite
      .prepare(
        `INSERT INTO ${table} (id, name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.name, input.slug, input.description, now, now);
  }
  return id;
}

export function deleteTaxonomy(type: "category" | "tag", id: string): void {
  const table = type === "category" ? "categories" : "tags";
  getDatabaseConnection().sqlite.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export const defaultSiteSettings: SiteSettings = siteSettingsSchema.parse({});

function parseSiteSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object") {
    return siteSettingsSchema.parse(value);
  }

  const stored = value as Record<string, unknown>;
  return siteSettingsSchema.parse({
    ...stored,
    footerQuoteSource:
      stored.footerQuoteSource ?? (stored.footerHitokotoEnabled === true ? "HITOKOTO" : "NONE"),
  });
}

export function getSiteSettings(): SiteSettings {
  // Next.js 构建阶段（next build）会预渲染 /_not-found 等静态页面并调用本函数，
  // 此时运行库尚未建表。直接返回默认值，避免镜像构建依赖运行时数据库。
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return defaultSiteSettings;
  }

  const row = getDatabaseConnection()
    .sqlite.prepare("SELECT value_json AS valueJson FROM settings WHERE key = 'site'")
    .get() as { valueJson: string } | undefined;
  if (!row) {
    return defaultSiteSettings;
  }

  try {
    return parseSiteSettings(JSON.parse(row.valueJson));
  } catch {
    return defaultSiteSettings;
  }
}

export function saveSiteSettings(value: SiteSettings): void {
  getDatabaseConnection()
    .sqlite.prepare(
      `INSERT INTO settings (key, value_json, updated_at) VALUES ('site', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    )
    .run(JSON.stringify(value), Date.now());
}

/** 仪表盘访问量排行中的单篇文章行。 */
export interface DashboardTopPost {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  commentCount: number;
  publishedAt: number | null;
}

/**
 * 按访问量降序分页查询已发布文章，供仪表盘"每篇文章访问量"表格使用。
 * 返回当前页数据与总文章数，便于计算总页数。
 */
export function listTopPostsByViews(
  limit: number,
  offset: number,
): {
  posts: DashboardTopPost[];
  total: number;
} {
  const sqlite = getDatabaseConnection().sqlite;
  const { total } = sqlite
    .prepare(
      `SELECT COUNT(*) AS total
       FROM posts
       WHERE kind = 'POST' AND status = 'PUBLISHED'`,
    )
    .get() as { total: number };
  const posts = sqlite
    .prepare(
      `SELECT id, title, slug, view_count AS viewCount,
              comment_count AS commentCount, published_at AS publishedAt
       FROM posts
       WHERE kind = 'POST' AND status = 'PUBLISHED'
       ORDER BY view_count DESC, published_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as DashboardTopPost[];
  return { posts, total };
}

export function getDashboardStats(): {
  publishedPosts: number;
  pendingComments: number;
  totalViews: number;
  totalComments: number;
  topPosts: DashboardTopPost[];
} {
  const sqlite = getDatabaseConnection().sqlite;
  const summary = sqlite
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE kind = 'POST' AND status = 'PUBLISHED') AS publishedPosts,
         (SELECT COUNT(*) FROM comments WHERE status = 'PENDING') AS pendingComments,
         (SELECT COALESCE(SUM(view_count), 0) FROM posts) AS totalViews,
         (SELECT COALESCE(SUM(comment_count), 0) FROM posts) AS totalComments`,
    )
    .get() as {
    publishedPosts: number;
    pendingComments: number;
    totalViews: number;
    totalComments: number;
  };
  // 图表只需要全站访问量最高的 10 篇；完整分页列表由 listTopPostsByViews 提供。
  const topPosts = sqlite
    .prepare(
      `SELECT id, title, slug, view_count AS viewCount,
              comment_count AS commentCount, published_at AS publishedAt
       FROM posts
       WHERE kind = 'POST' AND status = 'PUBLISHED'
       ORDER BY view_count DESC, published_at DESC
       LIMIT 10`,
    )
    .all() as DashboardTopPost[];
  return { ...summary, topPosts };
}

export interface PrimaryMenuItem {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  enabled: boolean;
}

export function listPrimaryMenuItems(includeDisabled = false): PrimaryMenuItem[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT mi.id, mi.label, COALESCE(mi.url, '/') AS url,
              mi.sort_order AS sortOrder, mi.open_in_new_tab AS openInNewTab,
              mi.enabled
       FROM menu_items mi
       JOIN menus m ON m.id = mi.menu_id
       WHERE m.key = 'primary' ${includeDisabled ? "" : "AND mi.enabled = 1"}
       ORDER BY mi.sort_order, mi.label`,
    )
    .all() as Array<
    Omit<PrimaryMenuItem, "openInNewTab" | "enabled"> & { openInNewTab: number; enabled: number }
  >;
  return rows.map((row) => ({
    ...row,
    openInNewTab: Boolean(row.openInNewTab),
    enabled: Boolean(row.enabled),
  }));
}

export function savePrimaryMenuItem(input: {
  id?: string;
  label: string;
  url: string;
  sortOrder: number;
  openInNewTab: boolean;
  enabled: boolean;
}): string {
  const sqlite = getDatabaseConnection().sqlite;
  return sqlite.transaction(() => {
    const now = Date.now();
    let menu = sqlite.prepare("SELECT id FROM menus WHERE key = 'primary'").get() as
      { id: string } | undefined;
    if (!menu) {
      menu = { id: randomUUID() };
      sqlite
        .prepare(
          "INSERT INTO menus (id, key, name, created_at, updated_at) VALUES (?, 'primary', '主导航', ?, ?)",
        )
        .run(menu.id, now, now);
    }
    const id = input.id ?? randomUUID();
    if (input.id) {
      sqlite
        .prepare(
          `UPDATE menu_items SET label = ?, url = ?, sort_order = ?,
             open_in_new_tab = ?, enabled = ? WHERE id = ? AND menu_id = ?`,
        )
        .run(
          input.label,
          input.url,
          input.sortOrder,
          input.openInNewTab ? 1 : 0,
          input.enabled ? 1 : 0,
          id,
          menu.id,
        );
    } else {
      sqlite
        .prepare(
          `INSERT INTO menu_items (
             id, menu_id, label, type, url, sort_order, open_in_new_tab, enabled
           ) VALUES (?, ?, ?, 'CUSTOM', ?, ?, ?, ?)`,
        )
        .run(
          id,
          menu.id,
          input.label,
          input.url,
          input.sortOrder,
          input.openInNewTab ? 1 : 0,
          input.enabled ? 1 : 0,
        );
    }
    return id;
  })();
}

export function deletePrimaryMenuItem(id: string): void {
  getDatabaseConnection().sqlite.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
}
