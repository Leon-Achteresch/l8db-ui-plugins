import { definePlugin, type TabsOptions, type Tone } from "@l8db/ui";

const TONES: readonly Tone[] = ["info", "success", "warning", "danger", "neutral"];

function toneFor(name: string): Tone {
  let hash = 0;
  for (let index = 0; index < name.length; index++)
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  return TONES[hash % TONES.length];
}

export default definePlugin({
  id: "l8db.tab-groups",
  name: "Tabs nach Schema",
  description:
    "Gruppiert Tabellen-Tabs nach Schema mit farbigem Label, öffnet neue Tabs neben dem aktiven und steuert den Schließen-Knopf.",
  version: "1.0.0",
  author: "l8db",
  options: {
    newTabPosition: {
      type: "select",
      label: "Neue Tabs",
      default: "afterActive",
      choices: [
        { value: "afterActive", label: "Neben dem aktiven Tab" },
        { value: "end", label: "Am Ende" },
      ],
    },
    closeButton: {
      type: "select",
      label: "Schließen-Knopf",
      default: "hover",
      choices: [
        { value: "auto", label: "Am aktiven Tab, sonst beim Überfahren" },
        { value: "always", label: "Immer" },
        { value: "hover", label: "Nur beim Überfahren" },
        { value: "never", label: "Nie (Mittelklick schließt)" },
      ],
    },
    queries: {
      type: "boolean",
      label: "SQL-Tabs gruppieren",
      default: true,
    },
  },
  slots: (options) => ({
    tabs: {
      group: (tab) => {
        if (tab.table) return { id: `schema:${tab.table.schema}`, label: tab.table.schema, tone: toneFor(tab.table.schema) };
        if (options.queries && tab.kind === "query") return { id: "queries", label: "SQL", tone: "neutral" };
        return undefined;
      },
      options: {
        newTabPosition: options.newTabPosition as TabsOptions["newTabPosition"],
        closeButton: options.closeButton as TabsOptions["closeButton"],
      },
    },
  }),
});
