import { describe, expect, it } from "vitest";

import { isValidSetupToken } from "@/lib/auth/setup-token";

describe("isValidSetupToken", () => {
  it("accepts only the exact token", () => {
    expect(isValidSetupToken("correct-token", "correct-token")).toBe(true);
    expect(isValidSetupToken("wrong-token", "correct-token")).toBe(false);
  });
});
