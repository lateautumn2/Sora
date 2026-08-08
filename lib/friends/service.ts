import { randomUUID } from "node:crypto";

import { getDatabaseConnection } from "@/lib/db/client";
import { friendLinkInputSchema, type FriendLinkInput } from "@/lib/friends/validation";

export interface FriendLink {
  id: string;
  name: string;
  url: string;
  logoUrl: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface FriendLinkDatabaseRow extends Omit<FriendLink, "enabled"> {
  enabled: number;
}

export class FriendLinkConflictError extends Error {
  constructor() {
    super("FRIEND_LINK_URL_CONFLICT");
    this.name = "FriendLinkConflictError";
  }
}

function mapFriendLink(row: FriendLinkDatabaseRow): FriendLink {
  return {
    ...row,
    logoUrl: row.logoUrl ?? "",
    enabled: Boolean(row.enabled),
  };
}

function isFriendLinkUrlConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
    error.message.includes("friend_links.url")
  );
}

export function countFriendLinks(): number {
  const row = getDatabaseConnection().sqlite.prepare("SELECT COUNT(*) AS total FROM friend_links").get() as {
    total: number;
  };
  return row.total;
}

export function listAdminFriendLinks(limit: number, offset: number): FriendLink[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, name, url, logo_url AS logoUrl, description,
              sort_order AS sortOrder, enabled, created_at AS createdAt, updated_at AS updatedAt
       FROM friend_links
       ORDER BY sort_order, name
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as FriendLinkDatabaseRow[];
  return rows.map(mapFriendLink);
}

export function listPublicFriendLinks(): FriendLink[] {
  const rows = getDatabaseConnection()
    .sqlite.prepare(
      `SELECT id, name, url, logo_url AS logoUrl, description,
              sort_order AS sortOrder, enabled, created_at AS createdAt, updated_at AS updatedAt
       FROM friend_links
       WHERE enabled = 1
       ORDER BY sort_order, name`,
    )
    .all() as FriendLinkDatabaseRow[];
  return rows.map(mapFriendLink);
}

export function saveFriendLink(input: FriendLinkInput): string {
  const value = friendLinkInputSchema.parse(input);
  const sqlite = getDatabaseConnection().sqlite;
  const id = value.id ?? randomUUID();
  const now = Date.now();
  const parameters = {
    id,
    name: value.name,
    url: value.url,
    logoUrl: value.logoUrl || null,
    description: value.description,
    sortOrder: value.sortOrder,
    enabled: value.enabled ? 1 : 0,
    now,
  };

  try {
    if (value.id) {
      sqlite
        .prepare(
          `UPDATE friend_links SET
             name = @name,
             url = @url,
             logo_url = @logoUrl,
             description = @description,
             sort_order = @sortOrder,
             enabled = @enabled,
             updated_at = @now
           WHERE id = @id`,
        )
        .run(parameters);
    } else {
      sqlite
        .prepare(
          `INSERT INTO friend_links (
             id, name, url, logo_url, description, sort_order, enabled, created_at, updated_at
           ) VALUES (
             @id, @name, @url, @logoUrl, @description, @sortOrder, @enabled, @now, @now
           )`,
        )
        .run(parameters);
    }
  } catch (error) {
    if (isFriendLinkUrlConflict(error)) {
      throw new FriendLinkConflictError();
    }
    throw error;
  }

  return id;
}

export function deleteFriendLink(id: string): void {
  getDatabaseConnection().sqlite.prepare("DELETE FROM friend_links WHERE id = ?").run(id);
}

export type { FriendLinkInput };
