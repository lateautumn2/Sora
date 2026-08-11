"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast";

export function AdminNoticeToast({ notice, noun }: { notice?: string; noun: string }) {
  const { toast } = useToast();
  const handledNotice = useRef<string | null>(null);

  useEffect(() => {
    if (notice !== "saved" || handledNotice.current === notice) return;
    handledNotice.current = notice;

    toast({ title: `${noun}保存成功` });

    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [notice, noun, toast]);

  return null;
}
