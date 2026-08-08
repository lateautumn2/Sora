// @vitest-environment jsdom

import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

describe("admin form foundation", () => {
  test("connects labels, help, and errors to the input", () => {
    render(
      <Field label="站点名称" description="显示在页头" error="请输入站点名称">
        <Input name="title" />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "站点名称" });
    const describedBy = input.getAttribute("aria-describedby");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedBy).toContain("description");
    expect(describedBy).toContain("error");
    expect(document.getElementById(describedBy?.split(" ")[0] ?? "")).toHaveTextContent("显示在页头");
    expect(document.getElementById(describedBy?.split(" ")[1] ?? "")).toHaveTextContent("请输入站点名称");
  });

  test("exposes loading without changing button dimensions", () => {
    render(<Button loading>保存设置</Button>);

    expect(screen.getByRole("button", { name: "正在处理" })).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("ui-button");
  });

  test("forwards refs and native props through the form controls", () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const inputRef = createRef<HTMLInputElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(
      <>
        <Button data-testid="button" ref={buttonRef} type="submit">
          Save
        </Button>
        <IconButton aria-label="Close" data-testid="icon-button">x</IconButton>
        <Input data-testid="input" placeholder="Title" ref={inputRef} required />
        <Textarea data-testid="textarea" ref={textareaRef} rows={4} />
        <FormMessage>Save failed</FormMessage>
      </>,
    );

    expect(buttonRef.current).toBe(screen.getByTestId("button"));
    expect(inputRef.current).toBe(screen.getByTestId("input"));
    expect(textareaRef.current).toBe(screen.getByTestId("textarea"));
    expect(screen.getByTestId("icon-button")).toHaveClass("ui-icon-button");
    expect(screen.getByTestId("input")).toBeRequired();
    expect(screen.getByTestId("textarea")).toHaveAttribute("rows", "4");
    expect(screen.getByText("Save failed")).toHaveAttribute("role", "alert");
  });
});
