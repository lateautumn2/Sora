// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";

describe("admin overlays", () => {
  test("confirm dialog only submits after explicit confirmation", () => {
    const onConfirm = vi.fn();

    render(<ConfirmDialog description="此操作无法撤销" onConfirm={onConfirm} title="删除友链" />);

    fireEvent.click(screen.getByRole("button", { name: "删除友链" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  test("dialog closes on Escape and restores focus", () => {
    vi.useFakeTimers();

    try {
      render(
        <Dialog title="编辑分类" trigger="编辑分类">
          内容
        </Dialog>,
      );

      const trigger = screen.getByRole("button", { name: "编辑分类" });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("dialog", { name: "编辑分类" }), { key: "Escape" });
      vi.runAllTimers();

      expect(trigger).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });
});
