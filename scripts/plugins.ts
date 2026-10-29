import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as React from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import type { DetailTabProps, OptionValues, Slots } from "../sdk/l8db-ui";
import {
  compilePlugin,
  createPluginModules,
  evaluatePlugin,
  MAX_PLUGIN_BYTES,
  MAX_SCREENSHOT_BYTES,
  type PluginDefinition,
  resolveOptions,
  validateColumnPatches,
  validateDetailTabs,
  validatePlugin,
  validateSlots,
  validateSplitLayout,
  validateTabGroup,
  validateTone,
  validateToolbarActions,
} from "../sdk/src/index";
import { SAMPLES, TABS } from "./samples";
import { STUB_SDK } from "./sdk";

export const ROOT = join(import.meta.dir, "..");
export const PLUGINS = join(ROOT, "plugins");

const SOURCE = /^plugin\.(tsx|ts|jsx|js)$/;
const SCREENSHOT = /^screenshot\.(png|webp|jpg)$/;
const SIGNATURES: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46],
};
const CELL_BUDGET_MS = 2;
const NO_TIMERS = Object.fromEntries(
  ["setTimeout", "setInterval", "requestAnimationFrame"].map((name) => [name, () => 0]),
);
const MODULES = createPluginModules(React, runtime, STUB_SDK);

export type CheckedPlugin = {
  dir: string;
  file: string;
  source: string;
  sha256: string;
  screenshot: string | null;
  definition: PluginDefinition | null;
  groups: string[];
  errors: string[];
  cellP95: number | null;
  cells: number | null;
  screenshotSha256: string | null;
};

function percentile(values: number[], share: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
}

function render(node: unknown) {
  return renderToStaticMarkup(React.createElement(React.Fragment, null, node as React.ReactNode));
}

function renderComponent(build: () => unknown) {
  function Probe() {
    return build() as React.ReactNode;
  }
  return renderToStaticMarkup(React.createElement(Probe));
}

function optionVariants(definition: PluginDefinition): OptionValues[] {
  const defaults = resolveOptions(definition.options, undefined);
  const variants = [defaults];
  for (const [key, spec] of Object.entries(definition.options)) {
    if (spec.type === "boolean") variants.push({ ...defaults, [key]: !defaults[key] });
    if (spec.type === "select")
      for (const choice of spec.choices) {
        const value = typeof choice === "string" ? choice : choice.value;
        if (value !== defaults[key]) variants.push({ ...defaults, [key]: value });
      }
    if (spec.type === "text") variants.push({ ...defaults, [key]: "" });
    if (spec.type === "number") {
      if (spec.min !== undefined) variants.push({ ...defaults, [key]: spec.min });
      if (spec.max !== undefined) variants.push({ ...defaults, [key]: spec.max });
    }
  }
  return variants;
}

