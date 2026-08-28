// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The data every screen reads, taken from the seam exactly once.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * §5.3 recorded this repo's seam as ORPHANED: `source.ts` was written, and
 * nothing imported it. Seven modules — four screens, two components and
 * `lib/leave.ts` — reached past it into `data/demo.ts`, so swapping the source
 * would have changed nothing anybody could see. That is the failure mode the
 * seam exists to prevent, and it was invisible because the app worked.
 *
 * So there is now exactly ONE reader of `source`, here, and everything else
 * reads these bindings. Read at module scope, which is what makes the boot
 * ordering in `main.tsx` load-bearing: the swap has to happen before this
 * module is evaluated, and `setDataSource` throws if it does not.
 *
 * Helpers and closed vocabularies (`fromSer`, `ser`, `LEAVE_TYPE_KEYS`,
 * `TEAMS`, `ME`, `HR_PERSON`) still come from `demo.ts` — they are code and
 * constants, not rows, and a backend has nothing to say about them.
 */

import { source } from "./source.ts";

/** Today, as a day serial. */
export const TODAY = source.now();

export const PEOPLE = source.people();
export const LEAVE_TYPES = source.leaveTypes();
export const HOLIDAYS = source.holidays();
export const SEED_REQUESTS = source.requests();
export const ONBOARDING = source.hires();
