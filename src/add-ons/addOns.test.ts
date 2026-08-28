/**
 * WHAT THE SEAM ACTUALLY DOES TO THIS APP — asserted against the real engine.
 *
 * ── WHAT THIS FILE IS FOR, AND WHAT IT IS NOT ───────────────────────────────
 *
 * `hostKit.test.ts` runs the kit's guards, which are about the SHAPE of the
 * retrofit: no company named, no cast at a mount site, the cascade rule
 * present, the vendored copies honest. None of them can tell you whether
 * connecting an add-on changes a leave balance, and that is the only thing
 * anybody using this app would notice.
 *
 * So this file drives the real store, the real merge and the real leave engine,
 * and asserts the four claims the retrofit makes:
 *
 *   1. WITH THE ADD-ON OFF, NOTHING CHANGED (24 D6) — and not "changed
 *      equivalently": the app gets back the very array it had before.
 *   2. AN IMPORTED DAY IS REAL HOST ARITHMETIC. The working-day count moves,
 *      through `lib/leave.ts`, unmodified.
 *   3. A DAY THIS APP ALREADY KNOWS IS NOT DUPLICATED.
 *   4. DISCONNECTING KEEPS THE DATA (24 D16), and reconnecting proves it.
 *
 * ── THE ONE THING THIS FILE DOES THAT SHIPPED CODE MAY NOT ──────────────────
 *
 * It CONSTRUCTS an add-on settings document — `{ days: [{ date, name }] }` —
 * and hands it to `patchAddOnSettings`. That is the add-on's own storage shape,
 * and no shipped file in this app knows it or is allowed to: the store holds
 * these values opaquely and the only thing that ever reads inside one is the
 * add-on's own reader, called from `registry.ts`.
 *
 * A test is entitled to build one because it is standing in for the add-on's
 * own settings panel, which is the only thing that writes it, and because the
 * shape is not private: the add-on's manifest declares `days` as a `json`
 * setting and lists it in `publicSettings`, which is a package saying out loud
 * what it will write. The alternative was to drive the panel itself, which
 * needs a DOM this app does not have — see the tier decision in
 * `host-kit.config.ts`.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { addOnHolidays, demoAddOns, mergeHolidays } from "./registry.ts";
import { HOLIDAYS } from "../data/live.ts";
import { ser } from "../data/demo.ts";
import { registerAddOnMessages } from "../i18n/messages/index.ts";
import { holidayOn, workingDays } from "../lib/leave.ts";
import { useStore } from "../state/store.ts";

/**
 * The add-on this app ships, taken off the registry rather than named.
 *
 * A second spelling of an add-on's key in a test file is a second thing to keep
 * in step, and the one that goes stale is the one in the file nobody opens.
 */
const ADD_ON = demoAddOns()[0]!;

/** Wednesday 19 August 2026 — an ordinary working day in the seeded fiction. */
const IMPORTED = { date: "2026-08-19", name: "Ferragosto" };
const IMPORTED_SERIAL = ser(2026, 8, 19);

/** Monday 3 August 2026 — a day this app's own seed already calls a holiday. */
const ALREADY_KNOWN_SERIAL = ser(2026, 8, 3);

/** What the add-on's own settings panel writes when somebody imports a year. */
const daysDocument = (...days: { date: string; name: string }[]) => ({ days });

beforeEach(() => {
  /*
   * The store is a module singleton, so each case starts from the state a fresh
   * boot has: registered, and nothing switched on. `registerAddOns` is what
   * `main.tsx` calls once the snapshot has resolved.
   */
  useStore.setState({
    enabled: new Set<string>(),
    addOnSettings: {},
    holidays: HOLIDAYS,
    managingAddOn: null,
  });
  useStore.getState().registerAddOns(demoAddOns());
});

