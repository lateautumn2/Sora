CREATE VIRTUAL TABLE `posts_fts` USING fts5(
	`post_id` UNINDEXED,
	`title`,
	`excerpt`,
	`plain_text`,
	tokenize = 'unicode61'
);
--> statement-breakpoint
INSERT INTO `posts_fts` (`post_id`, `title`, `excerpt`, `plain_text`)
SELECT `id`, `title`, COALESCE(`excerpt`, ''), `plain_text`
FROM `posts`
WHERE `kind` = 'POST' AND `status` = 'PUBLISHED' AND `visibility` = 'PUBLIC';
--> statement-breakpoint
CREATE TRIGGER `posts_fts_after_insert`
AFTER INSERT ON `posts`
WHEN NEW.`kind` = 'POST' AND NEW.`status` = 'PUBLISHED' AND NEW.`visibility` = 'PUBLIC'
BEGIN
	INSERT INTO `posts_fts` (`post_id`, `title`, `excerpt`, `plain_text`)
	VALUES (NEW.`id`, NEW.`title`, COALESCE(NEW.`excerpt`, ''), NEW.`plain_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_after_update`
AFTER UPDATE ON `posts`
BEGIN
	DELETE FROM `posts_fts` WHERE `post_id` = OLD.`id`;
	INSERT INTO `posts_fts` (`post_id`, `title`, `excerpt`, `plain_text`)
	SELECT NEW.`id`, NEW.`title`, COALESCE(NEW.`excerpt`, ''), NEW.`plain_text`
	WHERE NEW.`kind` = 'POST' AND NEW.`status` = 'PUBLISHED' AND NEW.`visibility` = 'PUBLIC';
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_after_delete`
AFTER DELETE ON `posts`
BEGIN
	DELETE FROM `posts_fts` WHERE `post_id` = OLD.`id`;
END;
