/**
 * The leave engine.
 *
 * Working days, accrual, balances and the approval chain — all derived, none
 * stored. A stored balance is a balance that disagrees with the requests it
 * was computed from the moment one of them is cancelled.
 *
 * Pure and React-free, so the vitest suite exercises the real thing. Anything
 * that needs a "today" takes it as an argument; the app passes `TODAY` from
 * `data/demo.ts`, the tests pass whatever the case needs.
 *
 * All dates are DAY SERIALS (whole days since the epoch, UTC). Leave is
 * counted in whole days and a serial cannot drift across a timezone boundary.
 */

import { LEAVE_TYPES, fromSer } from "../data/demo.ts";
import type {
  Holiday,
  LeaveRequest,
  LeaveTypeKey,
  Person,
  RequestStatus,
} from "../data/types.ts";

/** Requests longer than this many working days need a second approval step. */
export const TWO_STEP_THRESHOLD = 5;

export function isWeekend(serial: number): boolean {
  const dow = fromSer(serial).dow;
  return dow === 0 || dow === 6;
}

export function holidayOn(serial: number, holidays: Holiday[]): Holiday | null {
  return holidays.find((h) => h.serial === serial) ?? null;
}

export function isWorkday(serial: number, holidays: Holiday[]): boolean {
  return !isWeekend(serial) && holidayOn(serial, holidays) === null;
}

export interface SkippedDay {
  serial: number;
  /** Either the literal "weekend" or the holiday's i18n name key. */
  why: string;
}

export interface WorkingDays {
  count: number;
  /** Every day the range covered but did not charge for, in order. */
  skipped: SkippedDay[];
}

/**
 * Working days in the inclusive range, excluding weekends and public
 * holidays. The skipped list is returned alongside the count because the
 * request form shows the reader exactly what was not counted — a number with
 * no explanation is what makes people distrust a leave system.
 */
