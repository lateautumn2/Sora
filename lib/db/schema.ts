import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  type AnySQLiteColumn,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const currentTimestamp = sql`(unixepoch() * 1000)`;

// Better Auth owns these four core tables. Physical column names intentionally
// follow its defaults so the auth adapter and Drizzle share the same schema.
export const authUsers = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    singleton: integer("singleton").notNull().default(1),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    uniqueIndex("user_singleton_unique").on(table.singleton),
    check("user_singleton_check", sql`${table.singleton} = 1`),
  ],
);

export const authSessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
);

export const authAccounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const authRateLimits = sqliteTable(
  "rateLimit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: integer("lastRequest").notNull(),
  },
  (table) => [uniqueIndex("rate_limit_key_unique").on(table.key)],
);

/**
 * 后台操作审计日志。
 *
 * userId 只作为关联线索，不设置外键，避免管理员账号发生清理或迁移时
 * 级联删除历史审计记录。actorName/actorEmail 保存操作发生时的快照，
 * 这样即使账号资料后来改变，日志仍然能还原当时的操作者信息。
 */
export const operationLogs = sqliteTable(
  "operation_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    index("operation_logs_created_at_idx").on(table.createdAt),
    index("operation_logs_action_idx").on(table.action, table.createdAt),
    index("operation_logs_user_id_idx").on(table.userId, table.createdAt),
  ],
);

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    sha256: text("sha256").notNull(),
    altText: text("alt_text").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("media_storage_key_unique").on(table.storageKey),
    index("media_created_at_idx").on(table.createdAt),
    check("media_byte_size_check", sql`${table.byteSize} >= 0`),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["POST", "PAGE"] }).notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    sourceContent: text("source_content").notNull(),
    sourceFormat: text("source_format", { enum: ["MARKDOWN", "HTML"] }).notNull(),
    renderedHtml: text("rendered_html").notNull(),
    plainText: text("plain_text").notNull(),
    rendererVersion: integer("renderer_version").notNull().default(1),
    coverMediaId: text("cover_media_id").references(() => media.id, { onDelete: "set null" }),
    coverUrl: text("cover_url"),
    status: text("status", {
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "TRASHED"],
    })
      .notNull()
      .default("DRAFT"),
    visibility: text("visibility", { enum: ["PUBLIC", "PRIVATE"] })
      .notNull()
      .default("PUBLIC"),
    allowComment: integer("allow_comment", { mode: "boolean" }).notNull().default(true),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    wordCount: integer("word_count").notNull().default(0),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    viewCount: integer("view_count").notNull().default(0),
    upvoteCount: integer("upvote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_public_list_idx").on(
      table.kind,
      table.status,
      table.visibility,
      table.publishedAt,
    ),
    index("posts_home_idx").on(table.pinned, table.publishedAt),
    index("posts_admin_idx").on(table.status, table.updatedAt),
    check("posts_kind_check", sql`${table.kind} IN ('POST', 'PAGE')`),
    check(
      "posts_status_check",
      sql`${table.status} IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASHED')`,
    ),
    check("posts_visibility_check", sql`${table.visibility} IN ('PUBLIC', 'PRIVATE')`),
    check("posts_word_count_check", sql`${table.wordCount} >= 0`),
    check("posts_reading_minutes_check", sql`${table.readingMinutes} >= 1`),
  ],
);

