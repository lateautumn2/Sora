import hljs from "highlight.js";
import { Marked, Renderer, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";

export type SourceFormat = "MARKDOWN" | "HTML";

export interface RenderedContent {
  html: string;
  plainText: string;
  excerpt: string;
  wordCount: number;
  readingMinutes: number;
}

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "kbd",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function slugifyHeading(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function createMarkdownParser(): Marked {
  const renderer = new Renderer();
  const headingCounts = new Map<string, number>();

  renderer.code = ({ text, lang }: Tokens.Code) => {
    const requestedLanguage = lang?.trim().split(/\s+/)[0] ?? "";
    const language =
      requestedLanguage && hljs.getLanguage(requestedLanguage) ? requestedLanguage : undefined;
    const highlighted = language
      ? hljs.highlight(text, { language }).value
      : hljs.highlightAuto(text).value;
    const className = language ? `hljs language-${escapeAttribute(language)}` : "hljs";
    return `<pre><code class="${className}">${highlighted}</code></pre>\n`;
  };

  renderer.heading = ({ depth, text }: Tokens.Heading) => {
    const base = slugifyHeading(text);
    const count = headingCounts.get(base) ?? 0;
    headingCounts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    return `<h${depth} id="${escapeAttribute(id)}">${text}</h${depth}>\n`;
  };

  renderer.link = ({ href, title, text }: Tokens.Link) => {
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
    return `<a href="${escapeAttribute(href)}"${titleAttribute} rel="nofollow noopener noreferrer">${text}</a>`;
  };

  return new Marked({ gfm: true, breaks: false, renderer });
}

function toPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(value: string): number {
  const cjkCharacters =
    value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)
      ?.length ?? 0;
  const nonCjkWords =
    value
      .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
      .match(/[\p{Letter}\p{Number}]+(?:['-][\p{Letter}\p{Number}]+)*/gu)?.length ?? 0;
  return cjkCharacters + nonCjkWords;
}

export function renderContent(
  source: string,
  sourceFormat: SourceFormat,
  requestedExcerpt?: string | null,
): RenderedContent {
  const unsafeHtml =
    sourceFormat === "MARKDOWN" ? String(createMarkdownParser().parse(source)) : source;
  const html = sanitizeHtml(unsafeHtml, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title", "rel"],
      code: ["class"],
      div: ["class"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      span: ["class"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
  });
  const plainText = toPlainText(html);
  const wordCount = countWords(plainText);
  const fallbackExcerpt =
    plainText.length > 160 ? `${plainText.slice(0, 160).trim()}...` : plainText;

  return {
    html,
    plainText,
    excerpt: requestedExcerpt?.trim() || fallbackExcerpt,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 300)),
  };
}

export function renderComment(source: string): string {
  const unsafeHtml = String(createMarkdownParser().parse(source));
  return sanitizeHtml(unsafeHtml, {
    allowedTags: ["a", "blockquote", "br", "code", "em", "li", "ol", "p", "pre", "strong", "ul"],
    allowedAttributes: { a: ["href", "title", "rel"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}

export function sanitizeHomeQuote(source: string): string {
  return sanitizeHtml(source, {
    allowedTags: ["a", "b", "br", "em", "i", "img", "p", "small", "span", "strong"],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
  });
}
