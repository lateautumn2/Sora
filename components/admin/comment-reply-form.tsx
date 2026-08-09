"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface CommentReplyFormProps {
  action: (formData: FormData) => Promise<never>;
  authorName: string;
  parentId: string;
}

/**
 * 评论列表只在管理员明确回复时展示编辑区，避免每条评论都占用大块垂直空间。
 * 服务端 action 由父级页面传入，表单字段和原回复动作保持不变。
 */
export function CommentReplyForm({ action, authorName, parentId }: CommentReplyFormProps) {
  const [expanded, setExpanded] = useState(false);
  const formId = useId();

  return (
    <>
      <Button
        aria-controls={formId}
        aria-expanded={expanded}
        aria-label={`回复 ${authorName}`}
        className="ui-button-secondary ui-button-compact"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        回复
      </Button>
      {expanded ? (
        <form action={action} className="admin-comment-reply" id={formId}>
          <input name="parentId" type="hidden" value={parentId} />
          <Field label={`回复 ${authorName}`}>
            <Textarea
              aria-label={`回复 ${authorName}`}
              maxLength={5000}
              name="content"
              placeholder={`以管理员身份公开回复 ${authorName}`}
              required
              rows={3}
            />
          </Field>
          <Button type="submit">提交</Button>
        </form>
      ) : null}
    </>
  );
}
