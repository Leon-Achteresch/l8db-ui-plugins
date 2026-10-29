import { asText, definePlugin } from "@l8db/ui";

function pretty(id: string) {
  const words = id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default definePlugin({
  id: "l8db.column-presets",
  name: "Spalten-Vorgaben",
  description:
    "Heftet Primärschlüssel links an, blendet technische Spalten aus und zeigt lesbare Spaltennamen. Eigene Anpassungen in l8db gehen immer vor.",
  version: "1.0.0",
  author: "l8db",
  options: {
    pinKeys: { type: "boolean", label: "Primärschlüssel anheften", default: true },
    hide: {
      type: "text",
      label: "Ausblenden",
      description: "Spaltennamen, kommagetrennt",
      default: "updated_by,created_by,deleted_at,row_version",
    },
    labels: {
      type: "boolean",
      label: "Lesbare Spaltennamen",
      description: "due_date wird zu „Due date“",
      default: true,
    },
  },
  slots: (options) => {
    const hidden = new Set(
      asText(options.hide)
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    );
    return {
      grid: {
        columns: (_table, columns) =>
          columns.map((column) => {
            const pin = options.pinKeys === true && column.primaryKey;
            return {
              id: column.id,
              pinned: pin || undefined,
              order: pin ? 0 : undefined,
              hidden: hidden.has(column.id.toLowerCase()) || undefined,
              label: options.labels ? pretty(column.id) : undefined,
            };
          }),
      },
    };
  },
});
