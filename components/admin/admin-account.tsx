import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/(admin)/admin/actions";
import { IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface AdminAccountProps {
  email: string;
  name: string;
}

export function AdminAccount({ email, name }: AdminAccountProps) {
  const displayName = name || "管理员";

  return (
    <div className="admin-navigation-account">
      <span aria-hidden="true" className="admin-navigation-account-avatar">
        {displayName.slice(0, 1).toUpperCase()}
      </span>
      <div className="admin-navigation-account-copy">
        <strong title={displayName}>{displayName}</strong>
        <span title={email}>{email}</span>
      </div>
      <div className="admin-navigation-account-actions">
        <Tooltip content="查看站点">
          <Link
            aria-label="查看站点"
            className="admin-navigation-account-link"
            href="/"
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" size={16} />
          </Link>
        </Tooltip>
        <form action={signOutAction}>
          <Tooltip content="退出登录">
            <IconButton
              aria-label="退出登录"
              className="admin-navigation-account-button"
              type="submit"
            >
              <LogOut aria-hidden="true" size={16} />
            </IconButton>
          </Tooltip>
        </form>
      </div>
    </div>
  );
}
