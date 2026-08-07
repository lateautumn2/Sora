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
  p.comment_count AS commentCount
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

export function listPublishedPosts(limit = 10): ContentSummary[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       WHERE p.kind = 'POST'
         AND p.status = 'PUBLISHED'
         AND p.visibility = 'PUBLIC'
         AND p.published_at <= ?
       ORDER BY p.pinned DESC, p.published_at DESC
       LIMIT ?`,
    )
    .all(Date.now(), limit) as ContentRow[];
  return hydrateRows(rows);
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

export function listAdminContents(kind: "POST" | "PAGE"): ContentSummary[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts p
       WHERE p.kind = ? AND p.status <> 'TRASHED'
       ORDER BY p.updated_at DESC`,
    )
    .all(kind) as ContentRow[];
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
             pinned, published_at, created_at, updated_at, word_count,
             reading_minutes, seo_title, seo_description, canonical_url
           ) VALUES (
             @id, @kind, @title, @slug, @excerpt, @sourceContent, @sourceFormat,
             @renderedHtml, @plainText, @status, @visibility, @allowComment,
             @pinned, @publishedAt, @now, @now, @wordCount,
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

export function listCategories(includePrivate = false): TaxonomyItem[] {
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
       ORDER BY c.sort_order, c.name`,
    )
    .all({ now: Date.now() }) as TaxonomyItem[];
}

export function listTags(includePrivate = false): TaxonomyItem[] {
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
       ORDER BY t.name`,
    )
    .all({ now: Date.now() }) as TaxonomyItem[];
}

export function getTaxonomyPosts(
  type: "category" | "tag",
  slug: string,
): { taxonomy: TaxonomyItem; posts: ContentSummary[] } | null {
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
       ORDER BY p.published_at DESC`,
    )
    .all(taxonomy.id, Date.now()) as ContentRow[];
  const posts = hydrateRows(rows);
  return { taxonomy: { ...taxonomy, count: posts.length }, posts };
}

export function searchPublishedPosts(query: string, limit = 20): ContentSummary[] {
  const terms = query
    .normalize("NFKC")
    .match(/[\p{Letter}\p{Number}]+/gu)
    ?.map((term) => `"${term.replaceAll('"', '""')}"`)
    .join(" AND ");
  if (!terms) {
    return [];
  }

  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT ${summaryColumns}
       FROM posts_fts f
       JOIN posts p ON p.id = f.post_id
       WHERE posts_fts MATCH ?
         AND p.published_at <= ?
       ORDER BY bm25(posts_fts), p.published_at DESC
       LIMIT ?`,
    )
    .all(terms, Date.now(), limit) as ContentRow[];
  return hydrateRows(rows);
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

export function getSiteSettings(): SiteSettings {
  const row = getDatabaseConnection()
    .sqlite.prepare("SELECT value_json AS valueJson FROM settings WHERE key = 'site'")
    .get() as { valueJson: string } | undefined;
  if (!row) {
    return defaultSiteSettings;
  }

  try {
    return siteSettingsSchema.parse(JSON.parse(row.valueJson));
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

export function getDashboardStats(): {
  publishedPosts: number;
  pendingComments: number;
  totalViews: number;
} {
  return getDatabaseConnection()
    .sqlite.prepare(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE kind = 'POST' AND status = 'PUBLISHED') AS publishedPosts,
         (SELECT COUNT(*) FROM comments WHERE status = 'PENDING') AS pendingComments,
         (SELECT COALESCE(SUM(view_count), 0) FROM posts) AS totalViews`,
    )
    .get() as { publishedPosts: number; pendingComments: number; totalViews: number };
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
