import { useMemo } from "react";
import {
  asText,
  Board,
  type ColumnInfo,
  type DetailTabProps,
  definePlugin,
  Empty,
  type OptionValues,
  type Row,
  Stack,
  Text,
  type Tone,
} from "@l8db/ui";

const TONES = new Map<string, Tone>([
  ["neu", "info"],
  ["new", "info"],
  ["in arbeit", "info"],
  ["in progress", "info"],
  ["offen", "warning"],
  ["open", "warning"],
  ["wartet", "warning"],
  ["waiting", "warning"],
  ["bezahlt", "success"],
  ["versendet", "success"],
  ["erledigt", "success"],
  ["done", "success"],
  ["storniert", "danger"],
  ["cancelled", "danger"],
]);

function list(value: unknown) {
  return asText(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function globMatch(pattern: string, value: string) {
  const pieces = pattern.toLowerCase().split("*");
  const text = value.toLowerCase();
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  if (pieces.length === 1) return text === first;
  if (!text.startsWith(first) || !text.endsWith(last)) return false;
  let index = first.length;
  for (const piece of pieces.slice(1, -1)) {
    const found = text.indexOf(piece, index);
    if (found < 0) return false;
    index = found + piece.length;
  }
  return index <= text.length - last.length;
}

function findColumn(columns: readonly ColumnInfo[], names: string[]) {
  for (const name of names) {
    const match = columns.find((column) => column.id.toLowerCase() === name.toLowerCase());
    if (match) return match;
  }
  return undefined;
}

function KanbanBoard({
  rows,
  columns,
  options,
}: {
  rows: readonly Row[];
  columns: readonly ColumnInfo[];
  options: OptionValues;
}) {
  const status = findColumn(columns, list(options.column));
  const title =
    findColumn(columns, list(options.title)) ??
    columns.find((column) => !column.primaryKey && /char|text|string/i.test(column.type));
  const key = columns.find((column) => column.primaryKey);
  const lanes = useMemo(() => {
    if (!status) return [];
    const groups = new Map<string, Row[]>();
    for (const lane of list(options.lanes)) groups.set(lane, []);
    for (const row of rows) {
      const value = asText(row[status.id]) || "ohne Status";
      const items = groups.get(value);
      if (items) items.push(row);
      else groups.set(value, [row]);
    }
    return [...groups]
      .filter(([, items]) => items.length > 0)
      .map(([lane, items]) => ({
        id: lane,
        label: lane,
        tone: TONES.get(lane.toLowerCase()) ?? "neutral",
        items,
      }));
  }, [rows, status, options.lanes]);
  if (!status)
    return <Empty>Diese Tabelle hat keine Statusspalte „{asText(options.column)}“.</Empty>;
  if (lanes.length === 0) return <Empty>Keine Zeilen geladen.</Empty>;
  return (
    <Board
      columns={lanes}
      limit={Number(options.limit) || 50}
      render={(row) => (
        <Stack direction="column" gap={1} align="stretch">
          <Text weight="medium" truncate>
            {title ? asText(row[title.id]) : asText(row[status.id])}
          </Text>
          <Text tone="muted" size="xs" truncate>
            {[key ? `#${asText(row[key.id])}` : "", ...list(options.details).map((name) => asText(row[name]))]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Stack>
      )}
    />
  );
}

export default definePlugin({
  id: "l8db.kanban",
  name: "Kanban-Board",
  description:
    "Fügt Tabellen mit Statusspalte einen Tab „Kanban“ hinzu: Zeilen als Karten, gruppiert nach Status.",
  version: "1.0.0",
  author: "l8db",
  options: {
    tables: {
      type: "text",
      label: "Tabellen",
      description: "schema.tabelle, * als Platzhalter, kommagetrennt",
      default: "*.tickets,*.orders,*.tasks,*.issues,*.deals",
    },
    column: { type: "text", label: "Statusspalte", default: "status,state,stage" },
    lanes: {
      type: "text",
      label: "Reihenfolge der Spalten",
      description: "Statuswerte, kommagetrennt; weitere Werte folgen dahinter",
      default: "neu,offen,in Arbeit,wartet,bezahlt,versendet,erledigt,storniert",
    },
    title: { type: "text", label: "Titel der Karte", default: "title,name,subject,customer" },
    details: {
      type: "text",
      label: "Zusatzzeile",
      description: "Spalten, kommagetrennt",
      default: "assignee,priority,total",
    },
    limit: { type: "number", label: "Karten je Spalte", default: 50, min: 5, max: 500 },
  },
  slots: (options) => {
    const patterns = list(options.tables);
    return {
      table: {
        detailTabs: (table) =>
          patterns.some((pattern) => globMatch(pattern, table.id))
            ? [
                {
                  id: "kanban",
                  label: "Kanban",
                  render: (props: DetailTabProps) => (
                    <KanbanBoard rows={props.rows} columns={props.columns} options={props.options} />
                  ),
                },
              ]
            : undefined,
      },
    };
  },
});
