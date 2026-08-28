/**
 * THE ONE PLACE IN THIS APP'S PRODUCTION SOURCE THAT NAMES AN ADD-ON.
 *
 * ── WHAT THAT CLAIM MEANS, PRECISELY ────────────────────────────────────────
 *
 * Not "no file in `src/`" — that version of the claim is false in every host
 * that has ever written it down, and a false claim in a header is worse than
 * none, because it is the thing a reviewer checks instead of the code. The
 * suites below `src/` name add-ons on purpose: a suite that asserted the seam
 * without ever naming what is on the far side of it would be asserting nothing.
 *
 * What is true, and what acceptance criterion 5 actually needs, is that no
 * SHIPPED module outside `./vendor/` and the import lines below mentions one.
 * The add-on's name, its short name, its monogram, its category, its settings,
 * its defaults, the words on its own form, its eight-locale strings, its seeded
 * activity, its disconnect copy and its not-affiliated statement all arrive
 * inside the object `register()` returns. Swapping it for a different day-set
 * add-on is two lines here and a re-run of `scripts/sync-add-ons.sh`.
 *
 * ── AND THE SECOND IMPORT, WHICH IS THE REASON THIS APP INSTALLED THE SEAM ──
 *
 * `nonWorkingDays` and `epochDayOf` are NOT part of the `AddOn` object, and
 * they are the whole point of the add-on: it exists to hand this app a list of
 * days. A read surface that travelled on the add-on object would have to be a
 * member of the shared contract — every add-on carrying a `days()` whether or
 * not it has days — which is the shape the contract refuses on principle.
 *
 * So it is a plain function import, and it is HERE rather than in the store or
 * in a screen for exactly the reason the paragraph above gives: this file is
 * where an add-on may be named, and `addOnHolidays()` below is the only thing
 * the rest of the app calls. Nothing downstream of it knows an add-on exists.
 *
 * ── `./vendor/` IS A SYNCED COPY, NOT A FORK ────────────────────────────────
 *
 * The add-ons are one repository — `add-ons`, a package each — and this app is
 * standalone, so there is no npm package tying them together and the build gets
 * a copy. Every vendored file says so in its own header. Edit the package and
 * re-run `scripts/sync-add-ons.sh`, which ships in this repo so a cloner and CI
 * can both run it; a hand-edit under `vendor/` is invisible until it is a bug
 * in two places at once.
 *
 * `./vendor/host/` is the add-ons' shared contract, vendored alongside them
 * because their sources import it and this app has no node_modules entry that
 * could resolve it. It is vendored EXACTLY ONCE, which the host kit's
 * vendored-copy guard asserts by counting declarations of `interface AddOn`
 * rather than by checking a path: three add-on repositories each keeping their
 * own copy is how that interface came to have 19 members in one and 18 in two
 * others with every suite green.
 */

import { registerAddOnMessages } from "../i18n/messages/index.ts";
import type { Holiday } from "../data/types.ts";
/*
 * TWO IMPORT STATEMENTS FROM ONE MODULE, and they are not merged on purpose.
 *
 * The first is the REGISTRATION LINE, and the brand gate recognises exactly
 * that shape — `import { register as <name> } from '<vendor>/<key>/index.ts';`
 * — as the one line of a host's own source allowed to name a company. This
 * add-on names none, so nothing here depends on the allowance today; merging
 * the two would quietly forfeit it for whatever is vendored next, and the
 * failure would arrive as a red gate on a correct file in somebody else's diff.
 *
 * The second is the READ SURFACE, which is a different thing from registering
 * an add-on and is the reason this app installed the seam at all.
 */
import { register as holidayCalendars } from "./vendor/holiday-calendars/index.ts";
import { epochDayOf, nonWorkingDays } from "./vendor/holiday-calendars/index.ts";
import {
  defaultSettingsFor,
  type AddOn,
  type AddOnSettings,
  type AddOnSettingValues,
} from "./vendor/host/index.ts";

/**
 * Registered once, at module load, because REGISTRATION IS WHERE THE MESSAGES
 * ARRIVE.
 *
 * An add-on's strings travel on the add-on object and are merged here rather
 * than being imported by `i18n/messages/index.ts` and type-unioned into this
 * app's own `MessageKey` — which would have made this app's key vocabulary
 * depend on which add-ons happened to be vendored. Doing it at module load
 * rather than in a mount effect is deliberate: this module is imported by the
 * store, which every screen imports, so the merge is complete before the first
 * render reads a bundle. What moved from compile time to registration time is
 * set out in full in `i18n/messages/index.ts`, beside the check that replaced
 * the type.
 */
const CALENDARS: AddOn = holidayCalendars();

const REGISTERED: readonly AddOn[] = [CALENDARS];

for (const addOn of REGISTERED) {
  if (addOn.messages !== undefined) registerAddOnMessages(addOn.key, addOn.messages);
}

/** Everything the add-ons screen shows. */
export function demoAddOns(): AddOn[] {
  return [...REGISTERED];
}

/**
 * What every add-on starts from, keyed by add-on key and OPAQUE to this app.
 *
 * The values inside are the add-on's own document in the add-on's own shape.
 * This app holds them, hands them back through the settings panel's `patch`,
 * and never reads inside one — the one exception being `addOnHolidays()` below,
 * which does not read inside one either: it passes the whole opaque record to
 * the add-on's own reader and gets plain data back.
 */
export const DEFAULT_ADD_ON_SETTINGS: AddOnSettings = defaultSettingsFor(REGISTERED);

