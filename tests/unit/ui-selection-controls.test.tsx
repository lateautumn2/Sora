// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import { MultiSelect } from "@/components/ui/multi-select";
import { SelectField } from "@/components/ui/select";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
HTMLElement.prototype.scrollIntoView = () => {};

afterEach(cleanup);

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

  test("multi-select does not toggle disabled options with mouse or keyboard input", () => {
    render(
      <MultiSelect
        label="Tags"
        name="tagIds"
        options={[{ value: "locked", label: "Locked", disabled: true }]}
        placeholder="Pick tags"
        searchLabel="Search tags"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pick tags" }));
    const disabledCheckbox = screen.getByRole("checkbox", { name: "Locked" });
    fireEvent.click(disabledCheckbox);
    fireEvent.keyDown(disabledCheckbox, { key: " " });

    expect(disabledCheckbox).toBeDisabled();
    expect(document.querySelectorAll('[name="tagIds"]')).toHaveLength(0);
  });

  test("multi-select restores focus to its trigger after Escape", () => {
    vi.useFakeTimers();

    try {
      render(
        <MultiSelect
          label="Tags"
          name="tagIds"
          options={tagOptions}
          placeholder="Pick tags"
          searchLabel="Search tags"
        />,
      );

      const trigger = screen.getByRole("button", { name: "Pick tags" });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      vi.runAllTimers();

      expect(trigger).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  test("keeps compact checkbox and switch visuals inside desktop and mobile touch targets", () => {
    const adminUiStyles = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");
    const mobileStyles = adminUiStyles.split("@media (max-width: 40rem) {")[1] ?? "";

    expect(adminUiStyles).toMatch(/\.ui-checkbox\s*\{[^}]*width: 2\.5rem;[^}]*height: 2\.5rem;/s);
    expect(adminUiStyles).toMatch(
      /\.ui-checkbox::before\s*\{[^}]*width: 1\.25rem;[^}]*height: 1\.25rem;/s,
    );
    expect(adminUiStyles).toMatch(/\.ui-switch\s*\{[^}]*width: 2\.5rem;[^}]*height: 2\.5rem;/s);
    expect(adminUiStyles).toMatch(
      /\.ui-switch::before\s*\{[^}]*width: 2\.5rem;[^}]*height: 1\.5rem;/s,
    );
    expect(mobileStyles).toMatch(/\.ui-checkbox\s*\{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;/s);
    expect(mobileStyles).toMatch(
      /\.ui-switch\s*\{[^}]*width: 2\.75rem;[^}]*min-height: 2\.75rem;/s,
    );
  });

  test("constrains long multi-select chip labels within their container", () => {
    const adminUiStyles = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");

    expect(adminUiStyles).toMatch(
      /\.ui-multi-select-chips\s*\{[^}]*max-width: 100%;[^}]*overflow: hidden;/s,
    );
    expect(adminUiStyles).toMatch(
      /\.ui-multi-select-chip\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;[^}]*overflow-wrap: anywhere;/s,
    );
  });
});
