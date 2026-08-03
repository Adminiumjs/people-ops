/**
 * The DataSource seam.
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file
 * rather than a rewrite.
 *
 * When `@adminium/manifest` lands (Phase B), a second implementation backed by
 * `AdminiumDataSource` slots in here and `demoSource` becomes the fallback
 * used when no `adm_pub_` key is configured.
 */

import {
  HOLIDAYS,
  LEAVE_TYPES,
  ONBOARDING,
  PEOPLE,
  SEED_REQUESTS,
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
  people: () => PEOPLE.map((p) => ({ ...p })),
  leaveTypes: () => ({ ...LEAVE_TYPES }),
  holidays: () => HOLIDAYS.map((h) => ({ ...h })),
  requests: () => SEED_REQUESTS.map((r) => ({ ...r, events: r.events.map((e) => ({ ...e })) })),
  hires: () => ONBOARDING.map((h) => ({ ...h, tasks: h.tasks.map((t) => ({ ...t })) })),
};

/** The source the app is currently wired to. */
export const source: DataSource = demoSource;
