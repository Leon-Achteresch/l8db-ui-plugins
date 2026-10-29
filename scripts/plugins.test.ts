import { afterAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CheckedPlugin, checkPlugin, crossCheck } from "./plugins";

const root = await mkdtemp(join(tmpdir(), "l8db-ui-plugins-"));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

afterAll(() => rm(root, { recursive: true, force: true }));

async function plugin(dir: string, source: string, screenshot = true) {
  await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, dir, "plugin.tsx"), source);
  if (screenshot) await writeFile(join(root, dir, "screenshot.png"), PNG);
  return checkPlugin(dir, root);
}

const header = (id: string) =>
  `id: "${id}", name: "Test", description: "Test", version: "1.0.0", author: "Test",`;

test("accepts a complete plugin and reports its slot groups", async () => {
  const result = await plugin(
    "test.ok",
    `import { definePlugin, Pill } from "@l8db/ui";
export default definePlugin({ ${header("test.ok")}
  slots: { grid: { cell: ({ column, value }) => column.id === "status" ? <Pill tone="info">{String(value)}</Pill> : undefined } } });`,
  );
  expect(result.errors).toEqual([]);
  expect(result.groups).toEqual(["grid"]);
  expect(result.cellP95).not.toBeNull();
});

test("rejects blocked browser APIs with the line number", async () => {
  const result = await plugin(
    "test.fetch",
    `import { definePlugin } from "@l8db/ui";
const load = () => fetch("https://example.com");
export default definePlugin({ ${header("test.fetch")} slots: { table: { toolbar: () => [] } } });`,
  );
  expect(result.errors.join("\n")).toContain('plugin.tsx:2 "fetch" ist in Plugins nicht erlaubt');
});

test("rejects folders that do not match the id and missing metadata", async () => {
  const result = await plugin(
    "test.folder",
    `import { definePlugin } from "@l8db/ui";
export default definePlugin({ id: "test.other", slots: { tabs: { options: { closeButton: "never" } } } });`,
    false,
  );
  const errors = result.errors.join("\n");
  expect(errors).toContain("plugins/test.other");
  expect(errors).toContain("version fehlt");
  expect(errors).toContain("Genau ein Screenshot");
});

test("runs slots with sample data and every option variant", async () => {
  const result = await plugin(
    "test.crash",
    `import { definePlugin, Pill } from "@l8db/ui";
export default definePlugin({ ${header("test.crash")}
  options: { loud: { type: "boolean", label: "Laut", default: false } },
  slots: (options) => ({ grid: { cell: ({ value }) => options.loud ? <Pill tone="purple">{String(value)}</Pill> : undefined } }) });`,
  );
  const errors = result.errors.join("\n");
  expect(errors).toContain('Ton "purple" gibt es nicht');
  expect(errors).toContain("Mit loud = true → grid.cell(sales.orders, Zeile 0, Spalte id)");
});

test("fails slots that never produce output with the sample data", async () => {
  const result = await plugin(
    "test.unused",
    `import { definePlugin, Text } from "@l8db/ui";
export default definePlugin({ ${header("test.unused")}
  slots: { grid: { cell: ({ column, value }) => column.id === "gibt_es_nicht" ? <Text>{String(value)}</Text> : undefined } } });`,
  );
  expect(result.errors.join("\n")).toContain("grid.cell liefert mit den Beispieldaten nie etwas");
});

test("hands toolbar actions the table columns", async () => {
  const result = await plugin(
    "test.columns",
    `import { definePlugin } from "@l8db/ui";
export default definePlugin({ ${header("test.columns")}
  slots: { table: { toolbar: () => [{ id: "c", label: "C", run: (ctx) => { if (ctx.columns[0].id !== Object.keys(ctx.rows[0])[0]) throw new Error("Spalten fehlen"); } }] } } });`,
  );
  expect(result.errors).toEqual([]);
});

test("rejects duplicate ids and copied screenshots across plugins", () => {
  const entry = (dir: string, id: string, screenshotSha256: string) =>
    ({ dir, definition: { id }, screenshotSha256 }) as unknown as CheckedPlugin;
  expect(crossCheck([entry("a.one", "a.one", "x"), entry("a.two", "a.two", "y")])).toEqual([]);
  const problems = crossCheck([entry("a.one", "a.one", "x"), entry("a.two", "a.one", "x")]).join("\n");
  expect(problems).toContain("a.two nutzt dieselbe id wie a.one");
  expect(problems).toContain("a.two: Der Screenshot ist eine Kopie von a.one");
});

test("rejects dangerous elements at render time", async () => {
  const tag = ["if", "rame"].join("");
  const result = await plugin(
    "test.frame",
    `import { definePlugin } from "@l8db/ui";
const Tag = "${tag}";
export default definePlugin({ ${header("test.frame")}
  slots: { tabs: { item: ({ Default }) => <Tag src="https://example.com" /> } } });`,
  );
  expect(result.errors.join("\n")).toContain("ist in UI-Plugins nicht erlaubt");
});

test("flags slow cells", async () => {
  const result = await plugin(
    "test.slow",
    `import { definePlugin } from "@l8db/ui";
export default definePlugin({ ${header("test.slow")}
  slots: { grid: { cell: () => { const end = performance.now() + 3; while (performance.now() < end) {} return undefined; } } } });`,
  );
  expect(result.errors.join("\n")).toContain("grid.cell ist zu langsam");
});

test("flags slow row tones", async () => {
  const result = await plugin(
    "test.slowtone",
    `import { definePlugin } from "@l8db/ui";
export default definePlugin({ ${header("test.slowtone")}
  slots: { grid: { rowTone: () => { const end = performance.now() + 1.5; while (performance.now() < end) {} return "info"; } } } });`,
  );
  expect(result.errors.join("\n")).toContain("grid.rowTone ist zu langsam");
});

test("rejects hooks called directly in slot functions like l8db does", async () => {
  const result = await plugin(
    "test.hook",
    `import { definePlugin } from "@l8db/ui";
import { useState } from "react";
export default definePlugin({ ${header("test.hook")}
  slots: { grid: { rowTone: () => { const [tone] = useState("info"); return tone; } } } });`,
  );
  expect(result.errors.join("\n")).toContain(
    "useState ist direkt in Slot-Funktionen nicht erlaubt",
  );
});
