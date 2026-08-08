"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ReactNode, useState } from "react";

import { Button } from "./button";
import { Tooltip } from "./tooltip";

export interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  trigger?: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: ReactNode;
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
  trigger,
  triggerAsChild = false,
  triggerTooltip,
  triggerLabel = title,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const triggerElement = triggerAsChild ? (
    trigger
  ) : (
    <Button type="button">{trigger ?? triggerLabel}</Button>
  );
  const dialogTrigger = <DialogPrimitive.Trigger asChild>{triggerElement}</DialogPrimitive.Trigger>;

  function confirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      {triggerTooltip ? <Tooltip content={triggerTooltip}>{dialogTrigger}</Tooltip> : dialogTrigger}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content className="ui-dialog-content" role="alertdialog">
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
            <Button className="ui-button-danger" onClick={confirm} type="button">
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
