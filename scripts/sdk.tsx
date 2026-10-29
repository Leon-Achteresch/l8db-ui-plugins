import type { ReactNode } from "react";
import {
  asDate,
  asNumber,
  asText,
  daysFromToday,
  definePlugin,
  formatDate,
  formatNumber,
  relativeTime,
} from "../sdk/src/helpers";

const TONES = new Set(["neutral", "info", "success", "warning", "danger"]);

function tone(value: unknown) {
  if (value !== undefined && !TONES.has(value as string))
    throw new Error(`Ton "${String(value)}" gibt es nicht. Erlaubt: ${[...TONES].join(", ")}.`);
  return (value as string | undefined) ?? "neutral";
}

function finite(value: unknown, name: string) {
  if (typeof value !== "number") throw new Error(`${name} muss eine Zahl sein.`);
  return value;
}

type Children = { children?: ReactNode };

export const STUB_SDK: Readonly<Record<string, unknown>> = {
  definePlugin,
  asText,
  asNumber,
  asDate,
  daysFromToday,
  formatNumber,
  formatDate,
  Pill: ({ tone: value, children }: Children & { tone?: unknown }) => (
    <span data-sdk="Pill" data-tone={tone(value)}>
      {children}
    </span>
  ),
  Badge: ({ tone: value, children }: Children & { tone?: unknown }) => (
    <span data-sdk="Badge" data-tone={tone(value)}>
      {children}
    </span>
  ),
  Check: ({ checked, label }: { checked: boolean; label?: string }) => (
    <span data-sdk="Check" data-checked={String(Boolean(checked))}>
      {label}
    </span>
  ),
  RelativeTime: ({ value }: { value: unknown }) => {
    const date = asDate(value);
    return <time data-sdk="RelativeTime">{date ? relativeTime(date) : "–"}</time>;
  },
  Text: ({ tone: value, children }: Children & { tone?: unknown }) => (
    <span data-sdk="Text" data-tone={value === "muted" ? "muted" : tone(value)}>
      {children}
    </span>
  ),
  Stack: ({ children }: Children) => <div data-sdk="Stack">{children}</div>,
  Button: ({ tone: value, children, onClick }: Children & { tone?: unknown; onClick?: unknown }) => {
    if (onClick !== undefined && typeof onClick !== "function")
      throw new Error("Button.onClick muss eine Funktion sein.");
    return (
      <button type="button" data-sdk="Button" data-tone={tone(value)}>
        {children}
      </button>
    );
  },
  Card: ({ title, tone: value, children }: Children & { title?: ReactNode; tone?: unknown }) => (
    <section data-sdk="Card" data-tone={tone(value)}>
      {title}
      {children}
    </section>
  ),
  Columns: ({ children }: Children) => <div data-sdk="Columns">{children}</div>,
  Bar: ({
    value,
    max,
    tone: color,
    label,
  }: {
    value: unknown;
    max: unknown;
    tone?: unknown;
    label?: ReactNode;
  }) => (
    <span
      data-sdk="Bar"
      data-tone={tone(color)}
      data-value={finite(value, "Bar.value")}
      data-max={finite(max, "Bar.max")}
    >
      {label}
    </span>
  ),
  List: ({
    items,
    render,
    limit = 100,
    empty,
  }: {
    items: readonly unknown[];
    render: (item: unknown, index: number) => ReactNode;
    limit?: number;
    empty?: ReactNode;
  }) => {
    if (!Array.isArray(items)) throw new Error("List.items muss eine Liste sein.");
    if (typeof render !== "function") throw new Error("List.render muss eine Funktion sein.");
    const max = Math.max(1, Math.min(1000, Math.trunc(limit) || 100));
    return (
      <ul data-sdk="List">
        {items.length === 0
          ? empty
          : items.slice(0, max).map((item, index) => <li key={index}>{render(item, index)}</li>)}
      </ul>
    );
  },
  Board: ({
    columns,
    render,
    limit = 50,
  }: {
    columns: readonly { id: string; label: string; tone?: unknown; items: readonly unknown[] }[];
    render: (item: unknown) => ReactNode;
    limit?: number;
  }) => {
    if (!Array.isArray(columns)) throw new Error("Board.columns muss eine Liste sein.");
    if (typeof render !== "function") throw new Error("Board.render muss eine Funktion sein.");
    const max = Math.max(1, Math.min(500, Math.trunc(limit) || 50));
    return (
      <div data-sdk="Board">
        {columns.slice(0, 20).map((column) => {
          const items: readonly unknown[] = column.items;
          if (!Array.isArray(items))
            throw new Error(`Board-Spalte "${column.id}" braucht items als Liste.`);
          return (
            <section key={column.id} data-tone={tone(column.tone)}>
              {column.label}
              {items.slice(0, max).map((item, index) => (
                <div key={index}>{render(item)}</div>
              ))}
            </section>
          );
        })}
      </div>
    );
  },
  Empty: ({ children }: Children) => <p data-sdk="Empty">{children}</p>,
};
