"use client";

const FONT_STYLESHEETS = [
  { name: "Noto Serif CJK", id: 285 },
  { name: "LXGW WenKai", id: 292 },
  { name: "Maple Mono NF CN", id: 442 },
] as const;

export function FontStylesheets() {
  return (
    <>
      {FONT_STYLESHEETS.map(({ name, id }) => (
        <link
          data-font-stylesheet={name}
          href={`https://fontsapi.zeoseven.com/${id}/main/result.css`}
          key={name}
          onError={({ currentTarget }) => {
            if (currentTarget.dataset.fallbackAttempted === "true") return;

            currentTarget.dataset.fallbackAttempted = "true";
            currentTarget.href = `https://fontsapi-storage.zeoseven.com/${id}/main/result.css`;
          }}
          rel="stylesheet"
        />
      ))}
    </>
  );
}
