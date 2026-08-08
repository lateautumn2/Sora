"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PostImage {
  alt: string;
  src: string;
  title?: string;
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
