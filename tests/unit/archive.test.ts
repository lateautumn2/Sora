import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import yazl from "yazl";

import { ArchiveError, createArchive, extractArchive } from "@/lib/data/archive";

const temporaryDirectories: string[] = [];

async function createTestZip(path: string, files: Array<[string, string]>) {
  const zip = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  zip.outputStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<void>((resolve, reject) => {
    zip.outputStream.once("end", resolve);
    zip.outputStream.once("error", reject);
  });
  for (const [name, content] of files) zip.addBuffer(Buffer.from(content), name);
  zip.end();
  await completed;
  await writeFile(path, Buffer.concat(chunks));
}

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("ZIP 安全层", () => {
  it("流式生成并解压普通 ZIP", async () => {
    const root = await mkdtemp(join(tmpdir(), "sora-archive-"));
    temporaryDirectories.push(root);
    const source = join(root, "source");
    const archive = join(root, "backup.zip");
    const destination = join(root, "destination");
    await mkdir(join(source, "nested"), { recursive: true });
    await writeFile(join(source, "nested", "content.md"), "# 测试", "utf8");

    await createArchive(source, archive);
    const result = await extractArchive(archive, destination);

    expect(result.entries).toBe(1);
    expect(await readFile(join(destination, "nested", "content.md"), "utf8")).toBe("# 测试");
  });

  it("拒绝在大小写不敏感文件系统上冲突的重复路径", async () => {
    const root = await mkdtemp(join(tmpdir(), "sora-archive-"));
    temporaryDirectories.push(root);
    const archive = join(root, "duplicate.zip");
    await createTestZip(archive, [
      ["content/A.md", "A"],
      ["content/a.md", "B"],
    ]);

    await expect(extractArchive(archive, join(root, "output"))).rejects.toMatchObject({
      code: "ARCHIVE_ENTRY_DUPLICATED",
    } satisfies Partial<ArchiveError>);
  });

  it("拒绝路径穿越条目", async () => {
    const root = await mkdtemp(join(tmpdir(), "sora-archive-"));
    temporaryDirectories.push(root);
    const archive = join(root, "traversal.zip");
    await createTestZip(archive, [["aaa.txt", "payload"]]);
    const buffer = await readFile(archive);
    const unsafe = Buffer.from(
      buffer.toString("binary").replaceAll("aaa.txt", "../x.txt"),
      "binary",
    );
    await writeFile(archive, unsafe);

    await expect(extractArchive(archive, join(root, "output"))).rejects.toBeInstanceOf(
      ArchiveError,
    );
  });
});
