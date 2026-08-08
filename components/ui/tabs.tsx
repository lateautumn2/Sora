"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  ariaLabel?: string;
  tabs: TabItem[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  value?: string;
}

export function Tabs({
  ariaLabel = "内容分组",
  defaultValue,
  onValueChange,
  tabs,
  value,
}: TabsProps) {
  const initialValue = defaultValue ?? tabs[0]?.value;

  return (
    <TabsPrimitive.Root
      className="ui-tabs"
      defaultValue={initialValue}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsPrimitive.List aria-label={ariaLabel} className="ui-tabs-list">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            className="ui-tabs-trigger"
            disabled={tab.disabled}
            key={tab.value}
            onClick={() => onValueChange?.(tab.value)}
            value={tab.value}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content className="ui-tabs-content" key={tab.value} value={tab.value}>
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
