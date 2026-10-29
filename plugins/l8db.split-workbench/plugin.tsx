import { asText, definePlugin, type SplitLayout, type Template } from "@l8db/ui";

const TABLE = /^[^.\s][^.]*\.[^.]*[^.\s]$/;

export default definePlugin({
  id: "l8db.split-workbench",
  name: "Split-Arbeitsplatz",
  description:
    "Ordnet geteilte Ansichten an, legt nicht für jede Teilung eine Gruppe an und bringt Master-Detail-Vorlagen mit: Auswahl links filtert die Bereiche rechts.",
  version: "1.0.0",
  author: "l8db",
  options: {
    three: {
      type: "select",
      label: "Drei Bereiche",
      default: "leftStack",
      choices: [
        { value: "leftStack", label: "Links groß, rechts gestapelt" },
        { value: "topStack", label: "Oben groß, unten nebeneinander" },
        { value: "columns", label: "Drei Spalten" },
        { value: "rows", label: "Drei Zeilen" },
      ],
    },
    autoSaveGroups: {
      type: "boolean",
      label: "Jede Teilung als Gruppe merken",
      default: false,
    },
    master: { type: "text", label: "Vorlage: Master-Tabelle", default: "sales.orders" },
    detail: { type: "text", label: "Vorlage: Detail-Tabelle", default: "sales.order_items" },
    link: { type: "text", label: "Vorlage: Spalte im Detail", default: "order_id" },
    masterColumn: { type: "text", label: "Vorlage: Spalte im Master", default: "id" },
  },
  slots: (options) => {
    const master = asText(options.master).trim();
    const detail = asText(options.detail).trim();
    const link = asText(options.link).trim();
    const masterColumn = asText(options.masterColumn).trim() || undefined;
    const templates: Template[] = [];
    if (TABLE.test(master) && TABLE.test(detail) && link)
      templates.push({
        id: "master-detail",
        name: `${master} → ${detail}`.slice(0, 60),
        orientation: "horizontal",
        panes: [{ table: master }, { table: detail, master: 0, link: { column: link, masterColumn } }],
      });
    templates.push({
      id: "customer-360",
      name: "Kunde 360°",
      when: { connectionTag: "crm" },
      panes: [
        { table: "crm.customers" },
        { table: "crm.tickets", master: 0, link: { column: "customer_id", masterColumn: "id" } },
        { table: "sales.orders", master: 0, link: { column: "customer", masterColumn: "name" } },
      ],
    });
    return {
      split: {
        layout: (count) =>
          count === 3 ? (asText(options.three) as SplitLayout) : count === 4 ? "grid" : undefined,
        options: { autoSaveGroups: options.autoSaveGroups === true },
        templates,
      },
    };
  },
});