export function workingDays(
  start: number,
  end: number,
  holidays: Holiday[],
): WorkingDays {
  if (end < start) return { count: 0, skipped: [] };

  let count = 0;
  const skipped: SkippedDay[] = [];

  for (let s = start; s <= end; s += 1) {
    const holiday = holidayOn(s, holidays);
    if (isWeekend(s)) skipped.push({ serial: s, why: "weekend" });
    else if (holiday !== null) skipped.push({ serial: s, why: holiday.name });
    else count += 1;
  }

  return { count, skipped };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * How much of the year's entitlement has been earned by `asOf`.
 *
 * `upfront` types grant the whole year on 1 January. `monthly` types grant
 * `perMonth` on the first of each month, so on 28 July seven grants have
 * landed — which is what makes the balance card read "12.25 of 21 accrued as
 * of Jul 28" rather than a flat figure.
 */
export function accruedAsOf(type: LeaveTypeKey, asOf: number): number {
  const t = LEAVE_TYPES[type];
  if (t.policy === "upfront") return t.annual;
  const months = fromSer(asOf).m;
  return Math.min(t.annual, round2((t.perMonth ?? 0) * months));
}

/** Statuses that consume entitlement — a rejected or cancelled day does not. */
const CONSUMES: RequestStatus[] = ["approved", "pending"];

export interface Balance {
  accrued: number;
  /** Working days already approved. */
  used: number;
  /** Working days requested but not yet decided. */
  pending: number;
  /** What is left once pending requests are honoured. */
  remaining: number;
  annual: number;
}

/**
 * One person's balance for one leave type, as of `asOf`.
 *
 * Pending days count against the balance. Showing a rosier number and then
 * refusing the request later is the failure mode this chooses to avoid.
 */
export function balanceFor(
  personId: string,
  type: LeaveTypeKey,
  requests: LeaveRequest[],
  holidays: Holiday[],
  asOf: number,
): Balance {
  const accrued = accruedAsOf(type, asOf);
  let used = 0;
  let pending = 0;

  for (const r of requests) {
    if (r.person !== personId || r.type !== type) continue;
    if (!CONSUMES.includes(r.status)) continue;
    const days = workingDays(r.start, r.end, holidays).count;
    if (r.status === "approved") used += days;
    else pending += days;
  }

  return {
    accrued,
    used,
    pending,
    remaining: round2(accrued - used - pending),
    annual: LEAVE_TYPES[type].annual,
  };
}

/* ------------------------------------------------------------ the chain */

export interface ChainStep {
  /** Person id of whoever owes this step a decision. */
  approver: string | null;
  /** i18n key describing the step's role. */
  roleKey: "chain.manager" | "chain.peopleOps";
}

/**
 * Who must approve a request of `days` working days.
 *
 * Five working days or fewer: the manager alone. More than five: the manager,
 * then People ops. The form previews this BEFORE submission, so nobody
 * discovers the second step by waiting for it.
 */
export function approvalChain(
  days: number,
  person: Person | undefined,
  hrPersonId: string,
): ChainStep[] {
  const manager: ChainStep = {
    approver: person?.mgr ?? null,
    roleKey: "chain.manager",
  };
  if (days <= TWO_STEP_THRESHOLD) return [manager];
  return [manager, { approver: hrPersonId, roleKey: "chain.peopleOps" }];
}

/** How many steps a request needs, from its own dates. */
export function stepsNeeded(
  request: Pick<LeaveRequest, "start" | "end">,
  holidays: Holiday[],
): number {
  return workingDays(request.start, request.end, holidays).count >
    TWO_STEP_THRESHOLD
    ? 2
    : 1;
}

/** True when every step of the chain has signed. */
export function isFullyApproved(
  request: LeaveRequest,
  holidays: Holiday[],
): boolean {
  return request.step >= stepsNeeded(request, holidays);
}

/* --------------------------------------------------------- validation */

export type SubmitBlock =
  | { ok: true; days: number }
  | { ok: false; reason: "empty" | "past" | "nonWorking" | "insufficient"; short?: number };

/**
 * Can this request be submitted? Returns a REASON rather than a boolean, so
 * the form can disable the button and say why instead of hiding it.
 */
export function validateRequest(
  personId: string,
  type: LeaveTypeKey,
  start: number | null,
  end: number | null,
  requests: LeaveRequest[],
  holidays: Holiday[],
  asOf: number,
): SubmitBlock {
  if (start === null || end === null || end < start) {
    return { ok: false, reason: "empty" };
  }
  if (start < asOf) return { ok: false, reason: "past" };

  const days = workingDays(start, end, holidays).count;
  if (days === 0) return { ok: false, reason: "nonWorking" };

  const balance = balanceFor(personId, type, requests, holidays, asOf);
  if (days > balance.remaining) {
    return {
      ok: false,
      reason: "insufficient",
      short: round2(days - balance.remaining),
    };
  }

  return { ok: true, days };
}

/* ------------------------------------------------------------- queries */

/** Requests awaiting a decision, oldest submission first. */
export function pendingQueue(requests: LeaveRequest[]): LeaveRequest[] {
  return requests
    .filter((r) => r.status === "pending")
    .sort((a, b) => {
      const aAt = a.events[0]?.at ?? 0;
      const bAt = b.events[0]?.at ?? 0;
      return aAt - bAt;
    });
}

/** Everyone whose approved leave covers `day`. */
export function outOn(
  day: number,
  requests: LeaveRequest[],
  people: Person[],
): { person: Person; type: LeaveTypeKey }[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return requests
    .filter((r) => r.status === "approved" && r.start <= day && day <= r.end)
    .flatMap((r) => {
      const person = byId.get(r.person);
      return person ? [{ person, type: r.type }] : [];
    });
}

/** The next approved future leave for one person, or null. */
export function nextTimeOff(
  personId: string,
  requests: LeaveRequest[],
  asOf: number,
): LeaveRequest | null {
  return (
    requests
      .filter(
        (r) => r.person === personId && r.status === "approved" && r.end >= asOf,
      )
      .sort((a, b) => a.start - b.start)[0] ?? null
  );
}

/** Public holidays from `asOf` to the end of the quarter it sits in. */
export function holidaysThisQuarter(
  holidays: Holiday[],
  asOf: number,
): Holiday[] {
  const { y, m } = fromSer(asOf);
  const quarterEndMonth = Math.ceil(m / 3) * 3;
  // First day of the month after the quarter ends.
  const limit =
    quarterEndMonth === 12
      ? Date.UTC(y + 1, 0, 1)
      : Date.UTC(y, quarterEndMonth, 1);
  const limitSerial = Math.round(limit / 86_400_000);
  return holidays
    .filter((h) => h.serial >= asOf && h.serial < limitSerial)
    .sort((a, b) => a.serial - b.serial);
}

/** Mint the next request code from the highest one already issued. */
export function nextCode(requests: LeaveRequest[]): string {
  const highest = requests.reduce((max, r) => {
    const n = Number.parseInt(r.code.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `LR-${highest + 1}`;
}

/* ------------------------------------------------------------ calendar */

export interface CalendarCell {
  serial: number;
  /** False for the leading/trailing days that pad the grid to whole weeks. */
  inMonth: boolean;
  weekend: boolean;
  holiday: Holiday | null;
  /** Everyone away that day, approved and pending alike. */
  absences: { person: Person; type: LeaveTypeKey; pending: boolean }[];
}

/**
 * A month grid, padded to whole Monday-start weeks.
 *
 * Pending absences are included but flagged, so the legend can mark them as
 * not-yet-confirmed rather than pretending the month is more settled than it
 * is.
 */
export function monthGrid(
  year: number,
  month: number,
  requests: LeaveRequest[],
  people: Person[],
  holidays: Holiday[],
): CalendarCell[] {
  const first = Math.round(Date.UTC(year, month - 1, 1) / 86_400_000);
  const last = Math.round(Date.UTC(year, month, 0) / 86_400_000);

  // Monday-start: Sunday (0) sits at the end of the week, so it pads by 6.
  const leading = (fromSer(first).dow + 6) % 7;
  const start = first - leading;
  const totalCells = Math.ceil((last - start + 1) / 7) * 7;

  const byId = new Map(people.map((p) => [p.id, p]));

  return Array.from({ length: totalCells }, (_, i) => {
    const serial = start + i;
    const absences = requests
      .filter(
        (r) =>
          (r.status === "approved" || r.status === "pending") &&
          r.start <= serial &&
          serial <= r.end,
      )
      .flatMap((r) => {
        const person = byId.get(r.person);
        return person
          ? [{ person, type: r.type, pending: r.status === "pending" }]
          : [];
      });

    return {
      serial,
      inMonth: serial >= first && serial <= last,
      weekend: isWeekend(serial),
      holiday: holidayOn(serial, holidays),
      absences,
    };
  });
}

/* --------------------------------------------------------- onboarding */

/** Completed fraction, 0–1. An empty checklist is 0, not NaN. */
export function onboardingProgress(tasks: { done: boolean }[]): number {
  if (tasks.length === 0) return 0;
  return tasks.filter((t) => t.done).length / tasks.length;
}
