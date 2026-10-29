import { asNumber, asText, Bar, definePlugin, type Tone } from "@l8db/ui";

export default definePlugin({
  id: "l8db.progress-bars",
  name: "Fortschrittsbalken",
  description:
    "Zeigt Prozent-, Quoten- und Zufriedenheitsspalten als Balken mit Ampelfarben statt als nackte Zahl.",
  version: "1.0.0",
  author: "l8db",
  options: {
    columns: {
      type: "text",
      label: "Spalten",
      description: "Namensteile, kommagetrennt",
      default: "percent,progress,satisfaction,quote,prozent,fortschritt",
    },
    max: { type: "number", label: "Höchstwert", default: 100, min: 1, max: 1_000_000 },
    warnBelow: {
      type: "number",
      label: "Gelb unter (%)",
      default: 60,
      min: 0,
      max: 100,
    },
    dangerBelow: {
      type: "number",
      label: "Rot unter (%)",
      default: 30,
      min: 0,
      max: 100,
    },
  },
  slots: (options) => {
    const names = asText(options.columns)
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const max = Number(options.max) || 100;
    const warnBelow = Number(options.warnBelow);
    const dangerBelow = Number(options.dangerBelow);
    return {
      grid: {
        cell: ({ column, value }) => {
          const name = column.id.toLowerCase();
          if (!names.some((part) => name.includes(part))) return undefined;
          const number = asNumber(value);
          if (number === null) return undefined;
          const percent = (number / max) * 100;
          const tone: Tone =
            percent < dangerBelow ? "danger" : percent < warnBelow ? "warning" : "success";
          return <Bar value={number} max={max} tone={tone} label={`${Math.round(percent)} %`} />;
        },
      },
    };
  },
});
