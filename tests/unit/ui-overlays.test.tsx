// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";

const deferredState = vi.hoisted(() => ({
  enabled: false,
  updates: [] as Array<() => void>,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useState<T>(initialState: T | (() => T)) {
      const [state, setState] = actual.useState(initialState);

      function setDeferredState(update: React.SetStateAction<T>) {
        if (deferredState.enabled && typeof update === "function") {
          deferredState.updates.push(() => setState(update));
          return;
        }

        setState(update);
      }

      return [state, setDeferredState] as const;
    },
  };
});

afterEach(cleanup);

function DeferredToastActions() {
  const { toast } = useToast();

  return (
    <button
      onClick={() => {
        setTimeout(() => {
          toast({ title: "First notification" });
          toast({ title: "Second notification" });
        }, 0);
      }}
      type="button"
    >
      Show notifications
    </button>
  );
}

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

  test("asChild icon dialog triggers regain focus after close and Escape", () => {
    vi.useFakeTimers();

    try {
      render(
        <Dialog
          title="编辑分类"
          trigger={<IconButton aria-label="编辑记录">E</IconButton>}
          triggerAsChild
        >
          内容
        </Dialog>,
      );

      const trigger = screen.getByRole("button", { name: "编辑记录" });
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("button", { name: "关闭" }));
      vi.runAllTimers();
      expect(trigger).toHaveFocus();

      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("dialog", { name: "编辑分类" }), { key: "Escape" });
      vi.runAllTimers();
      expect(trigger).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  test("asChild icon confirm trigger regains focus after confirmation", () => {
    vi.useFakeTimers();

    try {
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          description="此操作无法撤销"
          onConfirm={onConfirm}
          title="删除记录"
          trigger={<IconButton aria-label="删除记录">D</IconButton>}
          triggerAsChild
        />,
      );

      const trigger = screen.getByRole("button", { name: "删除记录" });
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
      vi.runAllTimers();

      expect(onConfirm).toHaveBeenCalledOnce();
      expect(trigger).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  test("deferred toast state updaters retain independent IDs when one notification closes", () => {
    vi.useFakeTimers();
    deferredState.enabled = true;

    try {
      render(
        <ToastProvider>
          <DeferredToastActions />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Show notifications" }));
      act(() => vi.runAllTimers());
      act(() => deferredState.updates.splice(0).forEach((update) => update()));
      fireEvent.click(screen.getAllByRole("button", { name: "关闭通知" })[0]!);
      act(() => deferredState.updates.splice(0).forEach((update) => update()));

      expect(screen.queryByText("First notification")).not.toBeInTheDocument();
      expect(screen.getByText("Second notification")).toBeInTheDocument();
    } finally {
      deferredState.enabled = false;
      deferredState.updates.length = 0;
      vi.useRealTimers();
    }
  });
});
