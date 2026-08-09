"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button, IconButton } from "./button";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

export interface DialogProps {
  trigger: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: ReactNode;
  title: string;
  children: ReactNode;
  contentClassName?: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  children,
  contentClassName,
  description,
  onOpenChange,
  open,
  title,
  trigger,
  triggerAsChild = false,
  triggerTooltip,
}: DialogProps) {
  const triggerElement = triggerAsChild ? trigger : <Button type="button">{trigger}</Button>;
  const dialogTrigger = <DialogPrimitive.Trigger asChild>{triggerElement}</DialogPrimitive.Trigger>;

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {triggerTooltip ? <Tooltip content={triggerTooltip}>{dialogTrigger}</Tooltip> : dialogTrigger}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content className={cn("ui-dialog-content", contentClassName)}>
          <div className="ui-dialog-header">
            <div>
              <DialogPrimitive.Title className="ui-dialog-title">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="ui-dialog-description">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton aria-label="关闭" type="button">
                <X aria-hidden="true" size={18} />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          <div className="ui-dialog-body">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
