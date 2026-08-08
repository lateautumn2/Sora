"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, useState } from "react";

import { Button } from "./button";

export interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  triggerLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  cancelLabel = "取消",
  confirmLabel = "确认删除",
  description,
  onConfirm,
  title,
  triggerLabel = title,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function confirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>
        <Button ref={triggerRef} type="button">
          {triggerLabel}
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
          <DialogPrimitive.Title className="ui-dialog-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="ui-dialog-description">
            {description}
          </DialogPrimitive.Description>
          <div className="ui-dialog-actions">
            <DialogPrimitive.Close asChild>
              <Button className="ui-button-secondary" type="button">
                {cancelLabel}
              </Button>
            </DialogPrimitive.Close>
            <Button onClick={confirm} type="button">
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
