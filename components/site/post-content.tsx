"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PostImage {
  alt: string;
  src: string;
  title?: string;
}

const copyIcon =
  '<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><rect height="12" rx="2" stroke="currentColor" stroke-width="2" width="12" x="8" y="8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
const copiedIcon =
  '<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';

function setCopyButtonState(button: HTMLButtonElement, copied: boolean) {
  button.innerHTML = copied ? copiedIcon : copyIcon;
  button.classList.toggle("is-copied", copied);
  button.title = copied ? "代码已复制" : "复制代码";
  button.setAttribute("aria-label", copied ? "代码已复制" : "复制代码");
}

export function PostContent({ html }: { html: string }) {
  const [preview, setPreview] = useState<PostImage | null>(null);

  useEffect(() => {
    if (!preview) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview]);

  function handleContentClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.src) return;

    event.preventDefault();
    event.stopPropagation();
    setPreview({
      alt: target.alt || "文章图片",
      src: target.currentSrc || target.src,
      title: target.title || undefined,
    });
  }

  useEffect(() => {
    const codeBlocks = Array.from(document.querySelectorAll<HTMLPreElement>("#post-content pre"));
    const cleanups = codeBlocks.map((pre) => {
      pre.classList.add("sora-code-block");

      const button = document.createElement("button");
      button.className = "sora-code-copy";
      button.type = "button";
      setCopyButtonState(button, false);

      async function copyCode() {
        const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = code;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        setCopyButtonState(button, true);
        window.setTimeout(() => setCopyButtonState(button, false), 1600);
      }

      button.addEventListener("click", copyCode);
      pre.appendChild(button);
      return () => {
        button.removeEventListener("click", copyCode);
        button.remove();
        pre.classList.remove("sora-code-block");
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [html]);

  return (
    <>
      <div
        className="prose-content sora-post-content"
        dangerouslySetInnerHTML={{ __html: html }}
        id="post-content"
        onClick={handleContentClick}
      />
      {preview ? (
        <div
          aria-label="图片预览"
          aria-modal="true"
          className="sora-image-lightbox"
          onClick={() => setPreview(null)}
          role="dialog"
        >
          <button
            aria-label="关闭图片预览"
            className="sora-image-lightbox-close"
            onClick={() => setPreview(null)}
            title="关闭图片预览"
            type="button"
          >
            <X aria-hidden="true" size={22} />
          </button>
          <div className="sora-image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Content images are user-managed runtime URLs. */}
            <img
              alt={preview.alt}
              className="sora-image-lightbox-image"
              src={preview.src}
              title={preview.title}
            />
            <span className="sora-image-lightbox-hint">
              <Maximize2 aria-hidden="true" size={14} />
              点击空白处关闭
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
