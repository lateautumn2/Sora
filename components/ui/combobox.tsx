"use client";

import { Command } from "cmdk";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { SelectOption } from "./select";

export interface ComboboxProps {
  name: string;
  form?: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  onValueChange?: (value: string) => void;
}

export function Combobox({
  defaultValue,
  emptyMessage = "没有匹配项",
  form,
  label,
  name,
  onValueChange,
  options,
  placeholder = "请选择",
  searchLabel = "搜索选项",
  value,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const selectedValue = value ?? uncontrolledValue;
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === selectedValue);

  function selectValue(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <input form={form} name={name} type="hidden" value={selectedValue} />
      <PopoverPrimitive.Trigger asChild>
        <button
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          className="ui-select-trigger"
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          <span>{selectedOption?.label ?? placeholder}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="ui-combobox-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Command className="ui-command" label={searchLabel}>
            <Command.Input
              aria-label={searchLabel}
              className="ui-command-input"
              placeholder={searchLabel}
            />
            <Command.List className="ui-command-list" id={listboxId}>
              <Command.Empty className="ui-command-empty">{emptyMessage}</Command.Empty>
              {options.map((option) => (
                <Command.Item
                  className="ui-command-item"
                  disabled={option.disabled}
                  key={option.value}
                  onSelect={() => selectValue(option.value)}
                  value={`${option.label} ${option.value}`}
                >
                  <span>{option.label}</span>
                  {selectedValue === option.value ? <Check aria-hidden="true" size={15} /> : null}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