export const postRevisions = sqliteTable(
  "post_revisions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    sourceContent: text("source_content").notNull(),
    sourceFormat: text("source_format", { enum: ["MARKDOWN", "HTML"] }).notNull(),
    reason: text("reason", { enum: ["PUBLISH", "MANUAL", "MIGRATION"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    index("post_revisions_post_idx").on(table.postId, table.createdAt),
    check(
      "post_revisions_reason_check",
      sql`${table.reason} IN ('PUBLISH', 'MANUAL', 'MIGRATION')`,
    ),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, {
      onDelete: "restrict",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_sort_idx").on(table.parentId, table.sortOrder),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("tags_name_unique").on(table.name),
    uniqueIndex("tags_slug_unique").on(table.slug),
  ],
);

export const postCategories = sqliteTable(
  "post_categories",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.categoryId] }),
    index("post_categories_category_idx").on(table.categoryId, table.sortOrder),
  ],
);

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("post_tags_tag_idx").on(table.tagId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "set null",
    }),
    rootId: text("root_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["PENDING", "APPROVED", "SPAM", "TRASHED"] })
      .notNull()
      .default("PENDING"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    authorWebsite: text("author_website"),
    content: text("content").notNull(),
    renderedHtml: text("rendered_html").notNull(),
    ipHash: text("ip_hash").notNull(),
    ipAddress: text("ip_address"),
    ipCity: text("ip_city"),
    userAgentSummary: text("user_agent_summary"),
    browserName: text("browser_name"),
    browserVersion: text("browser_version"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("comments_post_status_idx").on(table.postId, table.status, table.createdAt),
    index("comments_moderation_idx").on(table.status, table.createdAt),
    index("comments_parent_idx").on(table.parentId),
    check(
      "comments_status_check",
      sql`${table.status} IN ('PENDING', 'APPROVED', 'SPAM', 'TRASHED')`,
    ),
  ],
);

export const commentRequests = sqliteTable(
  "comment_requests",
  {
    tokenHash: text("token_hash").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [index("comment_requests_created_at_idx").on(table.createdAt)],
);

export const publicRateLimits = sqliteTable(
  "public_rate_limits",
  {
    key: text("key").notNull(),
    bucketStart: integer("bucket_start", { mode: "timestamp_ms" }).notNull(),
    count: integer("count").notNull().default(1),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.bucketStart] }),
    index("public_rate_limits_updated_at_idx").on(table.updatedAt),
    check("public_rate_limits_count_check", sql`${table.count} >= 1`),
  ],
);

export const menus = sqliteTable("menus", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
});

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: text("id").primaryKey(),
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => menuItems.id, {
      onDelete: "restrict",
    }),
    label: text("label").notNull(),
    type: text("type", { enum: ["POST", "PAGE", "CATEGORY", "TAG", "CUSTOM"] }).notNull(),
    targetId: text("target_id"),
    url: text("url"),
    sortOrder: integer("sort_order").notNull().default(0),
    openInNewTab: integer("open_in_new_tab", { mode: "boolean" }).notNull().default(false),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("menu_items_menu_sort_idx").on(table.menuId, table.parentId, table.sortOrder),
    check(
      "menu_items_type_check",
      sql`${table.type} IN ('POST', 'PAGE', 'CATEGORY', 'TAG', 'CUSTOM')`,
    ),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
});

export const friendLinks = sqliteTable(
  "friend_links",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    logoUrl: text("logo_url"),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("friend_links_url_unique").on(table.url),
    index("friend_links_public_sort_idx").on(table.enabled, table.sortOrder, table.name),
    check("friend_links_sort_order_check", sql`${table.sortOrder} BETWEEN 0 AND 999`),
    check("friend_links_enabled_check", sql`${table.enabled} IN (0, 1)`),
  ],
);

export const postUpvotes = sqliteTable(
  "post_upvotes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorHash: text("visitor_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [primaryKey({ columns: [table.postId, table.visitorHash] })],
);

export const postViews = sqliteTable(
  "post_views",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorHash: text("visitor_hash").notNull(),
    bucketDate: text("bucket_date").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
  },
  (table) => [primaryKey({ columns: [table.postId, table.visitorHash, table.bucketDate] })],
);

export const applicationState = sqliteTable("application_state", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(currentTimestamp),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type FriendLinkRow = typeof friendLinks.$inferSelect;
export type OperationLog = typeof operationLogs.$inferSelect;
