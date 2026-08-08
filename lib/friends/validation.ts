import { z } from "zod";

const websiteUrlSchema = z.string().trim().url("网址格式不正确").refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "网址仅支持 HTTP 或 HTTPS");

const logoUrlSchema = z.string().trim().refine(
  (value) => value === "" || value.startsWith("/media/") ||
    (URL.canParse(value) && new URL(value).protocol === "https:"),
  "Logo 仅支持 HTTPS 地址或项目内部图片地址",
);

export const friendLinkInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "请输入名称").max(80, "名称不能超过 80 个字符"),
  url: websiteUrlSchema,
  logoUrl: logoUrlSchema.default(""),
  description: z.string().trim().max(240, "描述不能超过 240 个字符").default(""),
  sortOrder: z.coerce.number().int().min(0).max(999),
  enabled: z.boolean(),
});

export type FriendLinkInput = z.infer<typeof friendLinkInputSchema>;
