import { checkAll, crossCheck } from "./plugins";
import { readmeIsCurrent } from "./readme";

const results = await checkAll();
let failed = 0;
for (const result of results) {
  const timing =
    result.cellP95 === null
      ? ""
      : ` · grid.cell ${result.cells} Zellen, p95 ${result.cellP95.toFixed(3)} ms`;
  if (result.errors.length === 0) {
    console.log(`✓ ${result.dir} (${result.groups.join(", ")})${timing}`);
    continue;
  }
  failed++;
  console.log(`✗ ${result.dir}`);
  for (const error of result.errors) console.log(`  - ${error}`);
}
for (const problem of crossCheck(results)) {
  failed++;
  console.log(`✗ ${problem}`);
}
if (!failed && !(await readmeIsCurrent(results))) {
  failed++;
  console.log("✗ README.md ist nicht aktuell. Führe bun run readme aus.");
}
console.log(failed ? `\n${failed} Problem(e).` : `\nAlle ${results.length} Plugins sind in Ordnung.`);
process.exit(failed ? 1 : 0);
