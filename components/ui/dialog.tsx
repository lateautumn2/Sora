"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactElement, type ReactNode, useRef } from "react";

import { Button, IconButton } from "./button";
import { Tooltip } from "./tooltip";

export interface DialogProps {
  trigger: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: ReactNode;
  title: string;
  children: ReactNode;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title,
  trigger,
  triggerAsChild = false,
  triggerTooltip,
}: DialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {triggerTooltip ? (
        <Tooltip content={triggerTooltip}>
          <DialogPrimitive.Trigger asChild>
            {triggerAsChild ? (
              (trigger as ReactElement)
            ) : (
              <Button ref={triggerRef} type="button">
                {trigger}
              </Button>
            )}
          </DialogPrimitive.Trigger>
        </Tooltip>
      ) : (
        <DialogPrimitive.Trigger asChild>
          {triggerAsChild ? (
            (trigger as ReactElement)
          ) : (
            <Button ref={triggerRef} type="button">
              {trigger}
            </Button>
          )}
        </DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content
          className="ui-dialog-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
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
