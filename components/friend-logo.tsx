"use client";

import { useState } from "react";

interface FriendLogoProps {
  name: string;
  logoUrl: string;
}

export function FriendLogo({ name, logoUrl }: FriendLogoProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = logoUrl.trim();
  const fallback = Array.from(name.trim())[0]?.toUpperCase() || "?";

  if (!source || failedSource === source) {
    return (
      <span aria-label={`${name} Logo`} className="friend-logo friend-logo-fallback" role="img">
        {fallback}
      </span>
    );
  }

  return (
    <img
      alt={`${name} Logo`}
      className="friend-logo friend-logo-image"
      onError={() => setFailedSource(source)}
      src={source}
    />
  );
}
