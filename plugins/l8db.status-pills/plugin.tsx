import { asText, definePlugin, Pill, type Row, type Tone } from "@l8db/ui";

const TONES = new Map<string, Tone>([
  ["neu", "info"],
  ["new", "info"],
  ["entwurf", "info"],
  ["draft", "info"],
  ["in arbeit", "info"],
  ["in progress", "info"],
  ["offen", "warning"],
  ["open", "warning"],
  ["pending", "warning"],
  ["wartet", "warning"],
  ["waiting", "warning"],
  ["mittel", "warning"],
  ["medium", "warning"],
  ["bezahlt", "success"],
  ["paid", "success"],
  ["versendet", "success"],
  ["shipped", "success"],
  ["geliefert", "success"],
  ["delivered", "success"],
  ["erledigt", "success"],
  ["done", "success"],
  ["aktiv", "success"],
  ["active", "success"],
  ["storniert", "danger"],
  ["cancelled", "danger"],
  ["canceled", "danger"],
  ["fehler", "danger"],
  ["failed", "danger"],
  ["error", "danger"],
  ["hoch", "danger"],
  ["high", "danger"],
  ["niedrig", "neutral"],
  ["low", "neutral"],
]);

function names(value: unknown) {
  return asText(value)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export default definePlugin({
  id: "l8db.status-pills",
  name: "Status als Pills",
  description:
    "Zeigt Status- und Prioritätsspalten als farbige Pills. Auf Wunsch werden auch ganze Zeilen nach ihrem Status eingefärbt.",
  version: "1.0.0",
  author: "l8db",
  options: {
    columns: {
      type: "text",
      label: "Spalten",
      description: "Spaltennamen, kommagetrennt",
      default: "status,state,priority,prioritaet",
    },
    tintRows: {
      type: "boolean",
      label: "Zeilen einfärben",
      description: "Rote und gelbe Status färben die ganze Zeile",
      default: false,
    },
  },
  slots: (options) => {
    const columns = new Set(names(options.columns));
    const toneOf = (row: Row) => {
      for (const key of Object.keys(row)) {
        if (!columns.has(key.toLowerCase())) continue;
        const tone = TONES.get(asText(row[key]).toLowerCase());
        if (tone === "danger" || tone === "warning") return tone;
      }
      return undefined;
    };
    return {
      grid: {
        cell: ({ column, value }) => {
          if (!columns.has(column.id.toLowerCase())) return undefined;
          const text = asText(value);
          if (!text) return undefined;
          return <Pill tone={TONES.get(text.toLowerCase()) ?? "neutral"}>{text}</Pill>;
        },
        rowTone: options.tintRows ? toneOf : undefined,
      },
    };
  },
});
