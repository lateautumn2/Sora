interface CommentEnvironmentProps {
  browserName?: string | null;
  browserVersion?: string | null;
  className?: string;
  ipCity?: string | null;
}

/** 统一公开评论与后台评论的浏览器、城市辅助信息组合规则。 */
export function CommentEnvironment({
  browserName,
  browserVersion,
  className,
  ipCity,
}: CommentEnvironmentProps) {
  const browser = [browserName?.trim(), browserVersion?.trim()].filter(Boolean).join(" ");
  const city = ipCity?.trim();

  if (!browser && !city) return null;

  return (
    <span className={className}>
      {browser ? (
        <span className="comment-environment-tag comment-environment-browser">{browser}</span>
      ) : null}
      {city ? (
        <span className="comment-environment-tag comment-environment-city">{city}</span>
      ) : null}
    </span>
  );
}
