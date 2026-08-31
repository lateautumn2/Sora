"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import Link, { type LinkProps } from "next/link";
import type { ReactElement, ReactNode } from "react";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
}

export type TooltipLinkProps<RouteType> = LinkProps<RouteType> & {
  content: ReactNode;
};

export function Tooltip({ children, content }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="ui-tooltip-content" sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow className="ui-tooltip-arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * 在客户端边界内创建 Link，避免客户端路由切换时由 RSC 传入的延迟节点
 * 被 Radix Slot 误判为非单一 React 元素。
 */
export function TooltipLink<RouteType>({
  children,
  content,
  ...props
}: TooltipLinkProps<RouteType>) {
  return (
    <Tooltip content={content}>
      <Link<RouteType> {...props}>{children}</Link>
    </Tooltip>
  );
}
