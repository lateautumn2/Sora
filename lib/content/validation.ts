import { z } from "zod";

export const contentKindSchema = z.enum(["POST", "PAGE"]);
export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const slugSchema = z
  .string()
  .trim()
  .min(1, "请输入 URL 别名")
  .max(160, "URL 别名不能超过 160 个字符")
  .regex(
    /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u,
    "URL 别名只能包含文字、数字和连字符",
  );

/**
 * 数据库与内容包格式允许使用 UUID 或迁移来源的稳定字符串作为实体 ID。
 * ID 只会作为参数化 SQL 的关联值使用，因此这里约束非空与长度，不强制 UUID。
 */
export const storedIdentifierSchema = z.string().trim().min(1).max(255);

export const contentInputSchema = z.object({
  id: storedIdentifierSchema.optional(),
  kind: contentKindSchema,
  title: z.string().trim().min(1, "请输入标题").max(200, "标题不能超过 200 个字符"),
  slug: slugSchema,
  excerpt: z.string().trim().max(500, "摘要不能超过 500 个字符").optional(),
  sourceContent: z.string().min(1, "请输入正文").max(2_000_000, "正文内容过长"),
  sourceFormat: z.enum(["MARKDOWN", "HTML"]).default("MARKDOWN"),
  status: contentStatusSchema,
  allowComment: z.boolean(),
  pinned: z.boolean(),
  coverMediaId: z.union([z.literal(""), storedIdentifierSchema]).optional(),
  coverUrl: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .url("封面图片 URL 格式不正确")
        .refine((value) => /^https?:\/\//i.test(value), "封面图片 URL 仅支持 HTTP(S)"),
    ])
    .optional(),
  categoryIds: z.array(storedIdentifierSchema).default([]),
  tagIds: z.array(storedIdentifierSchema).default([]),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  canonicalUrl: z.union([z.literal(""), z.string().url("规范链接格式不正确")]).optional(),
});

export type ContentInput = z.infer<typeof contentInputSchema>;

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function decodeSlugParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const taxonomyInputSchema = z.object({
  // 导入的分类与标签可能使用来源系统的稳定字符串 ID，不应只接受 UUID。
  id: storedIdentifierSchema.optional(),
  name: z.string().trim().min(1, "请输入名称").max(80, "名称不能超过 80 个字符"),
  slug: slugSchema,
  description: z.string().trim().max(500, "说明不能超过 500 个字符").default(""),
});

export const siteSettingsSchema = z.object({
  title: z.string().trim().min(1).max(80).default("Sora"),
  description: z.string().trim().max(240).default("记录技术、生活与仍在思考的事。"),
  homeQuoteHtml: z.string().trim().max(20_000, "今日一言内容不能超过 20000 个字符").default(""),
  authorName: z.string().trim().max(60).default("Sora"),
  avatarUrl: z.union([z.literal(""), z.string().url()]).default(""),
  faviconUrl: z.union([z.literal(""), z.string().url()]).default(""),
  email: z.union([z.literal(""), z.string().email()]).default(""),
  githubUrl: z.union([z.literal(""), z.string().url()]).default(""),
  weiboUrl: z.union([z.literal(""), z.string().url()]).default(""),
  bilibiliUrl: z.union([z.literal(""), z.string().url()]).default(""),
  xUrl: z.union([z.literal(""), z.string().url()]).default(""),
  footerText: z.string().trim().max(160).default("内容优先，保持克制。"),
  footerQuoteSource: z.enum(["NONE", "HITOKOTO", "GUSHI"]).default("NONE"),
  coverSources: z
    .array(
      z.object({
        name: z.string().trim().min(1, "请输入封面来源名称").max(60),
        url: z
          .string()
          .trim()
          .url("封面来源 URL 格式不正确")
          .refine((value) => /^https?:\/\//i.test(value), "封面来源仅支持 HTTP(S)"),
      }),
    )
    .max(20, "封面来源不能超过 20 个")
    .refine(
      (sources) => new Set(sources.map((source) => source.url)).size === sources.length,
      "封面来源 URL 不能重复",
    )
    .default([]),
  allowComments: z.boolean().default(true),
  requireCommentModeration: z.boolean().default(true),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type CoverSource = SiteSettings["coverSources"][number];
