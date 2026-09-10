/**
 * THE HOST KIT'S GUARDS, WIRED INTO THIS APP'S OWN SUITE.
 *
 * ── WHY THEY ARE CALLED AND NOT DISCOVERED ──────────────────────────────────
 *
 * Every guard below is a FACTORY that declares its own `describe`, and this
 * file is the whole of what a host writes: the config, the two fixtures it
 * happens to have, and one call each. The kit does not auto-discover them, and
 * that is deliberate — a guard that runs because a file exists is a guard that
 * stops running when a glob changes, silently, which is the exact failure mode
 * most of them were written to close.
 *
 * `tierGuard` is what stops this file quietly shrinking: it reads every suite
 * in this app, checks that each tier-1 guard's symbol is NAMED somewhere, and
 * fails by name if one is not. Deleting a line below is therefore a red suite
 * rather than a gap.
 *
 * ── AND THIS APP IS AT TIER 1, WHICH COSTS FOUR GUARDS ──────────────────────
 *
 * `host-kit.config.ts` records the decision and names all four, with the defect
 * each one closes. In short: this app has no React test tree at all — no
 * `jsdom`, no `.test.tsx`, nothing anywhere that renders a component — so the
 * four guards about PAINT and about what React actually called are not running.
 * The tier guard prints them, by name, on every single run. That is the
 * ratchet: a host may sit at tier 1, and it may not sit there quietly.
 */

import { describe, expect, it } from "vitest";

import { hostKit } from "./host-kit.config.ts";
import { demoAddOns } from "./registry.ts";
import { HOSTED_SLOTS } from "./slots.ts";
import { HOSTED_SLOTS as CLOSED_REGISTRY } from "./vendor/host/index.ts";
import { LOCALE_TAGS } from "../i18n/locales.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import {
  brandGuard,
  factsGuard,
  labelPairingSourceGuard,
  lexiconGuard,
  payloadCastsGuard,
  deliveryClaimsGuard,
  recordPayloadGuard,
  stylesGuard,
  tierGuard,
  vendoredGuard,
} from "../testing/kit/index.ts";

/**
 * Claims about a delivery this app has already answered for (34 D19).
 *
 * Filled in below, per key, with the argument being made — see
 * `testing/kit/delivery-claims.ts` for the three that are legitimate.
 */
const DELIVERY_CLAIMS: Record<string, string> = {};


/*
 * IMPORTING THE REGISTRY IS THE POINT, not a formality.
 *
 * `add-ons/registry.ts` merges every registered add-on's eight-locale bundle
 * into `MESSAGES` at MODULE LOAD. Without this call the lexicon gate would read
 * a bundle containing this app's own copy and none of the add-on's — and it
 * would pass, having checked half of what it is for. Calling `demoAddOns()`
 * rather than merely importing the module is what stops a bundler or a future
 * edit deciding the import was unused.
 */
const REGISTERED = demoAddOns();

describe("people-ops · the seam is registered before anything reads a bundle", () => {
  it("registered at least one add-on, so the scans below have something to read", () => {
    expect(REGISTERED.length).toBeGreaterThan(0);
  });

  it("merged every registered add-on's strings into every locale", () => {
    /*
     * THE GUARD ON THE GUARD for the lexicon scope below. A merge that stopped
     * happening would leave `bundleFor` returning this app's own copy, the
     * add-on half of the vocabulary check would be scanning nothing, and every
     * assertion in it would pass.
     */
    for (const addOn of REGISTERED) {
      const keys = Object.keys(addOn.messages?.["en-US"] ?? {});
      expect(keys.length, `${addOn.key} registered no English strings`).toBeGreaterThan(0);
      for (const locale of LOCALE_TAGS) {
        const missing = keys.filter((key) => (MESSAGES[locale][key] ?? "").trim() === "");
        expect(missing, `${addOn.key} · ${locale}`).toEqual([]);
      }
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*  THE SEVEN GUARDS THAT NEED NO DOM                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * The vocabulary ban, over the MERGED bundle.
 *
 * `bundleFor` hands over this app's own copy AND every registered add-on's,
 * because that is what a reader sees. The split between the two is by key
 * prefix and this app uses the kit's default: everything the retrofit
 * contributed is filed under `addon.`, which is why `i18n/strings/addOns.ts`
 * names its keys `addon.host.*` rather than the `addons.*` that reads better.
 * Copy on the wrong side of that split is REPORTED as pre-existing debt and can
 * never fail, which is a gate that looks exactly as green as a working one.
 */
lexiconGuard(hostKit, { bundleFor: (locale) => MESSAGES[locale as never] ?? {} });

/** No file of this app's own names a company, outside the registration lines. */
brandGuard(hostKit);

/** Every surface that prints an add-on's identity carries the line (24 AC6). */
labelPairingSourceGuard(hostKit);

/** No mount site casts past the payload contract. */
payloadCastsGuard(hostKit);

/** Each vendored add-on brings its own facts; none is written down in here. */
factsGuard(hostKit);

/** The vendored copies say they are copies, and resolve inside the tree. */
vendoredGuard(hostKit);

/** The two-condition cascade rule pair, in exactly one stylesheet. */
stylesGuard(hostKit);

/** The tier this app declared, and the cost of the one it did not take. */
/*
 * 34 D19. This app labels no simulation — it has no demo-marker convention at
 * all — so every claim it makes has to be answered in `claimsDeclared`, by
 * name, with the argument being made.
 */
deliveryClaimsGuard(hostKit, {
  bundleFor: (locale) => MESSAGES[locale as never] ?? {},
  demoLabels: {},
  claimsDeclared: DELIVERY_CLAIMS,
});
recordPayloadGuard(hostKit);

tierGuard(hostKit);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AND THE ONE THING TIER 1 CANNOT ASK, ASKED AS WEAKLY AS IT HONESTLY CAN    */
/* ─────────────────────────────────────────────────────────────────────────── */

describe("people-ops · the slot it says it hosts", () => {
  it("is a strict subset of the closed registry", () => {
    /*
     * The mis-import `host-kit.config.ts` warns about: `vendor/host/slots.ts`
     * exports the CLOSED REGISTRY under the same identifier this app uses for
     * its own list, and taking the wrong one widens every check downstream
     * instead of failing anything. `mountsGuard` makes this assertion too — and
     * `mountsGuard` needs a DOM, so at tier 1 it is not running and this stands
     * in its place for the half that needs no rendering.
     */
    const registry = CLOSED_REGISTRY as readonly string[];
    for (const slot of HOSTED_SLOTS) expect(registry).toContain(slot);
    expect(HOSTED_SLOTS.length).toBeLessThan(registry.length);
  });

  it("has an empty behaviour decided for it, and for nothing else", () => {
    expect(Object.keys(hostKit.slotEmptyBehaviour).sort()).toEqual([...HOSTED_SLOTS].sort());
  });
});
