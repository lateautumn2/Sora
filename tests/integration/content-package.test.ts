import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { extractArchive } from "@/lib/data/archive";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const converterPath = join(projectRoot, "tools", "halo-convert", "index.mjs");
const converterAvailable = existsSync(converterPath);
const importerPath = join(projectRoot, "scripts", "content-import.mjs");
const migrationPath = join(projectRoot, "scripts", "migrate.mjs");
const temporaryDirectories: string[] = [];

function haloExtension(path: string, value: unknown): { name: string; data: string } {
  return {
    name: path,
    data: Buffer.from(JSON.stringify(value), "utf8").toString("base64"),
  };
}

function runNode(
  script: string,
  args: string[],
  environment: Record<string, string | undefined> = {},
): string {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    env: { ...process.env, ...environment },
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("通用内容包", () => {
  it.skipIf(!converterAvailable)("重建 Halo 增量快照并完整导入 Markdown、评论和图片", async () => {
    const root = mkdtempSync(join(tmpdir(), "sora-content-package-"));
    temporaryDirectories.push(root);
    const backup = join(root, "backup");
    const output = join(root, "converted");
    const outputArchive = join(root, "content-package.zip");
    const uploads = join(root, "uploads");
    const databasePath = join(root, "blog.db");
    const attachmentDirectory = join(backup, "workdir", "attachments", "upload");
    mkdirSync(attachmentDirectory, { recursive: true });

    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+MNFhVQAAAABJRU5ErkJggg==",
      "base64",
    );
    writeFileSync(join(attachmentDirectory, "pixel.png"), image);
    const createdAt = "2024-01-01T00:00:00.000Z";
    const updatedAt = "2024-01-02T00:00:00.000Z";
    const extensions = [
      haloExtension("/registry/content.halo.run/snapshots/base", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Snapshot",
        metadata: { name: "base", creationTimestamp: createdAt },
        spec: {
          subjectRef: { kind: "Post", name: "post-1" },
          rawType: "markdown",
          rawPatch: "# 标题\n![旧图]()",
          lastModifyTime: createdAt,
        },
      }),
      haloExtension("/registry/content.halo.run/snapshots/release", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Snapshot",
        metadata: { name: "release", creationTimestamp: updatedAt },
        spec: {
          subjectRef: { kind: "Post", name: "post-1" },
          rawType: "markdown",
          parentSnapshotName: "base",
          rawPatch: JSON.stringify([
            {
              type: "CHANGE",
              source: { position: 1, lines: ["![旧图]()"] },
              target: { position: 1, lines: ["![像素](/upload/pixel.png)"] },
            },
          ]),
          lastModifyTime: updatedAt,
        },
      }),
      haloExtension("/registry/content.halo.run/categories/notes", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Category",
        metadata: { name: "notes", creationTimestamp: createdAt },
        spec: { displayName: "笔记", slug: "notes", description: "", children: [] },
      }),
      haloExtension("/registry/content.halo.run/tags/test", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Tag",
        metadata: { name: "test", creationTimestamp: createdAt },
        spec: { displayName: "测试", slug: "test" },
      }),
      haloExtension("/registry/storage.halo.run/attachments/media-1", {
        apiVersion: "storage.halo.run/v1alpha1",
        kind: "Attachment",
        metadata: {
          name: "media-1",
          creationTimestamp: createdAt,
          annotations: {
            "storage.halo.run/uri": "/upload/pixel.png",
            "storage.halo.run/local-relative-path": "upload/pixel.png",
          },
        },
        spec: { displayName: "pixel.png", mediaType: "image/png", size: image.length },
        status: { permalink: "/upload/pixel.png" },
      }),
      haloExtension("/registry/content.halo.run/comments/comment-1", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Comment",
        metadata: { name: "comment-1", creationTimestamp: updatedAt },
        spec: {
          raw: "测试评论",
          content: "测试评论",
          owner: {
            kind: "Email",
            name: "reader@example.com",
            displayName: "读者",
            annotations: { website: "" },
          },
          approved: true,
          hidden: false,
          creationTime: updatedAt,
          approvedTime: updatedAt,
          subjectRef: { kind: "Post", name: "post-1" },
        },
      }),
      haloExtension("/registry/content.halo.run/posts/post-1", {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Post",
        metadata: {
          name: "post-1",
          creationTimestamp: createdAt,
          annotations: { "content.halo.run/stats": '{"visit":7,"upvote":2}' },
        },
        spec: {
          title: "导入测试",
          slug: "import-test",
          releaseSnapshot: "release",
          headSnapshot: "release",
          publish: true,
          deleted: false,
          publishTime: createdAt,
          visible: "PUBLIC",
          allowComment: true,
          pinned: false,
          categories: ["notes"],
          tags: ["test"],
          excerpt: { raw: "" },
        },
        status: { phase: "PUBLISHED", excerpt: "导入摘要", lastModifyTime: updatedAt },
      }),
    ];
    writeFileSync(join(backup, "extensions.data"), JSON.stringify(extensions));

    runNode(converterPath, ["--input", backup, "--output", outputArchive]);
    await extractArchive(outputArchive, output);
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    const markdown = readFileSync(join(output, manifest.items[0].markdown), "utf8");
    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0].comments).toHaveLength(1);
    expect(markdown).toContain("../upload/pixel.png");
    expect(manifest.items[0].markdownSha256).toBe(
      createHash("sha256").update(markdown).digest("hex"),
    );

    runNode(migrationPath, [], { DATABASE_PATH: databasePath });
    runNode(importerPath, [
      "dry-run",
      "--source",
      output,
      "--database",
      databasePath,
      "--uploads",
      uploads,
    ]);
    runNode(importerPath, [
      "import",
      "--source",
      output,
      "--database",
      databasePath,
      "--uploads",
      uploads,
    ]);
    runNode(importerPath, [
      "verify",
      "--source",
      output,
      "--database",
      databasePath,
      "--uploads",
      uploads,
    ]);

    const sqlite = new Database(databasePath, { readonly: true });
    try {
      const post = sqlite
        .prepare(
          `SELECT source_content AS sourceContent, source_format AS sourceFormat,
                  view_count AS viewCount, upvote_count AS upvoteCount,
                  comment_count AS commentCount
           FROM posts WHERE id = 'post-1'`,
        )
        .get() as {
        sourceContent: string;
        sourceFormat: string;
        viewCount: number;
        upvoteCount: number;
        commentCount: number;
      };
      expect(post.sourceContent).toContain("/media/imported/media-1/pixel.png");
      expect(post.sourceFormat).toBe("MARKDOWN");
      expect(post.viewCount).toBe(7);
      expect(post.upvoteCount).toBe(2);
      expect(post.commentCount).toBe(1);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM comments").get()).toEqual({ count: 1 });
      expect(sqlite.pragma("foreign_key_check")).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
