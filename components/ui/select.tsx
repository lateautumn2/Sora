"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, useRef, useState } from "react";

import { Field } from "./field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}

interface SelectControlProps extends Omit<SelectFieldProps, "label" | "error"> {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

const SelectControl = forwardRef<HTMLButtonElement, SelectControlProps>(function SelectControl(
  { defaultValue, id, name, options, placeholder = "请选择", ...ariaProps },
  forwardedRef,
) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");

  function setTriggerRef(element: HTMLButtonElement | null) {
    triggerRef.current = element;
    if (typeof forwardedRef === "function") {
      forwardedRef(element);
    } else if (forwardedRef) {
      forwardedRef.current = element;
    }
  }

  return (
    <SelectPrimitive.Root onValueChange={setValue} value={value}>
      <input name={name} type="hidden" value={value} />
      <SelectPrimitive.Trigger
        {...ariaProps}
        className="ui-select-trigger"
        id={id}
        ref={setTriggerRef}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden="true" size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="ui-select-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          position="popper"
        >
          <SelectPrimitive.Viewport className="ui-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="ui-select-item"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ui-select-item-indicator">
                  <Check aria-hidden="true" size={15} strokeWidth={2.5} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
});

export function SelectField({ error, label, ...props }: SelectFieldProps) {
  return (
    <Field error={error} label={label}>
      <SelectControl {...props} />
    </Field>
  );
}
