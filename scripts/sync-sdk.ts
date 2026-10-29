import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const target = join(import.meta.dir, "..", "sdk");
const from = process.argv[2] ?? "development";

async function remote(path: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/Leon-Achteresch/l8db/${from}/packages/ui-plugin-api/${path}`,
  );
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

async function remoteSources() {
  const response = await fetch(
    `https://api.github.com/repos/Leon-Achteresch/l8db/contents/packages/ui-plugin-api/src?ref=${from}`,
  );
  if (!response.ok) throw new Error(`Liste der SDK-Dateien: HTTP ${response.status}`);
  const entries = (await response.json()) as { name: string; type: string }[];
  return entries.filter((entry) => entry.type === "file" && entry.name.endsWith(".ts")).map((entry) => entry.name);
}

const local = from.startsWith("/") || from.startsWith(".");
const names = local
  ? (await readdir(join(from, "src"))).filter((name) => name.endsWith(".ts"))
  : await remoteSources();
const read = (path: string) => (local ? readFile(join(from, path), "utf8") : remote(path));
const files = [
  ["l8db-ui.d.ts", await read("l8db-ui.d.ts")],
  ["folder-agents.md", await read("folder-agents.md")],
  ...(await Promise.all(names.map(async (name) => [`src/${name}`, await read(`src/${name}`)]))),
];
await rm(join(target, "src"), { recursive: true, force: true });
await mkdir(join(target, "src"), { recursive: true });
for (const [name, contents] of files) await writeFile(join(target, name), contents);
console.log(`SDK aus ${from} übernommen: ${files.length} Dateien.`);
