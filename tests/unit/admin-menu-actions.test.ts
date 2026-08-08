import { afterEach, describe, expect, test, vi } from "vitest";

import { saveMenuItemAction } from "@/app/(admin)/admin/menus/actions";

const actionMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  requireAdminSession: vi.fn().mockResolvedValue({}),
  revalidatePath: vi.fn(),
  savePrimaryMenuItem: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: actionMocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: actionMocks.redirect }));
vi.mock("@/lib/auth/admin", () => ({ requireAdminSession: actionMocks.requireAdminSession }));
vi.mock("@/lib/content/service", () => ({ savePrimaryMenuItem: actionMocks.savePrimaryMenuItem }));

function menuForm(url: string) {
  const formData = new FormData();
  formData.set("label", "关于");
  formData.set("url", url);
  formData.set("sortOrder", "3");
  formData.set("enabled", "on");
  return formData;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("menu item URL validation", () => {
  test.each(["//external.example", "http://external.example"])("rejects %s", async (url) => {
    await expect(saveMenuItemAction({ status: "idle" }, menuForm(url))).resolves.toMatchObject({
      fieldErrors: { url: expect.any(String) },
      status: "error",
    });
    expect(actionMocks.savePrimaryMenuItem).not.toHaveBeenCalled();
  });

  test.each(["/about", "https://external.example"])("accepts %s", async (url) => {
    await expect(saveMenuItemAction({ status: "idle" }, menuForm(url))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/menus?notice=saved",
    );
    expect(actionMocks.savePrimaryMenuItem).toHaveBeenCalledWith({
      enabled: true,
      label: "关于",
      openInNewTab: false,
      sortOrder: 3,
      url,
    });
  });
});
