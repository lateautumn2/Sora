import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  countFriendLinks,
  deleteFriendLink,
  FriendLinkConflictError,
  listAdminFriendLinks,
  listPublicFriendLinks,
  saveFriendLink,
} from "@/lib/friends/service";
import { resetDatabaseConnectionForTests } from "@/lib/db/client";
import { resetEnvironmentForTests } from "@/lib/env";

let directory: string;
let previousDatabasePath: string | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "sora-blog-friends-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "blog.db");
  resetEnvironmentForTests();
  resetDatabaseConnectionForTests();
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    cwd: process.cwd(),
    env: process.env,
  });
});

afterEach(() => {
  resetDatabaseConnectionForTests();
  resetEnvironmentForTests();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(directory, { recursive: true, force: true });
});

describe("friend links service", () => {
  it("creates, updates, paginates, filters, sorts, and deletes friend links", () => {
    const alphaId = saveFriendLink({
      name: "Alpha",
      url: "https://alpha.example.com",
      logoUrl: "/media/alpha.png",
      description: "Alpha site",
      sortOrder: 20,
      enabled: true,
    });
    const betaId = saveFriendLink({
      name: "Beta",
      url: "http://beta.example.com",
      logoUrl: "",
      description: "Beta site",
      sortOrder: 10,
      enabled: false,
    });

    expect(countFriendLinks()).toBe(2);
    expect(listAdminFriendLinks(1, 0)).toHaveLength(1);
    expect(listPublicFriendLinks().map((item) => item.id)).toEqual([alphaId]);

    saveFriendLink({
      id: betaId,
      name: "Beta Enabled",
      url: "https://beta.example.com",
      logoUrl: "https://cdn.example.com/beta.png",
      description: "Updated",
      sortOrder: 5,
      enabled: true,
    });
    expect(listPublicFriendLinks().map((item) => item.id)).toEqual([betaId, alphaId]);

    deleteFriendLink(alphaId);
    expect(countFriendLinks()).toBe(1);
  });

  it("rejects duplicate URLs with a domain error", () => {
    saveFriendLink({
      name: "First",
      url: "https://same.example.com",
      logoUrl: "",
      description: "",
      sortOrder: 0,
      enabled: true,
    });
    expect(() =>
      saveFriendLink({
        name: "Second",
        url: "https://same.example.com",
        logoUrl: "",
        description: "",
        sortOrder: 0,
        enabled: true,
      }),
    ).toThrow(FriendLinkConflictError);
  });

  it("accepts only HTTP or HTTPS websites and safe logo locations", () => {
    expect(() =>
      saveFriendLink({
        name: "Unsupported protocol",
        url: "ftp://example.com",
        logoUrl: "",
        description: "",
        sortOrder: 0,
        enabled: true,
      }),
    ).toThrow();
    expect(() =>
      saveFriendLink({
        name: "Unsafe logo",
        url: "https://logo.example.com",
        logoUrl: "http://cdn.example.com/logo.png",
        description: "",
        sortOrder: 0,
        enabled: true,
      }),
    ).toThrow();
  });

  it("reports malformed website URLs as Zod validation failures", () => {
    expect(() =>
      saveFriendLink({
        name: "Malformed URL",
        url: "not-a-url",
        logoUrl: "",
        description: "",
        sortOrder: 0,
        enabled: true,
      }),
    ).toThrow(z.ZodError);
  });
});
