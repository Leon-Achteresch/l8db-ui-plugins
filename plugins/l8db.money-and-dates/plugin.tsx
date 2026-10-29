import {
  asText,
  Badge,
  daysFromToday,
  definePlugin,
  formatDate,
  formatNumber,
  RelativeTime,
  Text,
} from "@l8db/ui";

const NUMERIC = /^(numeric|decimal|money|real|double|float|number|(tiny|small|medium|big)?int(?!erval))/i;
const DATE = /^(date|timestamp|datetime|smalldatetime)/i;

function parts(value: unknown) {
  return asText(value)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export default definePlugin({
  id: "l8db.money-and-dates",
  name: "Beträge und Datum",
  description:
    "Formatiert Geldbeträge als Währung, zeigt Zeitpunkte relativ an und markiert überfällige oder bald fällige Termine.",
  version: "1.0.0",
  author: "l8db",
  options: {
    currency: {
      type: "select",
      label: "Währung",
      default: "EUR",
      choices: ["EUR", "USD", "CHF", "GBP"],
    },
    money: {
      type: "text",
      label: "Betragsspalten",
      description: "Namensteile, kommagetrennt",
      default: "total,amount,price,revenue,betrag,preis,umsatz,summe",
    },
    dates: {
      type: "select",
      label: "Zeitpunkte",
      default: "relative",
      choices: [
        { value: "relative", label: "Relativ (vor 3 Stunden)" },
        { value: "absolute", label: "Absolut (29.10.2026, 14:05)" },
      ],
    },
    due: {
      type: "text",
      label: "Fälligkeitsspalten",
      description: "Namensteile, kommagetrennt",
      default: "due,faellig,deadline",
    },
    warnDays: {
      type: "number",
      label: "Vorwarnung in Tagen",
      default: 3,
      min: 0,
      max: 60,
    },
  },
  slots: (options) => {
    const money = parts(options.money);
    const due = parts(options.due);
    const currency = asText(options.currency);
    const warnDays = Number(options.warnDays);
    const has = (list: string[], id: string) => {
      const name = id.toLowerCase();
      return list.some((part) => name.includes(part));
    };
    const isMoney = (id: string, type: string) => NUMERIC.test(type) && has(money, id);
    return {
      grid: {
        columns: (_table, columns) =>
          columns
            .filter((column) => isMoney(column.id, column.type))
            .map((column) => ({ id: column.id, align: "end" as const })),
        cell: ({ column, value }) => {
          if (value === null || value === undefined || value === "") return undefined;
          if (isMoney(column.id, column.type))
            return <Text mono>{formatNumber(value, { currency })}</Text>;
          if (!DATE.test(column.type)) return undefined;
          if (has(due, column.id)) {
            const days = daysFromToday(value);
            if (days === null) return undefined;
            if (days < 0)
              return (
                <>
                  <Text tone="danger">{formatDate(value)}</Text>
                  <Badge tone="danger">{days} T</Badge>
                </>
              );
            if (days <= warnDays)
              return (
                <>
                  <Text tone="warning">{formatDate(value)}</Text>
                  <Badge tone="warning">{days === 0 ? "heute" : `in ${days} T`}</Badge>
                </>
              );
            return <Text>{formatDate(value)}</Text>;
          }
          if (options.dates === "relative") return <RelativeTime value={value} />;
          return <Text>{formatDate(value, { time: column.type.toLowerCase() !== "date" })}</Text>;
        },
      },
    };
  },
});
