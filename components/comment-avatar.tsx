"use client";

import { useState } from "react";

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

/** 优先加载 Gravatar；不存在或网络失败时使用稳定的本地首字头像。 */
export function CommentAvatar({
  avatarHash,
  name,
  size = 36,
}: {
  avatarHash?: string | null;
  name: string;
  size?: number;
}) {
  const [failedHash, setFailedHash] = useState<string | null>(null);
  const initial = (name.trim() || "匿").slice(0, 1).toUpperCase();

  if (avatarHash && failedHash !== avatarHash) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Gravatar may return 404 and must fall back locally.
      <img
        alt={`${name}的头像`}
        className="comment-avatar comment-avatar-image"
        height={size}
        onError={() => setFailedHash(avatarHash)}
        src={`https://gravatar.com/avatar/${avatarHash}?s=${size * 2}&d=404`}
        style={{ height: size, width: size }}
        width={size}
      />
    );
  }

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
