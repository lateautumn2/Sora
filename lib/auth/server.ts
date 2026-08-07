import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type Database from "better-sqlite3";

import { getDatabaseConnection } from "@/lib/db/client";
import { getEnvironment, type AppEnvironment } from "@/lib/env";

function createAuthOptions(
  database: Database.Database,
  environment: AppEnvironment,
): BetterAuthOptions {
  return {
    appName: "Sora Blog",
    baseURL: environment.appUrl.origin,
    secret: environment.authSecret,
    trustedOrigins: environment.trustedOrigins,
    database,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    advanced: {
      useSecureCookies: environment.nodeEnv === "production",
    },
  };
}

export function createTestAuth(database: Database.Database, environment: AppEnvironment) {
  return betterAuth(createAuthOptions(database, environment));
}

const environment = getEnvironment();

export const auth = betterAuth({
  ...createAuthOptions(getDatabaseConnection().sqlite, environment),
  // This plugin must stay last so Server Actions can forward Better Auth cookies.
  plugins: [nextCookies()],
});
