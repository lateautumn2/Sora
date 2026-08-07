import { spawn } from "node:child_process";
import { join } from "node:path";

import { DataApiError } from "@/lib/data/api";

interface ProcessResult {
  stdout: string;
  stderr: string;
}

type ProjectScript = "backup.mjs" | "content-import.mjs" | "restore.mjs";

export async function runProjectScript(
  script: ProjectScript,
  arguments_: string[],
  errorCode: string,
  errorMessage: string,
): Promise<ProcessResult> {
  const projectRoot = process.cwd();
  const child = spawn(process.execPath, [join(projectRoot, "scripts", script), ...arguments_], {
    cwd: projectRoot,
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout = `${stdout}${chunk}`.slice(-64 * 1024);
  });
  child.stderr.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-64 * 1024);
  });

  const exitCode = await new Promise<number>((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolvePromise(code ?? 1));
  });
  if (exitCode !== 0) {
    console.error(`${script} failed with exit code ${exitCode}`, stderr || stdout);
    throw new DataApiError(errorCode, errorMessage, 422);
  }
  return { stdout, stderr };
}
