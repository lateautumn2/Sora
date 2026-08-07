CREATE TABLE `comment_requests` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comment_requests_created_at_idx` ON `comment_requests` (`created_at`);
--> statement-breakpoint
CREATE TABLE `public_rate_limits` (
	`key` text NOT NULL,
	`bucket_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`key`, `bucket_start`),
	CONSTRAINT "public_rate_limits_count_check" CHECK("public_rate_limits"."count" >= 1)
);
--> statement-breakpoint
CREATE INDEX `public_rate_limits_updated_at_idx` ON `public_rate_limits` (`updated_at`);
