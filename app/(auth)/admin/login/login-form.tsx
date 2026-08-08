"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="ui-button-primary w-full" loading={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
      ) : (
        <LogIn aria-hidden="true" size={17} />
      )}
      {pending ? "正在登录" : "登录"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-7 grid gap-4">
      {state.error ? <FormMessage className="auth-form-error">{state.error}</FormMessage> : null}
      <Field error={state.fields?.email} label="邮箱">
        <Input autoComplete="email" name="email" required type="email" />
      </Field>
      <Field error={state.fields?.password} label="密码">
        <Input autoComplete="current-password" name="password" required type="password" />
      </Field>
      <div className="pt-2">
        <LoginButton />
      </div>
    </form>
  );
}
