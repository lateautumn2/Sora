// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  MediaAddressTabs,
  MediaPreview,
  MediaUploadForm,
} from "@/components/admin/media-manager";
import { UIProvider } from "@/components/ui/ui-provider";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  writeText.mockClear();
});

afterEach(cleanup);

test("uses the shared file input and Radix preview dialog", () => {
  const { unmount } = render(<MediaUploadForm action={vi.fn()} />);
  expect(screen.getByLabelText("选择图片")).toHaveClass("ui-file-input-native");

  unmount();
  render(
    <UIProvider>
      <MediaPreview alt="封面" src="/media/cover.webp" />
    </UIProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "放大查看封面" }));
  expect(screen.getByRole("dialog", { name: "图片预览" })).toBeVisible();
});

test("address tabs copy the selected representation", async () => {
  render(
    <MediaAddressTabs
      altText="封面"
      appUrl="https://example.com"
      originalName="cover.webp"
      storageKey="cover.webp"
    />,
  );

  fireEvent.click(screen.getByRole("tab", { name: "Markdown" }));

  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("![封面](https://example.com/media/cover.webp)"),
  );
  expect(screen.getByRole("textbox", { name: "Markdown地址" })).toHaveClass("ui-input");
});