/** The keys the add-ons screen puts a switch against. */
export const ADD_ON_KEYS: readonly string[] = REGISTERED.map((a) => a.key);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  THE MERGE                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * THE ADD-ONS THAT KNOW ABOUT DAYS THE BUSINESS DOES NOT WORK.
 *
 * A table rather than one call, because the shape of the question is "which of
 * the registered add-ons has days" and the honest answer today is "one". A
 * second day-set add-on is a row here and nothing else — the merge below,
 * `Holiday`, the leave engine and all nine holiday call sites are already
 * written for a list.
 *
 * THE KEY IS READ OFF THE REGISTERED OBJECT rather than written out again. A
 * second spelling of an add-on's key is a second thing to keep in step, and the
 * one that goes stale is always the one in the file nobody opens.
 */
const DAY_PROVIDERS: readonly {
  key: string;
  days: (values: AddOnSettingValues | undefined) => readonly { date: string; name: string }[];
}[] = [{ key: CALENDARS.key, days: nonWorkingDays }];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EVERY DAY AN ENABLED ADD-ON SAYS THE BUSINESS IS CLOSED, IN THIS APP'S SHAPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── THE RULE THIS OBEYS, AND THE ONE IT REFUSES TO BREAK ────────────────────
 *
 * An add-on's settings panel writes THE ADD-ON'S OWN VALUES. It does not write
 * this app's tables, it cannot, and there is no slot in the closed registry
 * that would let it. So an import lands in the add-on's own document, and THIS
 * APP MERGES what it finds into what it hands its own engine, here, at the
 * mount site. Neither side reaches into the other's storage: the add-on says
 * what it knows in its own shape, and this function says what that means in
 * ours.
 *
 * The literal-rows version — an add-on inserting into a `holidays` table — is
 * the add-on RUNTIME, which does not exist yet. Simulating it by writing rows
 * into the seed would be a demo pretending to be a mechanism, which is the one
 * thing this whole layer is built not to do.
 *
 * ── WHY THE LEAVE ENGINE NEEDED NO CHANGE AT ALL ────────────────────────────
 *
 * `holidayOn`, `isWorkday` and `workingDays` in `lib/leave.ts` each take the
 * holidays array as an ARGUMENT. They were written that way before any of this
 * existed, and it is why a diff that touches `lib/leave.ts` would be a diff
 * that had misunderstood the job: every leave balance, every skipped-day list
 * and every calendar cell in the app comes off whatever array it is handed.
 * This function changes the array. Nothing else has to know.
 *
 * ── AND WHY IT IS TOTAL, AND EMPTY IS THE ORDINARY CASE ─────────────────────
 *
 * With nothing enabled, with nothing registered, or with an add-on that has
 * imported nothing, this returns `[]` and `mergeHolidays` below hands back the
 * app's own array UNCHANGED — by identity, not by value. That is 24 D6 written
 * as a return value: with the add-on off, this app is not merely equivalent to
 * the one that shipped before the seam, it is running the same array object.
 *
 * `epochDayOf` returning `null` for a date that is not a real calendar day is
 * the one drop, and it is the add-on's own converter rather than one written
 * here — a host writing that conversion for itself is a host with a chance of
 * writing it in a timezone, and a leave balance that moves by one day depending
 * on where the reader is sitting is the worst defect this app could have.
 */
export function addOnHolidays(
  settings: AddOnSettings,
  enabled: ReadonlySet<string>,
): Holiday[] {
  const out: Holiday[] = [];
  for (const provider of DAY_PROVIDERS) {
    if (!enabled.has(provider.key)) continue;
    for (const day of provider.days(settings[provider.key])) {
      const serial = epochDayOf(day.date);
      if (serial === null) continue;
      out.push({ serial, name: day.name, fromAddOn: provider.key });
    }
  }
  return out;
}

/**
 * THE APP'S OWN HOLIDAYS, PLUS WHATEVER AN ADD-ON ADDED, DEDUPED BY DAY.
 *
 * ── THE APP'S OWN ROW WINS A SHARED DATE, AND THAT IS NOT ARBITRARY ─────────
 *
 * `holidayOn` is a `.find()`, so on a date carrying two rows the one a reader
 * sees would otherwise depend on which array was concatenated first — a
 * difference nobody can see in a diff and one that changes what a name on a
 * leave form says. Two rows for one day is an AMBIGUITY, and the add-on already
 * refuses to resolve one inside its own storage for the same reason; across
 * this seam it is this app's to resolve, and it resolves it towards the row it
 * can vouch for: its own seed.
 *
 * The arithmetic is unaffected either way — `workingDays` asks whether a serial
 * is a holiday once, so a duplicate never double-counts — which is exactly why
 * the defect would have been invisible until somebody read the holidays panel
 * and found Christmas listed twice under two names.
 *
 * ── IDENTITY, NOT EQUALITY, WHEN NOTHING WAS ADDED ──────────────────────────
 *
 * The early return is the D6 guarantee in one line: no add-on days means the
 * caller gets back the very array it passed in, so every downstream memo,
 * comparison and render behaves precisely as it did before this file existed.
 * A `[...base]` here would be equal and not identical, and "equal" is a claim
 * somebody has to check on every screen.
 */
export function mergeHolidays(base: Holiday[], extra: readonly Holiday[]): Holiday[] {
  if (extra.length === 0) return base;
  const taken = new Set(base.map((h) => h.serial));
  const added = extra.filter((h) => !taken.has(h.serial));
  if (added.length === 0) return base;
  return [...base, ...added].sort((a, b) => a.serial - b.serial);
}
