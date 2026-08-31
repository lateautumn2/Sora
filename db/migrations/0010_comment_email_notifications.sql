ALTER TABLE `comments` ADD `author_role` text DEFAULT 'VISITOR' NOT NULL CHECK(`author_role` IN ('VISITOR', 'OWNER'));
--> statement-breakpoint
ALTER TABLE `comments` ADD `reply_notified_at` integer;
--> statement-breakpoint
UPDATE `comments` SET `author_role` = 'OWNER' WHERE `ip_hash` = 'administrator';
