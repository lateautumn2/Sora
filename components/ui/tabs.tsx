"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
}

export function Tabs({ defaultValue, tabs }: TabsProps) {
  const initialValue = defaultValue ?? tabs[0]?.value;

  return (
    <TabsPrimitive.Root className="ui-tabs" defaultValue={initialValue}>
      <TabsPrimitive.List aria-label="内容分组" className="ui-tabs-list">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            className="ui-tabs-trigger"
            disabled={tab.disabled}
            key={tab.value}
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
