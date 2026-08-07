CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_unique` ON `account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `rateLimit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`lastRequest` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rateLimit` (`key`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`singleton` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "user_singleton_check" CHECK("user"."singleton" = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_singleton_unique` ON `user` (`singleton`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_parent_sort_idx` ON `categories` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`parent_id` text,
	`root_id` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`author_website` text,
	`content` text NOT NULL,
	`rendered_html` text NOT NULL,
	`ip_hash` text NOT NULL,
	`user_agent_summary` text,
	`source` text DEFAULT 'NATIVE' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`approved_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`root_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "comments_status_check" CHECK("comments"."status" IN ('PENDING', 'APPROVED', 'SPAM', 'TRASHED')),
	CONSTRAINT "comments_source_check" CHECK("comments"."source" IN ('NATIVE', 'TYPECHO'))
);
--> statement-breakpoint
CREATE INDEX `comments_post_status_idx` ON `comments` (`post_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_moderation_idx` ON `comments` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`sha256` text NOT NULL,
	`alt_text` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'NATIVE' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "media_byte_size_check" CHECK("media"."byte_size" >= 0),
	CONSTRAINT "media_source_check" CHECK("media"."source" IN ('NATIVE', 'TYPECHO'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_unique` ON `media` (`storage_key`);--> statement-breakpoint
CREATE INDEX `media_created_at_idx` ON `media` (`created_at`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`parent_id` text,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`target_id` text,
	`url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`open_in_new_tab` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "menu_items_type_check" CHECK("menu_items"."type" IN ('POST', 'PAGE', 'CATEGORY', 'TAG', 'CUSTOM'))
);
--> statement-breakpoint
CREATE INDEX `menu_items_menu_sort_idx` ON `menu_items` (`menu_id`,`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_key_unique` ON `menus` (`key`);--> statement-breakpoint
CREATE TABLE `migration_id_map` (
	`run_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`source_slug` text,
	PRIMARY KEY(`run_id`, `entity_type`, `source_id`),
	FOREIGN KEY (`run_id`) REFERENCES `migration_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `migration_id_map_target_idx` ON `migration_id_map` (`entity_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `migration_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_hash` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`counts_json` text DEFAULT '{}' NOT NULL,
	`report_path` text,
	CONSTRAINT "migration_runs_status_check" CHECK("migration_runs"."status" IN ('RUNNING', 'SUCCEEDED', 'FAILED'))
);
--> statement-breakpoint
CREATE INDEX `migration_runs_source_idx` ON `migration_runs` (`source_hash`);--> statement-breakpoint
CREATE TABLE `post_categories` (
	`post_id` text NOT NULL,
	`category_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`post_id`, `category_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `post_categories_category_idx` ON `post_categories` (`category_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `post_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`source_content` text NOT NULL,
	`source_format` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "post_revisions_reason_check" CHECK("post_revisions"."reason" IN ('PUBLISH', 'MANUAL', 'MIGRATION'))
);
--> statement-breakpoint
CREATE INDEX `post_revisions_post_idx` ON `post_revisions` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `post_tags_tag_idx` ON `post_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `post_upvotes` (
	`post_id` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`post_id`, `visitor_hash`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_views` (
	`post_id` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`bucket_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`post_id`, `visitor_hash`, `bucket_date`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`source_content` text NOT NULL,
	`source_format` text NOT NULL,
	`rendered_html` text NOT NULL,
	`plain_text` text NOT NULL,
	`renderer_version` integer DEFAULT 1 NOT NULL,
	`cover_media_id` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`visibility` text DEFAULT 'PUBLIC' NOT NULL,
	`allow_comment` integer DEFAULT true NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`reading_minutes` integer DEFAULT 1 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`upvote_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`canonical_url` text,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "posts_kind_check" CHECK("posts"."kind" IN ('POST', 'PAGE')),
	CONSTRAINT "posts_status_check" CHECK("posts"."status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASHED')),
	CONSTRAINT "posts_visibility_check" CHECK("posts"."visibility" IN ('PUBLIC', 'PRIVATE')),
	CONSTRAINT "posts_word_count_check" CHECK("posts"."word_count" >= 0),
	CONSTRAINT "posts_reading_minutes_check" CHECK("posts"."reading_minutes" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_public_list_idx` ON `posts` (`kind`,`status`,`visibility`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_home_idx` ON `posts` (`pinned`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_admin_idx` ON `posts` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_application_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_application_state`("key", "value_json", "updated_at") SELECT "key", "value_json", "updated_at" FROM `application_state`;--> statement-breakpoint
DROP TABLE `application_state`;--> statement-breakpoint
ALTER TABLE `__new_application_state` RENAME TO `application_state`;--> statement-breakpoint
PRAGMA foreign_keys=ON;