import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type Database from "better-sqlite3";

import { getDatabaseConnection } from "@/lib/db/client";
import { getEnvironment, type AppEnvironment } from "@/lib/env";
import { getAppUrl, getTrustedOrigins } from "@/lib/runtime-config";

function createAuthOptions(
  database: Database.Database,
  environment: AppEnvironment,
  dynamicRuntime: boolean,
): BetterAuthOptions {
  return {
    appName: "Sora Blog",
    // 生产实例使用动态 baseURL：每次请求从 Host 头解析，允许的主机与可信来源
    // 来自 runtime.json（后台可修改，保存后立即生效，无需重启容器）。
    baseURL: dynamicRuntime
      ? {
          protocol: "auto",
          allowedHosts: createRuntimeAllowedHosts(),
          // fallback 必须跟随运行期配置：它同时会被 better-auth 加入受信来源，
          // 若写死默认地址，后台改完站点地址后旧地址仍是受信来源，无法真正失效。
          // 用 getter 保证每次请求都读取当前 runtime 配置。
          get fallback() {
            return getAppUrl().origin;
          },
        }
      : environment.appUrl.origin,
    secret: environment.authSecret,
    trustedOrigins: dynamicRuntime ? () => getTrustedOrigins() : environment.trustedOrigins,
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
      // 后台会话支持远程撤销，授权判断必须以数据库记录为准。
      // 若启用签名 Cookie 缓存，被撤销的浏览器会在缓存有效期内继续通过认证。
      cookieCache: {
        enabled: false,
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

/** 当前运行期允许的认证主机（站点地址 + 额外可信来源的 host）。 */
function runtimeAllowedHosts(): string[] {
  return getTrustedOrigins().map((origin) => new URL(origin).host);
}

/**
 * better-auth 的动态 baseURL 要求 allowedHosts 是数组字面量，
 * 但站点地址/来源允许在后台修改且需立即生效。
 * 用 Proxy 包装数组：length 与索引访问实时委托给 runtime 配置，
 * Array.isArray 依然返回 true，better-auth 的校验路径不受影响。
 */
function createRuntimeAllowedHosts(): string[] {
  const target: string[] = [];
  return new Proxy(target, {
    get(_target, property, receiver) {
      if (property === "length") {
        return runtimeAllowedHosts().length;
      }
      if (typeof property === "string" && /^\d+$/.test(property)) {
        return runtimeAllowedHosts()[Number(property)];
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

export function createTestAuth(database: Database.Database, environment: AppEnvironment) {
  // 测试实例保持静态配置，避免测试受数据卷与模块缓存影响。
  return betterAuth(createAuthOptions(database, environment, false));
}

const environment = getEnvironment();

export const auth = betterAuth({
  ...createAuthOptions(getDatabaseConnection().sqlite, environment, true),
  // This plugin must stay last so Server Actions can forward Better Auth cookies.
  plugins: [nextCookies()],
});
