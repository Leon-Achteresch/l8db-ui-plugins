import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type CheckedPlugin, checkAll, ROOT } from "./plugins";

const START = "<!-- plugins:start -->";
const END = "<!-- plugins:end -->";
const README = join(ROOT, "README.md");
const SLOT_NAMES: Record<string, string> = {
  grid: "Tabelle",
  table: "Toolbar & Tabs",
  tabs: "Tab-Leiste",
  split: "Split-Ansicht",
};

export function pluginList(results: readonly CheckedPlugin[]) {
  return results
    .filter((result) => result.definition)
    .map((result) => {
      const definition = result.definition as NonNullable<CheckedPlugin["definition"]>;
      const where = result.groups.map((group) => SLOT_NAMES[group] ?? group).join(", ");
      return [
        `### ${definition.name}`,
        "",
        `\`${definition.id}\` · ${where} · [Quelltext](plugins/${result.dir}/${result.file})`,
        "",
        definition.description,
        "",
        result.screenshot
          ? `![${definition.name}](plugins/${result.dir}/${result.screenshot})`
          : "",
      ]
        .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
        .join("\n");
    })
    .join("\n\n");
}

function withList(readme: string, results: readonly CheckedPlugin[]) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start) throw new Error(`README.md braucht ${START} und ${END}.`);
  return `${readme.slice(0, start + START.length)}\n\n${pluginList(results)}\n\n${readme.slice(end)}`;
}

export async function readmeIsCurrent(results: readonly CheckedPlugin[]) {
  const readme = await readFile(README, "utf8");
  return withList(readme, results) === readme;
}

if (import.meta.main) {
  const results = await checkAll();
  const readme = await readFile(README, "utf8");
  await writeFile(README, withList(readme, results));
  console.log(`README.md listet ${results.filter((result) => result.definition).length} Plugins.`);
}
