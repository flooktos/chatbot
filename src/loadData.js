import { readFile } from "node:fs/promises";

export async function readJsonFile(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}
