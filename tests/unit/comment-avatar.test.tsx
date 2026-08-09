// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CommentAvatar } from "@/components/comment-avatar";

afterEach(cleanup);

describe("comment avatar", () => {
  it("loads Gravatar by email hash and falls back to the local initial after an error", () => {
    render(<CommentAvatar avatarHash="baa0f4114eafbdd39ce828d01b849ae6" name="访客" size={36} />);

    const image = screen.getByRole("img", { name: "访客的头像" });
    expect(image).toHaveAttribute(
      "src",
      "https://gravatar.com/avatar/baa0f4114eafbdd39ce828d01b849ae6?s=72&d=404",
    );
    expect(image).toHaveStyle({ height: "36px", width: "36px" });

    fireEvent.error(image);

    expect(screen.queryByRole("img", { name: "访客的头像" })).not.toBeInTheDocument();
    expect(screen.getByText("访")).toHaveClass("comment-avatar");
  });

  it("uses the local initial directly when no email hash is available", () => {
    render(<CommentAvatar name="匿名" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("匿")).toHaveClass("comment-avatar");
  });
});
