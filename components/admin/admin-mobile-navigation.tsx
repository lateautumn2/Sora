"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

import { AdminAccount } from "./admin-account";
import { adminNavigation, isAdminNavigationActive } from "./admin-navigation";

interface AdminMobileNavigationProps {
  user: {
    email: string;
    name: string;
  };
}

export function AdminMobileNavigation({ user }: AdminMobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <Tooltip content="打开后台导航">
        <DialogPrimitive.Trigger asChild>
          <IconButton aria-label="打开后台导航" className="admin-mobile-navigation-trigger">
            <Menu aria-hidden="true" size={19} />
          </IconButton>
        </DialogPrimitive.Trigger>
      </Tooltip>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content className="ui-dialog-content admin-mobile-navigation-dialog">
          <div className="admin-mobile-navigation-header">
            <DialogPrimitive.Title className="admin-mobile-navigation-title">
              后台导航
            </DialogPrimitive.Title>
            <Tooltip content="关闭后台导航">
              <DialogPrimitive.Close asChild>
                <IconButton aria-label="关闭后台导航">
                  <X aria-hidden="true" size={19} />
                </IconButton>
              </DialogPrimitive.Close>
            </Tooltip>
          </div>
          <nav aria-label="移动端后台导航" className="admin-mobile-navigation-list">
            {adminNavigation.map((group) => (
              <section className="admin-navigation-group" key={group.group}>
                <h2>{group.group}</h2>
                <div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isAdminNavigationActive(pathname, item.href);
                    return (
                      <DialogPrimitive.Close asChild key={item.href}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={
                            active
                              ? "admin-mobile-navigation-link is-active"
                              : "admin-mobile-navigation-link"
                          }
                          href={item.href}
                        >
                          <Icon aria-hidden="true" size={17} />
                          {item.label}
                        </Link>
                      </DialogPrimitive.Close>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
          <AdminAccount email={user.email} name={user.name} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
