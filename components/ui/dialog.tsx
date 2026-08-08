"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode, useRef } from "react";

import { Button, IconButton } from "./button";

export interface DialogProps {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  description?: string;
}

export function Dialog({ children, description, title, trigger }: DialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button ref={triggerRef} type="button">
          {trigger}
        </Button>
      </DialogPrimitive.Trigger>
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