describe("with the add-on off, this is the app that shipped before the seam (24 D6)", () => {
  it("hands back the app's own holiday array, by identity", () => {
    /*
     * IDENTITY AND NOT EQUALITY, and the difference is the whole claim. A
     * `[...HOLIDAYS]` would be equal and not the same object, and "equal" is
     * something a reader has to go and check on every screen. This is the one
     * assertion that says the merge is genuinely inert.
     */
    expect(useStore.getState().holidays).toBe(HOLIDAYS);
    expect(mergeHolidays(HOLIDAYS, [])).toBe(HOLIDAYS);
  });

  it("contributes nothing while nothing is enabled, whatever is stored", () => {
    // Values present, add-on switched off: still nothing. `enabled` and the
    // settings document are separate facts, which is what makes D16 possible.
    useStore.getState().patchAddOnSettings(ADD_ON.key, daysDocument(IMPORTED));
    expect(useStore.getState().holidays).toBe(HOLIDAYS);
    expect(addOnHolidays({ [ADD_ON.key]: daysDocument(IMPORTED) }, new Set())).toEqual([]);
  });

  it("contributes nothing when an enabled add-on has imported nothing", () => {
    useStore.getState().connectAddOn(ADD_ON.key);
    expect(useStore.getState().holidays).toBe(HOLIDAYS);
  });
});

describe("an imported day is real arithmetic in this app's own engine", () => {
  beforeEach(() => {
    useStore.getState().connectAddOn(ADD_ON.key);
    useStore.getState().patchAddOnSettings(ADD_ON.key, daysDocument(IMPORTED));
  });

  it("arrives as a day serial, with the country's own name for it", () => {
    const day = holidayOn(IMPORTED_SERIAL, useStore.getState().holidays);
    expect(day).not.toBeNull();
    // The NAME IS A LITERAL, not an i18n key. `format.label()` falls back to
    // the raw string, which is what lets a German holiday keep its German name
    // without this app inventing eight translations of a proper noun.
    expect(day?.name).toBe(IMPORTED.name);
  });

  it("is marked as add-on-supplied, so every screen can say so", () => {
    expect(holidayOn(IMPORTED_SERIAL, useStore.getState().holidays)?.fromAddOn).toBe(ADD_ON.key);
    // …and the app's own seeded days are not marked, so they render exactly as
    // they did before this field existed.
    expect(holidayOn(ALREADY_KNOWN_SERIAL, useStore.getState().holidays)?.fromAddOn).toBeUndefined();
  });

  it("MOVES THE WORKING-DAY COUNT, through `lib/leave.ts` unmodified", () => {
    /*
     * THE CLAIM THE WHOLE RETROFIT RESTS ON. Monday 17 to Friday 21 August is
     * five working days in the app that shipped; with Wednesday imported it is
     * four, and the fifth is itemised BY NAME on the request form's summary.
     *
     * The engine is not touched by any of this: `workingDays` takes the array
     * as an argument and always did. That is why the retrofit's diff contains
     * no change to `lib/leave.ts`, and why a diff that changed it would be a
     * diff that had misunderstood the job.
     */
    const start = ser(2026, 8, 17);
    const end = ser(2026, 8, 21);

    const before = workingDays(start, end, HOLIDAYS);
    expect(before.count).toBe(5);

    const after = workingDays(start, end, useStore.getState().holidays);
    expect(after.count).toBe(4);
    expect(after.skipped.map((s) => s.why)).toContain(IMPORTED.name);
  });

  it("counts a day this app already knew only once, and keeps this app's name for it", () => {
    /*
     * TWO ROWS ON ONE DATE IS AN AMBIGUITY, and `holidayOn` is a `.find()`, so
     * whichever array was concatenated first would decide what a reader sees.
     * The arithmetic is unaffected either way, which is exactly why the defect
     * would have been invisible until somebody read the holidays panel and
     * found one day listed twice under two names.
     */
    useStore
      .getState()
      .patchAddOnSettings(
        ADD_ON.key,
        daysDocument(IMPORTED, { date: "2026-08-03", name: "Somebody else's name for it" }),
      );
    const merged = useStore.getState().holidays;
    expect(merged.filter((h) => h.serial === ALREADY_KNOWN_SERIAL)).toHaveLength(1);
    expect(holidayOn(ALREADY_KNOWN_SERIAL, merged)?.name).toBe("data.holiday.civic");
  });

  it("drops a date that is not a real calendar day rather than putting NaN on a calendar", () => {
    useStore
      .getState()
      .patchAddOnSettings(ADD_ON.key, daysDocument({ date: "2026-02-30", name: "Never" }));
    expect(useStore.getState().holidays.every((h) => Number.isFinite(h.serial))).toBe(true);
    expect(useStore.getState().holidays.some((h) => h.name === "Never")).toBe(false);
  });
});

