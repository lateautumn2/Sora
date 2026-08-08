"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setupAdminAction, type SetupActionState } from "./actions";

const initialState: SetupActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
      {pending ? "正在初始化" : "创建管理员"}
    </button>
  );
}

interface FieldProps {
  autoComplete: string;
  error?: string;
  label: string;
  name: string;
  type?: "text" | "email" | "password";
}

function Field({ autoComplete, error, label, name, type = "text" }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="h-11 rounded-[var(--radius)] border border-[var(--border)] px-3 outline-none focus:border-[var(--primary)]"
        name={name}
        required
        type={type}
      />
      {error ? (
        <span className="text-xs text-[var(--danger)]" id={`${name}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function SetupForm() {
  const [state, action] = useActionState(setupAdminAction, initialState);

  return (
    <form action={action} className="mt-7 grid gap-4">
      {state.error ? (
        <p
          className="rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Field autoComplete="name" error={state.fields?.name} label="显示名称" name="name" />
      <Field
        autoComplete="email"
        error={state.fields?.email}
        label="邮箱"
        name="email"
        type="email"
      />
      <Field
        autoComplete="new-password"
        error={state.fields?.password}
        label="密码"
        name="password"
        type="password"
      />
      <Field
        autoComplete="new-password"
        error={state.fields?.confirmPassword}
        label="确认密码"
        name="confirmPassword"
        type="password"
      />
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
