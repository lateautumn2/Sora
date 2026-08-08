"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  useRef,
} from "react";

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
  const triggerElement = triggerAsChild ? (
    bindTriggerRef(trigger as ReactElement<TriggerElementProps>, triggerRef)
  ) : (
    <Button ref={triggerRef} type="button">
      {trigger}
    </Button>
  );
  const dialogTrigger = <DialogPrimitive.Trigger asChild>{triggerElement}</DialogPrimitive.Trigger>;

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {triggerTooltip ? <Tooltip content={triggerTooltip}>{dialogTrigger}</Tooltip> : dialogTrigger}
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
