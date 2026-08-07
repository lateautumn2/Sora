import { z } from "zod";

export const publicCommentSchema = z.object({
  authorName: z.string().trim().min(1, "请输入昵称").max(60, "昵称不能超过 60 个字符"),
  authorEmail: z.string().trim().email("请输入有效邮箱").max(254),
  authorWebsite: z.union([z.literal(""), z.string().url("个人网站格式不正确")]).default(""),
  content: z.string().trim().min(2, "评论至少需要 2 个字符").max(5000, "评论不能超过 5000 个字符"),
  parentId: z.string().uuid().nullable().default(null),
  requestToken: z.string().uuid("提交标识无效"),
  company: z.string().max(0, "提交被拒绝").default(""),
});

export type PublicCommentInput = z.infer<typeof publicCommentSchema>;
