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

export const contentInputSchema = z.object({
  id: z.string().uuid().optional(),
  kind: contentKindSchema,
  title: z.string().trim().min(1, "请输入标题").max(200, "标题不能超过 200 个字符"),
  slug: slugSchema,
  excerpt: z.string().trim().max(500, "摘要不能超过 500 个字符").optional(),
  sourceContent: z.string().min(1, "请输入正文").max(2_000_000, "正文内容过长"),
  sourceFormat: z.enum(["MARKDOWN", "HTML"]).default("MARKDOWN"),
  status: contentStatusSchema,
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  allowComment: z.boolean(),
  pinned: z.boolean(),
  coverMediaId: z.union([z.literal(""), z.string().uuid()]).optional(),
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
  categoryIds: z.array(z.string().uuid()).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
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
  id: z.string().uuid().optional(),
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
  allowComments: z.boolean().default(true),
  requireCommentModeration: z.boolean().default(true),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
