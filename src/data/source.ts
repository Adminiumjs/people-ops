/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file
 * rather than a rewrite.
 *
 * That second implementation now exists: `adminiumSource.ts` reads a real
 * Adminium instance through `@adminiumjs/public-client` and is swapped in by
 * `main.tsx` before React mounts. `demoSource` remains the fallback whenever
 * either build-time env var is absent — which is the case for every
 * marketplace demo, and is why that fallback is structural rather than a catch.
 *
 * WHAT WAS WRONG HERE BEFORE (§5.3 called this seam "orphaned"): this file
 * existed and NOTHING imported it. Seven modules read `demo.ts` directly, so
 * swapping the source would have changed nothing on any screen. `live.ts` is
 * now the one place that reads it, and everything else reads `live.ts`.
 */

import {
  HOLIDAYS,
  LEAVE_TYPES,
  ONBOARDING,
  PEOPLE,
  SEED_REQUESTS,
  TODAY,
} from "./demo.ts";
import type {
  Holiday,
  LeaveRequest,
  LeaveType,
  LeaveTypeKey,
  NewHire,
  Person,
} from "./types.ts";

export interface DataSource {
  /** The pinned clock, as a day serial. A live deployment returns the real one. */
  now(): number;
  people(): Person[];
  leaveTypes(): Record<LeaveTypeKey, LeaveType>;
  holidays(): Holiday[];
  requests(): LeaveRequest[];
  hires(): NewHire[];
}

/**
 * Arrays are copied on the way out, nested arrays included. A caller that
 * mutates what it is given cannot reach back into the seed, which is what lets
 * the demo reset cleanly.
 */
export const demoSource: DataSource = {
  now: () => TODAY,
  people: () => PEOPLE.map((p) => ({ ...p })),
  leaveTypes: () => ({ ...LEAVE_TYPES }),
  holidays: () => HOLIDAYS.map((h) => ({ ...h })),
  requests: () => SEED_REQUESTS.map((r) => ({ ...r, events: r.events.map((e) => ({ ...e })) })),
  hires: () => ONBOARDING.map((h) => ({ ...h, tasks: h.tasks.map((t) => ({ ...t })) })),
};

let current: DataSource = demoSource;
let read = false;

/**
 * The source the app is currently wired to.
 *
 * An indirection rather than a `let`, because `live.ts` reads it at MODULE
 * SCOPE — a re-exported binding would be captured at import time and a later
 * swap would change nothing.
 */
export const source: DataSource = {
  now: () => ((read = true), current.now()),
  people: () => ((read = true), current.people()),
  leaveTypes: () => ((read = true), current.leaveTypes()),
  holidays: () => ((read = true), current.holidays()),
  requests: () => ((read = true), current.requests()),
  hires: () => ((read = true), current.hires()),
};

/**
 * Swap the backing source. Must happen before any module-scope read.
 *
 * The tripwire is the whole reason this is a function and not an assignment:
 * the ordering it depends on is invisible, and getting it wrong fails SILENTLY
 * — the app renders demo data against a configured backend and looks fine.
 */
export function setDataSource(next: DataSource): void {
  if (read) {
    throw new Error(
      "setDataSource() called after the store already read — import App dynamically, after the snapshot resolves.",
    );
  }
  current = next;
}

/**
 * True once a real backend is behind the seam.
 *
 * Read by the demo dock, which resets and advances seeded fiction: against real
 * rows those controls either lie or do damage, so it does not render.
 */
export function isConnected(): boolean {
  return current !== demoSource;
}
