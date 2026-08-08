// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MultiSelect } from "@/components/ui/multi-select";
import { SelectField } from "@/components/ui/select";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
HTMLElement.prototype.scrollIntoView = () => {};

const statusOptions = [
  { value: "DRAFT", label: "草稿" },
  { value: "PUBLISHED", label: "已发布" },
];

const tagOptions = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("admin selection controls", () => {
  test("select submits the chosen value and restores trigger focus", () => {
    render(<SelectField label="状态" name="status" options={statusOptions} />);

    const trigger = screen.getByRole("combobox", { name: "状态" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "已发布" }));

    expect(trigger).toHaveFocus();
    expect(document.querySelector('[name="status"]')).toHaveValue("PUBLISHED");
  });

  test("multi-select searches, selects, and emits repeated form values", () => {
    render(<MultiSelect label="标签" name="tagIds" options={tagOptions} defaultValue={["a"]} />);

    fireEvent.click(screen.getByRole("button", { name: "选择标签" }));
    fireEvent.change(screen.getByRole("combobox", { name: "搜索标签" }), {
      target: { value: "Beta" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));

    expect(document.querySelectorAll('[name="tagIds"]')).toHaveLength(2);
  });
});
