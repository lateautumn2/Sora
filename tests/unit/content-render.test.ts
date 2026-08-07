import { describe, expect, it } from "vitest";

import { countWords, renderContent } from "@/lib/content/render";
import { decodeSlugParam } from "@/lib/content/validation";

describe("content renderer", () => {
  it("renders Markdown, highlights code, and removes executable HTML", () => {
    const result = renderContent(
      `# 标题\n\n<script>alert("xss")</script>\n\n[危险链接](javascript:alert(1))\n\n\`\`\`js\nconst answer = 42;\n\`\`\``,
      "MARKDOWN",
    );

    expect(result.html).toContain('<h1 id="标题">标题</h1>');
    expect(result.html).toContain('<code class="hljs language-js">');
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("javascript:");
    expect(result.plainText).toContain("标题");
  });

  it("counts CJK characters and non-CJK words for reading estimates", () => {
    expect(countWords("你好 TypeScript world 2026")).toBe(5);
    const result = renderContent("这是一段简短内容。", "MARKDOWN", "自定义摘要");
    expect(result.excerpt).toBe("自定义摘要");
    expect(result.readingMinutes).toBe(1);
  });

  it("sanitizes migrated HTML with the same allowlist", () => {
    const result = renderContent(
      '<p onclick="steal()">正文</p><img src="https://example.com/a.png" onerror="steal()">',
      "HTML",
    );
    expect(result.html).toContain("<p>正文</p>");
    expect(result.html).toContain('src="https://example.com/a.png"');
    expect(result.html).not.toContain("onclick");
    expect(result.html).not.toContain("onerror");
  });

  it("decodes non-ASCII route segments before querying SQLite", () => {
    expect(decodeSlugParam("%E4%B8%AD%E6%96%87-slug")).toBe("中文-slug");
    expect(decodeSlugParam("plain-slug")).toBe("plain-slug");
  });
});
