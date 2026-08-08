"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PostBackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <button
      aria-label="返回上一页"
      className="sora-post-back-button"
      onClick={goBack}
      title="返回上一页"
      type="button"
    >
      <ArrowLeft aria-hidden="true" size={18} />
    </button>
  );
}