type Run = { timings: number[]; coverage: Record<string, number> };

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function exercise(slots: Slots, options: OptionValues, run: Run) {
  const { grid, table, tabs, split } = slots;
  const hit = (slot: string, produced: boolean) => {
    run.coverage[slot] = (run.coverage[slot] ?? 0) + (produced ? 1 : 0);
  };
  let step = "";
  try {
    for (const { table: info, columns, rows } of SAMPLES) {
      if (grid?.columns) {
        step = `grid.columns(${info.id})`;
        hit("grid.columns", validateColumnPatches(grid.columns(info, columns)).length > 0);
      }
      if (grid?.rowTone)
        for (const [rowIndex, row] of rows.entries()) {
          step = `grid.rowTone(${info.id}, Zeile ${rowIndex})`;
          hit("grid.rowTone", validateTone(grid.rowTone(row, info)) !== undefined);
        }
      if (grid?.cell)
        for (const [rowIndex, row] of rows.entries())
          for (const column of columns) {
            step = `grid.cell(${info.id}, Zeile ${rowIndex}, Spalte ${column.id})`;
            const started = performance.now();
            const output = grid.cell({
              value: row[column.id],
              row,
              column,
              table: info,
              rowIndex,
              rows,
              options,
            });
            run.timings.push(performance.now() - started);
            hit("grid.cell", output !== undefined);
            if (output !== undefined) render(output);
          }
      if (table?.toolbar) {
        step = `table.toolbar(${info.id})`;
        const actions = validateToolbarActions(table.toolbar(info));
        hit("table.toolbar", actions.length > 0);
        for (const action of actions) {
          step = `table.toolbar(${info.id}) → ${action.id}.run`;
          await Promise.race([
            action.run({
              table: info,
              columns,
              selection: rows.slice(0, 2),
              rows,
              options,
              toast: (text) => void String(text),
              http: () => Promise.reject(new Error("Netzwerk ist in der Prüfung aus.")),
              copy: async (text) => void String(text),
              openTable: (name) => {
                if (!/^[^.]+\.[^.]+$/.test(name))
                  throw new Error(`openTable("${name}") ist ungültig.`);
              },
              refresh: () => undefined,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Die Aktion braucht über 2 s.")), 2000),
            ),
          ]);
        }
      }
      if (table?.detailTabs) {
        step = `table.detailTabs(${info.id})`;
        const detailTabs = validateDetailTabs(table.detailTabs(info));
        hit("table.detailTabs", detailTabs.length > 0);
        for (const tab of detailTabs) {
          step = `table.detailTabs(${info.id}) → ${tab.id}.render`;
          const props: DetailTabProps = {
            rows,
            columns,
            table: info,
            selection: rows.slice(0, 1),
            options,
            toast: () => undefined,
            http: () => Promise.reject(new Error("Netzwerk ist in der Prüfung aus.")),
            openTable: () => undefined,
          };
          renderComponent(() => tab.render(props));
        }
      }
    }
    for (const tab of TABS) {
      if (tabs?.group) {
        step = `tabs.group(${tab.key})`;
        hit("tabs.group", validateTabGroup(tabs.group(tab)) !== undefined);
      }
      if (tabs?.item)
        for (const active of [true, false]) {
          step = `tabs.item(${tab.key}, active ${active})`;
          const output = tabs.item({
            tab,
            active,
            Default: () => React.createElement("span", null, tab.title),
          });
          hit("tabs.item", output !== undefined);
          if (output !== undefined) renderComponent(() => output);
        }
    }
    if (split?.layout)
      for (const count of [2, 3, 4])
        for (const orientation of ["horizontal", "vertical"] as const) {
          step = `split.layout(${count}, ${orientation})`;
          hit("split.layout", validateSplitLayout(split.layout(count, orientation)) !== undefined);
        }
  } catch (error) {
    throw new Error(`${step}: ${message(error)}`);
  }
}

export async function checkPlugin(dir: string, root = PLUGINS): Promise<CheckedPlugin> {
  const folder = join(root, dir);
  const entries = await readdir(folder);
  const errors: string[] = [];
  const sources = entries.filter((name) => SOURCE.test(name));
  const screenshots = entries.filter((name) => SCREENSHOT.test(name));
  const unknown = entries.filter(
    (name) => !SOURCE.test(name) && !SCREENSHOT.test(name) && name !== "README.md",
  );
  if (unknown.length) errors.push(`Unerwartete Dateien: ${unknown.join(", ")}.`);
  if (sources.length !== 1)
    errors.push("Genau eine Datei plugin.tsx (oder .ts, .jsx, .js) pro Ordner.");
  if (screenshots.length !== 1)
    errors.push("Genau ein Screenshot screenshot.png (oder .webp, .jpg) pro Ordner.");
  const file = sources[0] ?? "plugin.tsx";
  const source = sources.length ? await readFile(join(folder, file), "utf8") : "";
  const result: CheckedPlugin = {
    dir,
    file,
    source,
    sha256: createHash("sha256").update(source).digest("hex"),
    screenshot: screenshots[0] ?? null,
    definition: null,
    groups: [],
    errors,
    cellP95: null,
    cells: null,
    screenshotSha256: null,
  };
  if (screenshots.length === 1) {
    const bytes = await readFile(join(folder, screenshots[0]));
    result.screenshotSha256 = createHash("sha256").update(bytes).digest("hex");
    const signature = SIGNATURES[screenshots[0].split(".")[1]];
    if (bytes.length > MAX_SCREENSHOT_BYTES) errors.push("Der Screenshot ist größer als 2 MB.");
    if (!signature.every((byte, index) => bytes[index] === byte))
      errors.push("Der Screenshot passt nicht zu seiner Dateiendung.");
  }
  if (!source) return result;
  if (Buffer.byteLength(source) > MAX_PLUGIN_BYTES) errors.push("plugin ist größer als 256 KB.");
  const compiled = compilePlugin(source, file);
  if (!compiled.ok) {
    errors.push(`${file}:${compiled.error.line ?? "?"} ${compiled.error.message}`);
    return result;
  }
  try {
    const definition = validatePlugin(evaluatePlugin(compiled.code, MODULES, NO_TIMERS));
    result.definition = definition;
    if (definition.id !== dir) errors.push(`Der Ordner muss wie die id heißen: plugins/${definition.id}.`);
    if (!/^\d+\.\d+\.\d+$/.test(definition.version))
      errors.push('version fehlt oder ist kein "1.2.3".');
    if (!definition.description) errors.push("description fehlt.");
    if (!definition.author) errors.push("author fehlt.");
    if (definition.name === definition.id) errors.push("name fehlt.");
    const groups = new Set<string>();
    const run: Run = { timings: [], coverage: {} };
    const defaults = resolveOptions(definition.options, undefined);
    for (const options of optionVariants(definition)) {
      const changed = Object.entries(options)
        .filter(([key, value]) => value !== defaults[key])
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`);
      try {
        const slots =
          typeof definition.slots === "function"
            ? validateSlots(definition.slots(options))
            : definition.slots;
        for (const [group, entries] of Object.entries(slots))
          if (entries && Object.keys(entries).length) groups.add(group);
        await exercise(slots, options, run);
      } catch (error) {
        throw new Error(
          `${changed.length ? `Mit ${changed.join(", ")}` : "Mit Standardoptionen"} → ${message(error)}`,
        );
      }
    }
    result.groups = [...groups].sort();
    result.cellP95 = percentile(run.timings, 0.95);
    result.cells = run.coverage["grid.cell"] ?? null;
    if (result.groups.length === 0) errors.push("Das Plugin füllt keinen Slot.");
    for (const [slot, count] of Object.entries(run.coverage))
      if (count === 0)
        errors.push(
          `${slot} liefert mit den Beispieldaten nie etwas. Ergänze passende Tabellen, Spalten oder Tabs in scripts/samples.ts, damit der Check deinen Code ausführt.`,
        );
    if (result.cellP95 !== null && result.cellP95 > CELL_BUDGET_MS)
      errors.push(
        `grid.cell ist zu langsam: p95 ${result.cellP95.toFixed(3)} ms, erlaubt ${CELL_BUDGET_MS} ms.`,
      );
  } catch (error) {
    errors.push(message(error));
  }
  return result;
}

export async function checkAll(): Promise<CheckedPlugin[]> {
  const dirs = (await readdir(PLUGINS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const results: CheckedPlugin[] = [];
  for (const dir of dirs) results.push(await checkPlugin(dir));
  return results;
}

export function crossCheck(results: readonly CheckedPlugin[]): string[] {
  const problems: string[] = [];
  const ids = new Map<string, string>();
  const screenshots = new Map<string, string>();
  for (const result of results) {
    const id = result.definition?.id;
    if (id && ids.has(id)) problems.push(`${result.dir} nutzt dieselbe id wie ${ids.get(id)}.`);
    if (id) ids.set(id, result.dir);
    const hash = result.screenshotSha256;
    if (hash && screenshots.has(hash))
      problems.push(
        `${result.dir}: Der Screenshot ist eine Kopie von ${screenshots.get(hash)}. Zeig dein eigenes Plugin in l8db.`,
      );
    if (hash) screenshots.set(hash, result.dir);
  }
  return problems;
}
