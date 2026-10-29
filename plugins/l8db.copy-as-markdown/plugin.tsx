import { asText, definePlugin, type Row } from "@l8db/ui";

function cell(value: unknown) {
  return asText(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdown(columns: readonly string[], rows: readonly Row[]) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => cell(row[column])).join(" | ")} |`),
  ].join("\n");
}

export default definePlugin({
  id: "l8db.copy-as-markdown",
  name: "Als Markdown kopieren",
  description:
    "Fügt jeder Tabelle einen Knopf hinzu, der markierte oder geladene Zeilen als Markdown-Tabelle kopiert – fertig für Tickets, Wikis und Chats.",
  version: "1.0.0",
  author: "l8db",
  options: {
    scope: {
      type: "select",
      label: "Zeilen",
      default: "selection",
      choices: [
        { value: "selection", label: "Markierte Zeilen, sonst alle geladenen" },
        { value: "all", label: "Immer alle geladenen Zeilen" },
      ],
    },
    maxRows: { type: "number", label: "Höchstens Zeilen", default: 200, min: 1, max: 5000 },
  },
  slots: (options) => ({
    table: {
      toolbar: () => [
        {
          id: "copy-markdown",
          label: "Markdown",
          tone: "info",
          run: async (ctx) => {
            const source =
              options.scope === "selection" && ctx.selection.length > 0 ? ctx.selection : ctx.rows;
            const rows = source.slice(0, Number(options.maxRows) || 200);
            if (rows.length === 0) {
              ctx.toast("Keine Zeilen geladen.", "warning");
              return;
            }
            await ctx.copy(
              markdown(
                ctx.columns.map((column) => column.id),
                rows,
              ),
            );
            ctx.toast(
              `${rows.length} ${rows.length === 1 ? "Zeile" : "Zeilen"} als Markdown kopiert.`,
              "success",
            );
          },
        },
      ],
    },
  }),
});
