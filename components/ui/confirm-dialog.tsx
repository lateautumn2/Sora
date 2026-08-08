"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cloneElement, type ReactElement, type ReactNode, type Ref, type RefObject } from "react";
import { useRef, useState } from "react";

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

type TriggerElementProps = { ref?: Ref<HTMLButtonElement> };

function bindTriggerRef(
  trigger: ReactElement<TriggerElementProps>,
  triggerRef: RefObject<HTMLButtonElement | null>,
) {
  const childRef = trigger.props.ref;
  return cloneElement(trigger, {
    ref: (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef) {
        (childRef as { current: HTMLButtonElement | null }).current = node;
      }
    },
  });
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerElement = triggerAsChild ? (
    bindTriggerRef(trigger as ReactElement<TriggerElementProps>, triggerRef)
  ) : (
    <Button ref={triggerRef} type="button">
      {trigger ?? triggerLabel}
    </Button>
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
        <DialogPrimitive.Content
          className="ui-dialog-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          role="alertdialog"
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
