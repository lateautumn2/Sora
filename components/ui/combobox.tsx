"use client";

import { Command } from "cmdk";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

import type { SelectOption } from "./select";

export interface ComboboxProps {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  onValueChange?: (value: string) => void;
}

export function Combobox({
  defaultValue,
  emptyMessage = "没有匹配项",
  label,
  name,
  onValueChange,
  options,
  placeholder = "请选择",
  searchLabel = "搜索选项",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  function selectValue(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <input name={name} type="hidden" value={value} />
      <PopoverPrimitive.Trigger asChild>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          className="ui-select-trigger"
          ref={triggerRef}
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
            <Command.List className="ui-command-list">
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
                  {value === option.value ? <Check aria-hidden="true" size={15} /> : null}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
