import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  });
}

function adminAndAuthSourceFiles(): string[] {
  return [
    join(process.cwd(), "app", "(admin)"),
    join(process.cwd(), "app", "(auth)"),
    join(process.cwd(), "components", "admin"),
    join(process.cwd(), "components", "auth"),
  ].flatMap(sourceFiles);
}

test("admin and auth pages do not use legacy visible controls", () => {
  for (const file of adminAndAuthSourceFiles()) {
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(/className="[^"]*form-(?:input|textarea)/);
    expect(source, file).not.toMatch(/<select\b/);
    expect(source, file).not.toMatch(/<input[^>]+type="checkbox"/s);
  }
});

test("soft card tokens keep the admin shell light, spacious, and distinctly accented", () => {
  const source = readFileSync(join(process.cwd(), "app", "admin-ui.css"), "utf8");

  expect(source).toContain("--admin-radius-surface: 14px");
  expect(source).toContain("--admin-radius-control: 9px");
  expect(source).toMatch(/\.admin-sidebar-shell\s*\{[^}]*background: var\(--admin-surface\)/s);
  expect(source).toMatch(/\.admin-shell-nav-link\.is-active[^{]*\{[^}]*color: var\(--admin-accent\)/s);
  expect(source).not.toMatch(/\.admin-shell-nav-link\.is-active[^{]*\{[^}]*background: #82045b/s);
});

test("taxonomy deletion validates IDs as UUIDs before mutation", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "(admin)", "admin", "taxonomy-actions.ts"),
    "utf8",
  );

  expect(source).toMatch(/const id = z\.string\(\)\.uuid\(\)\.safeParse\(formData\.get\("id"\)\)/);
  expect(source).toContain("deleteTaxonomy(type, id.data)");
});
