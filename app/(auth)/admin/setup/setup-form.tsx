"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

import { setupAdminAction, type SetupActionState } from "./actions";

const initialState: SetupActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="ui-button-primary w-full" loading={pending} type="submit">
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
      {pending ? "正在初始化" : "创建管理员"}
    </Button>
  );
}

interface FieldProps {
  autoComplete: string;
  error?: string;
  label: string;
  name: string;
  type?: "text" | "email" | "password";
}

function SetupField({ autoComplete, error, label, name, type = "text" }: FieldProps) {
  return (
    <Field error={error} label={label}>
      <Input autoComplete={autoComplete} name={name} required type={type} />
    </Field>
  );
}

export function SetupForm() {
  const [state, action] = useActionState(setupAdminAction, initialState);

  return (
    <form action={action} className="mt-7 grid gap-4">
      {state.error ? <FormMessage className="auth-form-error">{state.error}</FormMessage> : null}
      <SetupField autoComplete="name" error={state.fields?.name} label="显示名称" name="name" />
      <SetupField
        autoComplete="email"
        error={state.fields?.email}
        label="邮箱"
        name="email"
        type="email"
      />
      <SetupField
        autoComplete="new-password"
        error={state.fields?.password}
        label="密码"
        name="password"
        type="password"
      />
      <SetupField
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
