const FONT_STYLESHEETS = [{ name: "Maple Mono NF CN", id: 442 }] as const;

const FONT_FALLBACK_SCRIPT = `
window.addEventListener("error", function (event) {
  var link = event.target;
  if (!(link instanceof HTMLLinkElement)) return;

  var id = link.dataset.fontStylesheetId;
  if (!id || link.dataset.fallbackAttempted === "true") return;

  link.dataset.fallbackAttempted = "true";
  link.href = "https://fontsapi-storage.zeoseven.com/" + id + "/main/result.css";
}, true);
`;

export function FontStylesheets() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FONT_FALLBACK_SCRIPT }} />
      {FONT_STYLESHEETS.map(({ name, id }) => (
        <link
          data-font-stylesheet={name}
          data-font-stylesheet-id={id}
          href={`https://fontsapi.zeoseven.com/${id}/main/result.css`}
          key={name}
          rel="stylesheet"
        />
      ))}
    </>
  );
}
