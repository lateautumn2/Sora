"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  ["/admin", "仪表盘"],
  ["/admin/posts", "文章"],
  ["/admin/pages", "页面"],
  ["/admin/categories", "分类"],
  ["/admin/tags", "标签"],
  ["/admin/comments", "评论"],
  ["/admin/media", "媒体"],
  ["/admin/menus", "菜单"],
  ["/admin/data", "数据管理"],
  ["/admin/settings", "设置"],
] as const;

export function AdminMobileNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label={open ? "关闭后台导航" : "打开后台导航"}
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
        title={open ? "关闭后台导航" : "打开后台导航"}
        type="button"
      >
        {open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
      </button>
      {open ? (
        <nav
          aria-label="移动端后台导航"
          className="absolute inset-x-0 top-16 z-40 grid gap-1 border-b border-[var(--border)] bg-white p-4 shadow-sm"
        >
          {navigation.map(([href, label]) => (
            <Link
              className="rounded-[var(--radius)] px-3 py-2.5 text-sm hover:bg-[var(--surface)]"
              href={href as Route}
              key={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
