// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { DataManager } from "@/components/admin/data-manager";
import { UIProvider } from "@/components/ui/ui-provider";

class XMLHttpRequestMock {
  static instances: XMLHttpRequestMock[] = [];
  response: unknown = null;
  status = 200;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  open = vi.fn();
  send = vi.fn();
  setRequestHeader = vi.fn();
  responseType = "";

  constructor() {
    XMLHttpRequestMock.instances.push(this);
  }
}

beforeEach(() => {
  XMLHttpRequestMock.instances = [];
  vi.stubGlobal("XMLHttpRequest", XMLHttpRequestMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("uses shared file inputs and buttons for data workflows", () => {
  render(<DataManager />);

  expect(screen.getByLabelText("选择内容包 ZIP")).toHaveClass("ui-file-input-native");
  expect(screen.getByLabelText("选择完整备份 ZIP")).toHaveClass("ui-file-input-native");
  expect(screen.getByRole("button", { name: "上传并分析" })).toHaveClass("ui-button");
  expect(screen.getByRole("link", { name: "下载完整备份" })).toHaveClass("ui-button-link");
});

test("requires the destructive restore confirmation dialog", async () => {
  render(
    <UIProvider>
      <DataManager />
    </UIProvider>,
  );
  const fileInput = screen.getByLabelText("选择完整备份 ZIP");
  fireEvent.change(fileInput, { target: { files: [new File(["zip"], "backup.zip")] } });
  fireEvent.click(screen.getByRole("button", { name: "上传并校验" }));

  const request = XMLHttpRequestMock.instances[0];
  if (!request) throw new Error("Expected restore upload request");
  request.response = {
    data: {
      jobId: "restore-1",
      state: "READY",
      backup: { createdAt: "2026-08-08T00:00:00.000Z", databaseBytes: 1024, uploads: 2 },
    },
  };
  await act(async () => request.onload?.());

  fireEvent.change(screen.getByLabelText("输入 RESTORE 确认恢复"), {
    target: { value: "RESTORE" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认恢复" }));
  expect(screen.getByRole("alertdialog", { name: "确认恢复完整备份" })).toBeVisible();
});
