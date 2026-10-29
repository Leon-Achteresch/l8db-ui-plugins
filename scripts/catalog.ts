import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type UiPluginCatalog, validateCatalog } from "../sdk/src/catalog";
import { checkAll, PLUGINS } from "./plugins";

const out = join(import.meta.dir, "..", process.argv[2] ?? "dist");
const results = await checkAll();
const broken = results.filter((result) => result.errors.length || !result.definition);
if (broken.length) {
  console.error(`Nicht veröffentlicht, bitte zuerst bun run check: ${broken.map((r) => r.dir).join(", ")}`);
  process.exit(1);
}
await rm(out, { recursive: true, force: true });
const catalog: UiPluginCatalog = {
  schemaVersion: 1,
  plugins: results.map((result) => {
    const definition = result.definition as NonNullable<typeof result.definition>;
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      author: definition.author,
      file: `plugins/${result.dir}/${result.file}`,
      sha256: result.sha256,
      screenshot: result.screenshot ? `plugins/${result.dir}/${result.screenshot}` : undefined,
      tags: result.groups,
      http: definition.http,
    };
  }),
};
validateCatalog(JSON.parse(JSON.stringify(catalog)));
for (const result of results) {
  await mkdir(join(out, "plugins", result.dir), { recursive: true });
  await copyFile(join(PLUGINS, result.dir, result.file), join(out, "plugins", result.dir, result.file));
  if (result.screenshot)
    await copyFile(
      join(PLUGINS, result.dir, result.screenshot),
      join(out, "plugins", result.dir, result.screenshot),
    );
}
await writeFile(join(out, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Katalog mit ${catalog.plugins.length} Plugins in ${out}.`);
