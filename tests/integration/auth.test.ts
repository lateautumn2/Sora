import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";

import { createTestAuth } from "@/lib/auth/server";
import { createDatabaseConnection } from "@/lib/db/client";
import { parseEnvironment } from "@/lib/env";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("single administrator authentication", () => {
  it("creates one administrator, stores a password hash, and signs in", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sora-blog-auth-"));
    temporaryDirectories.push(directory);
    const connection = createDatabaseConnection(join(directory, "blog.db"));
    migrate(connection.db, { migrationsFolder: join(process.cwd(), "db", "migrations") });

    const environment = parseEnvironment({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-auth-secret-that-is-at-least-32-characters",
      VISITOR_HASH_SECRET: "test-visitor-secret-that-is-at-least-32-characters",
    });
    const testAuth = createTestAuth(connection.sqlite, environment);

    await testAuth.api.signUpEmail({
      body: {
        name: "Admin",
        email: "admin@example.com",
        password: "a-strong-test-password",
      },
    });

    const user = connection.sqlite.prepare("SELECT email, singleton FROM user").get() as {
      email: string;
      singleton: number;
    };
    const account = connection.sqlite.prepare("SELECT password FROM account").get() as {
      password: string;
    };

    expect(user).toEqual({ email: "admin@example.com", singleton: 1 });
    expect(account.password).not.toBe("a-strong-test-password");

    const result = await testAuth.api.signInEmail({
      body: {
        email: "admin@example.com",
        password: "a-strong-test-password",
      },
    });
    expect(result.user.email).toBe("admin@example.com");

    await expect(
      testAuth.api.signUpEmail({
        body: {
          name: "Second Admin",
          email: "second@example.com",
          password: "another-strong-password",
        },
      }),
    ).rejects.toThrow();

    connection.sqlite.close();
  });
});
