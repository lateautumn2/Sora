"use client";

import { Trash2 } from "lucide-react";

interface FriendDeleteButtonProps {
  name: string;
}

export function FriendDeleteButton({ name }: FriendDeleteButtonProps) {
  return (
    <button
      aria-label={`删除${name}`}
      className="icon-button text-[var(--danger)]"
      onClick={(event) => {
        if (!window.confirm("确定删除这条友链吗？")) {
          event.preventDefault();
        }
      }}
      title="删除"
      type="submit"
    >
      <Trash2 aria-hidden="true" size={16} />
    </button>
  );
}