describe("disconnecting removes the contribution and keeps the data (24 D16)", () => {
  beforeEach(() => {
    useStore.getState().connectAddOn(ADD_ON.key);
    useStore.getState().patchAddOnSettings(ADD_ON.key, daysDocument(IMPORTED));
  });

  it("takes the day off the calendar, back to the app's own array by identity", () => {
    expect(useStore.getState().holidays).not.toBe(HOLIDAYS);
    useStore.getState().disconnectAddOn(ADD_ON.key);
    expect(useStore.getState().holidays).toBe(HOLIDAYS);
    expect(holidayOn(IMPORTED_SERIAL, useStore.getState().holidays)).toBeNull();
  });

  it("does not touch one byte of what the add-on stored", () => {
    const before = useStore.getState().addOnSettings[ADD_ON.key];
    useStore.getState().disconnectAddOn(ADD_ON.key);
    expect(useStore.getState().addOnSettings[ADD_ON.key]).toEqual(before);
  });

  it("gives the whole list back on reconnecting, which is what makes the promise checkable", () => {
    const withDay = useStore.getState().holidays;
    useStore.getState().disconnectAddOn(ADD_ON.key);
    useStore.getState().connectAddOn(ADD_ON.key);
    expect(useStore.getState().holidays).toEqual(withDay);
  });

  it("says both halves in the add-on's own words, not in this app's", () => {
    /*
     * The drawer prints `disconnect.goesKey` and `disconnect.staysKey`, which
     * are the ADD-ON's keys in the ADD-ON's bundle. This app has a fallback pair
     * for an add-on that supplies neither — and an add-on that DOES supply them
     * must not silently fall through to it, because this app's sentence is
     * narrower than the truth the add-on can tell.
     */
    expect(ADD_ON.disconnect?.goesKey).toBeDefined();
    expect(ADD_ON.disconnect?.staysKey).toBeDefined();
  });

  it("survives a demo reset, which resets seeded fiction and not somebody's choices", () => {
    /*
     * `reset` raises a toast, and a toast schedules its own dismissal through
     * `window.setTimeout`. This app's suites run in plain node with no DOM (see
     * the tier decision in `host-kit.config.ts`), so the one browser API the
     * action reaches for is stubbed for the length of this case — a stub of one
     * method, rather than a DOM environment this app does not otherwise need.
     */
    const had = "window" in globalThis;
    (globalThis as { window?: unknown }).window = { setTimeout: () => 0 };
    try {
      const before = useStore.getState().addOnSettings[ADD_ON.key];
      useStore.getState().reset();
      expect(useStore.getState().addOnSettings[ADD_ON.key]).toEqual(before);
      expect(useStore.getState().enabled.has(ADD_ON.key)).toBe(true);
    } finally {
      if (!had) delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe("an add-on's strings arrive complete or the boot dies", () => {
  /*
   * The check that replaced a type. An add-on's keys are not members of this
   * app's `MessageKey`, so the compiler stopped checking them; this function
   * took the job over and it runs at module load on every boot, including the
   * demo, so it cannot be skipped the way a test can.
   */
  it("refuses a bundle with no English at all", () => {
    expect(() => registerAddOnMessages("x", { "de-DE": { "x.a": "A" } })).toThrow(/en-US/);
  });

  it("refuses a bundle missing a whole locale", () => {
    expect(() => registerAddOnMessages("x", { "en-US": { "x.a": "A" } })).toThrow(/missing the/);
  });

  it("refuses a bundle missing one key in one locale — the failure nobody notices", () => {
    const bundle: Record<string, Record<string, string>> = {};
    for (const locale of ["en-US", "de-DE", "fr-FR", "cs-CZ", "da-DK", "zh-CN", "zh-TW", "ar-EG"]) {
      bundle[locale] = { "x.a": "A", "x.b": "B" };
    }
    delete bundle["ar-EG"]!["x.b"];
    expect(() => registerAddOnMessages("x", bundle)).toThrow(/ar-EG.*x\.b/);
  });

  it("refuses a key that would overwrite this app's own copy", () => {
    const bundle: Record<string, Record<string, string>> = {};
    for (const locale of ["en-US", "de-DE", "fr-FR", "cs-CZ", "da-DK", "zh-CN", "zh-TW", "ar-EG"]) {
      bundle[locale] = { "addon.host.title": "Mine now" };
    }
    expect(() => registerAddOnMessages("x", bundle)).toThrow(/overwrite/);
  });
});
