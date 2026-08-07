import { getDatabaseConnection } from "@/lib/db/client";
import { InteractionError } from "@/lib/comments/service";

function ensurePublicPost(postId: string): void {
  const row = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id FROM posts WHERE id = ? AND kind = 'POST' AND status = 'PUBLISHED'
       AND visibility = 'PUBLIC' AND published_at <= ?`,
    )
    .get(postId, Date.now());
  if (!row) throw new InteractionError("POST_NOT_FOUND");
}

export function registerView(
  postId: string,
  visitorHash: string,
): { viewCount: number; upvoteCount: number; upvoted: boolean } {
  const sqlite = getDatabaseConnection().sqlite;
  return sqlite.transaction(() => {
    ensurePublicPost(postId);
    const bucketDate = new Date().toISOString().slice(0, 10);
    const result = sqlite
      .prepare(
        `INSERT OR IGNORE INTO post_views (post_id, visitor_hash, bucket_date, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(postId, visitorHash, bucketDate, Date.now());
    if (result.changes > 0) {
      sqlite.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(postId);
    }
    const counts = sqlite
      .prepare(
        "SELECT view_count AS viewCount, upvote_count AS upvoteCount FROM posts WHERE id = ?",
      )
      .get(postId) as { viewCount: number; upvoteCount: number };
    const upvoted = Boolean(
      sqlite
        .prepare("SELECT 1 FROM post_upvotes WHERE post_id = ? AND visitor_hash = ?")
        .get(postId, visitorHash),
    );
    return { ...counts, upvoted };
  })();
}

export function toggleUpvote(
  postId: string,
  visitorHash: string,
): { upvoteCount: number; upvoted: boolean } {
  const sqlite = getDatabaseConnection().sqlite;
  return sqlite.transaction(() => {
    ensurePublicPost(postId);
    const existing = sqlite
      .prepare("SELECT 1 FROM post_upvotes WHERE post_id = ? AND visitor_hash = ?")
      .get(postId, visitorHash);
    if (existing) {
      sqlite
        .prepare("DELETE FROM post_upvotes WHERE post_id = ? AND visitor_hash = ?")
        .run(postId, visitorHash);
      sqlite
        .prepare("UPDATE posts SET upvote_count = MAX(upvote_count - 1, 0) WHERE id = ?")
        .run(postId);
    } else {
      sqlite
        .prepare("INSERT INTO post_upvotes (post_id, visitor_hash, created_at) VALUES (?, ?, ?)")
        .run(postId, visitorHash, Date.now());
      sqlite.prepare("UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = ?").run(postId);
    }
    const row = sqlite
      .prepare("SELECT upvote_count AS upvoteCount FROM posts WHERE id = ?")
      .get(postId) as {
      upvoteCount: number;
    };
    return { upvoteCount: row.upvoteCount, upvoted: !existing };
  })();
}
