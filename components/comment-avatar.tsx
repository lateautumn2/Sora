const AVATAR_COLORS = [
  "#e86252",
  "#e89c52",
  "#7fae52",
  "#52a5a5",
  "#5b8bd4",
  "#8b6bd4",
  "#c65ba6",
  "#b0604a",
];

/** 根据名字生成稳定的颜色索引，同一评论者颜色始终一致。 */
function pickColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? "#8b6bd4";
}

/**
 * 本地生成的圆形首字母头像。
 * 不依赖 Gravatar 等外部服务，自托管环境下也能稳定渲染。
 */
export function CommentAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name.trim() || "匿").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="comment-avatar"
      style={{
        background: pickColor(name),
        fontSize: Math.max(13, size * 0.42),
        height: size,
        width: size,
      }}
    >
      {initial}
    </span>
  );
}
