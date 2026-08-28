/**
 * The message registry.
 *
 * The app's strings are split across three area modules under `../strings/` so
 * they can be authored without one enormous file. This module is the only
 * place that knows they are separate: it flattens them into one bundle per
 * locale, which is what the runtime looks keys up in.
 *
 * Keys must be unique across areas — a later area silently wins a collision,
 * so namespace them (`chrome.*`, `today.*`, `data.*`).
 */
import type { Translated } from "../untranslated.ts";
import { LOCALE_TAGS, type LocaleTag } from "../locales.ts";
import { addOns } from "../strings/addOns.ts";
import { chrome } from "../strings/chrome.ts";
import { screens } from "../strings/screens.ts";
import { data } from "../strings/data.ts";

/**
 * Parity guard. `en-US` defines the keys; the other seven must each carry a
 * string for every one of them. A translation module that is missing an English
 * key is a COMPILE error here rather than a silent per-key fallback to English
 * at runtime — which is the failure mode this whole layer exists to prevent.
 */
type Area<EN extends Record<string, string>> = { "en-US": EN } & Record<
  Exclude<LocaleTag, "en-US">,
  Translated<EN>
>;

const AREAS: [
  Area<(typeof chrome)["en-US"]>,
  Area<(typeof screens)["en-US"]>,
  Area<(typeof data)["en-US"]>,
  Area<(typeof addOns)["en-US"]>,
] = [chrome, screens, data, addOns];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey =
  | keyof (typeof chrome)["en-US"]
  | keyof (typeof screens)["en-US"]
  | keyof (typeof data)["en-US"]
  | keyof (typeof addOns)["en-US"];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AN ADD-ON'S STRINGS ARRIVE AT REGISTRATION                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

/** One add-on's bundle, as it travels on the add-on object. */
export type AddOnMessages = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Which add-ons have registered, for the suite that checks they all did. */
const registered = new Set<string>();

export function registeredAddOnMessageKeys(): readonly string[] {
  return [...registered].sort();
}

/**
 * Merge an add-on's strings into the runtime bundle, refusing a bundle that is
 * not complete in all eight locales.
 *
 * ── WHAT THIS FUNCTION IS REPLACING, STATED HONESTLY ────────────────────────
 *
 * The three area modules above are checked by the COMPILER: `Area<>` types the
 * other seven locales against English, so a missing key is a red build. An
 * add-on's bundle cannot be, because the add-on is not part of this app's
 * source — it is a vendored copy of somebody else's package, its keys are not
 * members of `MessageKey`, and nothing here knows what they are.
 *
 * So the guarantee MOVES rather than disappearing, and this is where it lands.
 * The obvious four-line version —
 *
 *     for (const locale of LOCALE_TAGS) Object.assign(MESSAGES[locale], bundle[locale]);
 *
 * — works, passes every test in this repo, and silently accepts an add-on that
 * is missing three locales. The consequence is not abstract: the panel falls
 * back to English on screen, in exactly one of eight languages, for a reader
 * who cannot read it, and nobody who speaks the other seven ever sees it. That
 * is the failure mode the compile-time check existed to prevent, so the runtime
 * replacement has to be at least as strict.
 *
 * ── AND WHY IT THROWS, AND THROWS HERE ──────────────────────────────────────
 *
 * It runs at MODULE LOAD, from `add-ons/registry.ts`, on every boot including
 * the demo — so it cannot be skipped the way a test can, and it cannot be true
 * on a developer's machine and false in a build. A boot that dies naming the
 * add-on, the locale and the key is strictly better than an app running with a
 * hole in its Arabic.
 *
 * A key that COLLIDES with one already in the bundle is refused for the same
 * reason: a later merge silently winning is how an add-on ends up quietly
 * rewriting this app's own copy, and the reader would see the wrong sentence
 * with nothing anywhere saying why.
 */
export function registerAddOnMessages(addOnKey: string, bundle: AddOnMessages): void {
  const english = bundle["en-US"];
  if (english === undefined) {
    throw new Error(`add-on "${addOnKey}" registered no en-US strings`);
  }

  const keys = Object.keys(english);
  for (const locale of LOCALE_TAGS) {
    const localeBundle = bundle[locale];
    if (localeBundle === undefined) {
      throw new Error(`add-on "${addOnKey}" is missing the ${locale} locale entirely`);
    }
    for (const key of keys) {
      const value = localeBundle[key];
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`add-on "${addOnKey}" is missing ${locale} for "${key}"`);
      }
    }
  }

  for (const key of keys) {
    if (MESSAGES["en-US"][key] !== undefined) {
      throw new Error(`add-on "${addOnKey}" would overwrite the existing message key "${key}"`);
    }
  }

  /*
   * Mutating the same objects rather than rebuilding `MESSAGES` is what lets
   * the i18n provider hold a reference to a locale's bundle across a
   * registration — and registration happens at module load, before any of them
   * is read, so nothing is ever read half-merged.
   */
  for (const locale of LOCALE_TAGS) Object.assign(MESSAGES[locale], bundle[locale]);
  registered.add(addOnKey);
}
