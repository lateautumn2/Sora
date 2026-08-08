"use client";

import { Command } from "cmdk";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, X } from "lucide-react";
import { useRef, useState } from "react";

import { Checkbox } from "./checkbox";
import type { SelectOption } from "./select";

export interface MultiSelectProps {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string[];
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
}

export function MultiSelect({
  defaultValue = [],
  emptyMessage = "没有匹配项",
  label,
  name,
  options,
  placeholder,
  searchLabel = "搜索标签",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState(defaultValue);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const triggerLabel = placeholder ?? `选择${label}`;

  function toggleValue(value: string) {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  }

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      {selectedValues.map((value) => (
        <input key={value} name={name} type="hidden" value={value} />
      ))}
      <PopoverPrimitive.Trigger asChild>
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={triggerLabel}
          className="ui-multi-select-trigger"
          ref={triggerRef}
          type="button"
        >
          <span className="ui-multi-select-chips">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <span className="ui-multi-select-chip" key={option.value}>
                  {option.label}
                  <X aria-hidden="true" size={13} />
                </span>
              ))
            ) : (
              <span className="ui-multi-select-placeholder">{triggerLabel}</span>
            )}
          </span>
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
              {options.map((option) => {
                const checked = selectedValues.includes(option.value);

                return (
                  <Command.Item
                    className="ui-command-item"
                    disabled={option.disabled}
                    key={option.value}
                    onSelect={() => {
                      if (!option.disabled) {
                        toggleValue(option.value);
                      }
                    }}
                    value={`${option.label} ${option.value}`}
                  >
                    <Checkbox
                      aria-label={option.label}
                      checked={checked}
                      disabled={option.disabled}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={() => {
                        if (!option.disabled) {
                          toggleValue(option.value);
                        }
                      }}
                      tabIndex={-1}
                    />
                    <span>{option.label}</span>
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
