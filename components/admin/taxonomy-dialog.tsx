"use client";

import { LoaderCircle, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { TaxonomyActionState } from "@/app/(admin)/admin/taxonomy-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaxonomyItem } from "@/lib/content/service";

interface TaxonomyDialogProps {
  action: (state: TaxonomyActionState, formData: FormData) => Promise<TaxonomyActionState>;
  item?: TaxonomyItem;
  noun: string;
  trigger: ReactNode;
  triggerAsChild?: boolean;
  triggerTooltip?: string;
}

const initialState: TaxonomyActionState = { status: "idle" };

function SubmitButton({ noun }: { noun: string }) {
  const { pending } = useFormStatus();

  return (
    <Button loading={pending} type="submit">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
      ) : (
        <Save aria-hidden="true" size={16} />
      )}
      {pending ? "正在保存" : `保存${noun}`}
    </Button>
  );
}

export function TaxonomyDialog({
  action,
  item,
  noun,
  trigger,
  triggerAsChild,
  triggerTooltip,
}: TaxonomyDialogProps) {
  const [state, formAction] = useActionState(action, initialState);
  const title = item ? `编辑${noun}` : `新建${noun}`;

  return (
    <Dialog
      description="填写名称、URL 别名和可选说明。"
      title={title}
      trigger={trigger}
      triggerAsChild={triggerAsChild}
      triggerTooltip={triggerTooltip}
    >
      <form action={formAction} className="admin-record-dialog-form">
        {item ? <input name="id" type="hidden" value={item.id} /> : null}
        {state.formError ? <FormMessage>{state.formError}</FormMessage> : null}
        <Field error={state.fieldErrors?.name} label="名称">
          <Input defaultValue={item?.name} maxLength={80} name="name" required />
        </Field>
        <Field error={state.fieldErrors?.slug} label="URL 别名">
          <Input defaultValue={item?.slug} maxLength={120} name="slug" required />
        </Field>
        <Field error={state.fieldErrors?.description} label="说明">
          <Textarea defaultValue={item?.description} maxLength={240} name="description" rows={3} />
        </Field>
        <div className="ui-dialog-actions">
          <SubmitButton noun={noun} />
        </div>
      </form>
    </Dialog>
  );
}
