"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
      ) : (
        <LogIn aria-hidden="true" size={17} />
      )}
      {pending ? "正在登录" : "登录"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

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
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">邮箱</span>
        <input
          aria-invalid={Boolean(state.fields?.email)}
          autoComplete="email"
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] px-3 outline-none focus:border-[var(--primary)]"
          name="email"
          required
          type="email"
        />
        {state.fields?.email ? (
          <span className="text-xs text-[var(--danger)]">{state.fields.email}</span>
        ) : null}
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">密码</span>
        <input
          aria-invalid={Boolean(state.fields?.password)}
          autoComplete="current-password"
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] px-3 outline-none focus:border-[var(--primary)]"
          name="password"
          required
          type="password"
        />
        {state.fields?.password ? (
          <span className="text-xs text-[var(--danger)]">{state.fields.password}</span>
        ) : null}
      </label>
      <div className="pt-2">
        <LoginButton />
      </div>
    </form>
  );
}
