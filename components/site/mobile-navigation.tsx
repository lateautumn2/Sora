"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

export function MobileNavigation({
  navigation,
}: {
  navigation: ReadonlyArray<{ href: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sora-mobile-navigation">
      <button
        aria-expanded={open}
        aria-label={open ? "关闭导航" : "打开导航"}
        className="sora-icon-link"
        onClick={() => setOpen((current) => !current)}
        title={open ? "关闭导航" : "打开导航"}
        type="button"
      >
        {open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
      </button>
      {open ? (
        <nav aria-label="移动端导航" className="sora-mobile-navigation-panel">
          <div className="sora-mobile-navigation-links">
            {navigation.map((item) => (
              <Link
                className="sora-mobile-navigation-link"
                href={item.href as Route}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
