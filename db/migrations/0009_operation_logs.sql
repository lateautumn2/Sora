CREATE TABLE `operation_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `actor_name` text NOT NULL,
  `actor_email` text NOT NULL,
  `action` text NOT NULL,
  `target_type` text NOT NULL,
  `target_id` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operation_logs_created_at_idx` ON `operation_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `operation_logs_action_idx` ON `operation_logs` (`action`, `created_at`);
--> statement-breakpoint
CREATE INDEX `operation_logs_user_id_idx` ON `operation_logs` (`user_id`, `created_at`);
