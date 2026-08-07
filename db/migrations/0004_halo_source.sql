PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_media` (
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
	CONSTRAINT "media_byte_size_check" CHECK("__new_media"."byte_size" >= 0),
	CONSTRAINT "media_source_check" CHECK("__new_media"."source" IN ('NATIVE', 'HALO'))
);
--> statement-breakpoint
INSERT INTO `__new_media` (
	`id`, `storage_key`, `original_name`, `mime_type`, `byte_size`, `width`, `height`,
	`sha256`, `alt_text`, `source`, `created_at`, `updated_at`
)
SELECT
	`id`, `storage_key`, `original_name`, `mime_type`, `byte_size`, `width`, `height`,
	`sha256`, `alt_text`, CASE WHEN `source` = 'TYPECHO' THEN 'HALO' ELSE `source` END,
	`created_at`, `updated_at`
FROM `media`;
--> statement-breakpoint
DROP TABLE `media`;
--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;
--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_unique` ON `media` (`storage_key`);
--> statement-breakpoint
CREATE INDEX `media_created_at_idx` ON `media` (`created_at`);
--> statement-breakpoint
CREATE TABLE `__new_comments` (
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
	CONSTRAINT "comments_status_check" CHECK("__new_comments"."status" IN ('PENDING', 'APPROVED', 'SPAM', 'TRASHED')),
	CONSTRAINT "comments_source_check" CHECK("__new_comments"."source" IN ('NATIVE', 'HALO'))
);
--> statement-breakpoint
INSERT INTO `__new_comments` (
	`id`, `post_id`, `parent_id`, `root_id`, `status`, `author_name`, `author_email`,
	`author_website`, `content`, `rendered_html`, `ip_hash`, `user_agent_summary`,
	`source`, `created_at`, `updated_at`, `approved_at`
)
SELECT
	`id`, `post_id`, `parent_id`, `root_id`, `status`, `author_name`, `author_email`,
	`author_website`, `content`, `rendered_html`, `ip_hash`, `user_agent_summary`,
	CASE WHEN `source` = 'TYPECHO' THEN 'HALO' ELSE `source` END,
	`created_at`, `updated_at`, `approved_at`
FROM `comments`;
--> statement-breakpoint
DROP TABLE `comments`;
--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;
--> statement-breakpoint
CREATE INDEX `comments_post_status_idx` ON `comments` (`post_id`, `status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `comments_moderation_idx` ON `comments` (`status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
