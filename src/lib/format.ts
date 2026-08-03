/**
 * Presentation helpers.
 *
 * Everything here reads the ambient locale (`i18n/ambient.ts`) rather than a
 * hook, so the store and the pure engine can format from outside the React
 * tree and still produce exactly what the tree produces.
 *
 * Nothing in this file reads the real clock — `asOf` is always passed in.
 */

import { serDate } from "../data/demo.ts";
import {
  locale,
  number as ambientNumber,
  t,
  tOr,
} from "../i18n/ambient.ts";
import type { MessageKey } from "../i18n/messages/index.ts";

/** Resolve a seed field that stores an i18n key; pass literal text through. */
export function label(key: string): string {
  return tOr(key, key);
}

export function number(value: number, opts?: Intl.NumberFormatOptions): string {
  return ambientNumber(value, opts);
}

/**
 * A day count. Leave accrues in quarters, so 12.25 must show its fraction
 * while 10 must not show ".00" — a balance card reading "10.00 days" looks
 * like a rounding bug even when it is not.
 */
export function days(value: number): string {
  return ambientNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function percent(fraction: number, digits = 0): string {
  return ambientNumber(fraction, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* --------------------------------------------------------------------- dates */

/**
 * Serials are UTC midnights, so every formatter here is pinned to UTC. Without
 * it a reader west of Greenwich sees every date shift back by one day.
 */
function fmt(serial: number, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: "UTC" }).format(
    serDate(serial),
  );
}

/** "28 Jul" — chips and compact rows. */
export function dateShort(serial: number): string {
  return fmt(serial, { day: "numeric", month: "short" });
}

/** "28 July 2026" — headers and fact rails. */
export function dateLong(serial: number): string {
  return fmt(serial, { day: "numeric", month: "long", year: "numeric" });
}

/** "Tuesday, 28 July 2026" — the Home greeting. */
export function dateFull(serial: number): string {
  return fmt(serial, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "August 2026" — the calendar's month switcher. */
export function monthLong(year: number, month: number): string {
  const serial = Math.round(Date.UTC(year, month - 1, 1) / 86_400_000);
  return fmt(serial, { month: "long", year: "numeric" });
}

/** The day-of-month number, localised (Arabic-Indic digits under ar-EG). */
export function dayNumber(serial: number): string {
  return fmt(serial, { day: "numeric" });
}

/** Narrow weekday initials for the calendar header, Monday first. */
export function weekdayInitials(): string[] {
  const fmtDay = new Intl.DateTimeFormat(locale(), {
    weekday: "short",
    timeZone: "UTC",
  });
  // 5 Jan 1970 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmtDay.format(new Date((4 + i) * 86_400_000)));
}

/**
 * A date range. Same day collapses to one date; the same month collapses the
 * repeated month name, which is what stops "8 Jun – 12 Jun 2026" reading like
 * two unrelated dates.
 */
export function dateRange(start: number, end: number): string {
  if (start === end) return dateLong(start);
  const startParts = new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return t("chrome.range", {
    from: startParts.format(serDate(start)),
    to: dateLong(end),
  });
}

/** "12 working days" / "1 working day". */
export function workingDaysLabel(count: number): string {
  return t("chrome.workingDays", { count: days(count) }, count);
}

/** Two-letter initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* --------------------------------------------------------------------- tints */

function toRgb(hex: string): [number, number, number] {
  let h = (hex || "#0e7490").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** The layered gradient every avatar uses in place of photography. */
export function tileBackground(hex: string, dark: boolean, angle = "150deg"): string {
  const highlight = dark
    ? "radial-gradient(120% 84% at 50% 0%, rgba(255,255,255,.07), transparent 56%)"
    : "radial-gradient(120% 84% at 50% 0%, rgba(255,255,255,.6), transparent 58%)";
  const glow = `radial-gradient(58% 46% at 72% 88%, ${rgba(hex, dark ? 0.3 : 0.2)}, transparent 72%)`;
  const base = `linear-gradient(${angle}, ${rgba(hex, dark ? 0.34 : 0.22)}, ${rgba(hex, dark ? 0.12 : 0.07)})`;
  return `${highlight}, ${glow}, ${base}`;
}

export { t };
export type { MessageKey };
