CREATE TABLE `friend_links` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `url` text NOT NULL,
  `logo_url` text,
  `description` text DEFAULT '' NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  CONSTRAINT "friend_links_sort_order_check" CHECK(`sort_order` BETWEEN 0 AND 999),
  CONSTRAINT "friend_links_enabled_check" CHECK(`enabled` IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_links_url_unique` ON `friend_links` (`url`);
--> statement-breakpoint
CREATE INDEX `friend_links_public_sort_idx` ON `friend_links` (`enabled`, `sort_order`, `name`);
