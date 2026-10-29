import type { ColumnInfo, ConnectionInfo, Row, TabInfo, TableInfo } from "../sdk/l8db-ui";

const DAY = 86_400_000;
const now = Date.now();
const day = (offset: number) => new Date(now + offset * DAY).toISOString().slice(0, 10);
const hour = (offset: number) => new Date(now + offset * 3_600_000).toISOString();

export const CONNECTIONS: readonly ConnectionInfo[] = [
  {
    id: "shop",
    name: "Shop Produktion",
    kind: "postgres",
    environment: "production",
    tags: ["crm"],
    readOnly: false,
  },
  { id: "dev", name: "Lokal", kind: "sqlite", environment: null, tags: [], readOnly: true },
];

type Sample = { table: TableInfo; columns: ColumnInfo[]; rows: readonly Row[] };

function sample(
  schema: string,
  name: string,
  columns: [string, string][],
  rows: Row[],
  connection = CONNECTIONS[0],
): Sample {
  return {
    table: {
      id: `${schema}.${name}`,
      schema,
      name,
      database: "shop",
      kind: "table",
      connection,
    },
    columns: columns.map(([id, type], index) => ({
      id,
      type,
      label: id,
      primaryKey: index === 0,
    })),
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
  };
}

const customers = ["Müller Logistik GmbH", "Brandt & Söhne KG", "Nordlicht Media", "Alpenblick Hotels"];
const people = ["Anna", "Ben", "Clara", "Deniz"];

export const SAMPLES: readonly Sample[] = [
  sample(
    "sales",
    "orders",
    [
      ["id", "integer"],
      ["customer", "text"],
      ["status", "text"],
      ["total", "numeric"],
      ["paid_percent", "integer"],
      ["due_date", "date"],
      ["created_at", "timestamp with time zone"],
      ["updated_by", "text"],
    ],
    Array.from({ length: 120 }, (_, index) => ({
      id: 10_480 + index,
      customer: customers[index % customers.length],
      status: ["offen", "bezahlt", "versendet", "storniert", null][index % 5],
      total: index % 17 === 0 ? null : String(((index * 7919) % 18_000) / 3 + 120),
      paid_percent: (index * 37) % 101,
      due_date: day(((index * 11) % 40) - 14),
      created_at: hour(-index * 9),
      updated_by: people[index % people.length].toLowerCase(),
    })),
  ),
  sample(
    "crm",
    "tickets",
    [
      ["id", "integer"],
      ["customer_id", "integer"],
      ["title", "text"],
      ["status", "text"],
      ["priority", "text"],
      ["assignee", "text"],
      ["updated_at", "timestamp"],
    ],
    Array.from({ length: 60 }, (_, index) => ({
      id: 7_100 + index,
      customer_id: 300 + (index % customers.length),
      title: ["Lieferung unvollständig", "Rechnung doppelt", "Zugang gesperrt"][index % 3],
      status: ["neu", "in Arbeit", "wartet", "erledigt"][index % 4],
      priority: ["hoch", "mittel", "niedrig"][index % 3],
      assignee: people[index % people.length],
      updated_at: hour(-index * 5).replace("T", " ").slice(0, 19),
    })),
  ),
  sample(
    "crm",
    "customers",
    [
      ["id", "integer"],
      ["name", "text"],
      ["email", "character varying"],
      ["phone", "text"],
      ["segment", "text"],
      ["revenue", "numeric"],
      ["satisfaction_percent", "smallint"],
      ["created_at", "timestamp with time zone"],
    ],
    Array.from({ length: 40 }, (_, index) => ({
      id: 300 + index,
      name: customers[index % customers.length],
      email:
        index % 9 === 4
          ? "kein-at-zeichen"
          : `kontakt${index}@${["mueller.de", "brandt.example", "nordlicht.media", "alpenblick.at"][index % 4]}`,
      phone: index % 7 === 3 ? null : `+49 ${30 + index} ${1_000_000 + index * 7_919}`,
      segment: ["A", "B", "C"][index % 3],
      revenue: String(((index * 104_729) % 900_000) / 8 + 1_000),
      satisfaction_percent: (index * 23) % 101,
      created_at: hour(-index * 30),
    })),
  ),
  sample(
    "public",
    "everything",
    [
      ["id", "bigint"],
      ["status", "character varying"],
      ["payload", "jsonb"],
      ["tags", "text[]"],
      ["flag", "boolean"],
      ["amount", "money"],
      ["ratio", "double precision"],
      ["stamp", "timestamp"],
      ["blob", "bytea"],
      ["note", "text"],
    ],
    [
      {
        id: "9007199254740993",
        status: "",
        payload: { nested: { deep: [1, 2, 3] }, text: "<b>kein html</b>" },
        tags: ["a", "b"],
        flag: true,
        amount: "-12.5",
        ratio: Number.NaN,
        stamp: "kein datum",
        blob: "\\xdeadbeef",
        note: "x".repeat(5000),
      },
      {
        id: 2,
        status: null,
        payload: null,
        tags: [],
        flag: false,
        amount: "1e309",
        ratio: Number.POSITIVE_INFINITY,
        stamp: null,
        blob: null,
        note: "Zeile\nmit | Pipe",
      },
      {
        id: 3,
        status: "constructor",
        payload: "[]",
        tags: null,
        flag: null,
        amount: 0,
        ratio: -0.5,
        stamp: "2026-02-30 25:61:00",
        blob: "",
        note: "🙂 ünïcödé",
      },
    ],
    CONNECTIONS[1],
  ),
];

export const TABS: readonly TabInfo[] = [
  ...SAMPLES.map((entry) => ({
    key: `table:${entry.table.id}`,
    kind: "table" as const,
    title: entry.table.name,
    connection: entry.table.connection,
    table: entry.table,
  })),
  { key: "query:1", kind: "query", title: "Abfrage 1", connection: CONNECTIONS[0], table: null },
  { key: "query:2", kind: "query", title: "Entwurf", connection: CONNECTIONS[1], table: null },
  { key: "other:1", kind: "other", title: "Dashboard", connection: null, table: null },
];
