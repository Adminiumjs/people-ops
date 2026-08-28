/**
 * EVERY FACT ABOUT THIS APP THE HOST KIT NEEDS, IN ONE OBJECT.
 *
 * HOST-OWNED AND NEVER SYNCED. `scripts/host-kit.sh install` refuses to write
 * this file and `status` refuses to compare it, because everything in it is a
 * fact about this app rather than about the kit: where its sources are, which
 * slots it draws, which stylesheets may carry the cascade rule, which prefix
 * its class names use.
 *
 * ── THE ONE IMPORT WORTH CHECKING TWICE ─────────────────────────────────────
 *
 * `hostedSlots` takes `./slots.ts`'s list — OURS — and not the closed registry,
 * which `vendor/host/slots.ts` exports under the very same identifier. Getting
 * that wrong does not fail; it WIDENS. The mounts guard would start demanding a
 * mount for twelve ids, `slotEmptyBehaviour` would need twelve rows, and the
 * payload generic would accept slots no screen here draws. It is caught, by
 * name, because the mounts guard asserts our list is a strict subset of the
 * registry — but the way not to meet that failure is to read this paragraph.
 *
 * ── AND THE TIER, WHICH IS A DECISION AND NOT A DEFAULT ─────────────────────
 *
 * See `tier` below. It is the field this file is most likely to be wrong about
 * and the one with the least visible consequence, so it carries the longest
 * comment in the file.
 */

import type { HostKitConfig } from "./kit/index.ts";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR, type HostedSlotId } from "./slots.ts";
import { LOCALE_TAGS } from "../i18n/locales.ts";

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE FOUR PATH FIELDS, AND WHY THEY ARE COMPUTED THE AWKWARD WAY
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * THIS FILE SHIPS. The mount component imports it for `classPrefix`, so it is
 * in the module graph of every screen and therefore in the browser bundle —
 * while `rootDir`, `srcDir`, `vendorDir` and `stylesheets` are absolute
 * filesystem paths that only a suite walking the tree with `node:fs` ever
 * reads. Three ways of getting them and why two are wrong:
 *
 *   `node:url`'s `fileURLToPath` — the obvious one. It is a NODE BUILT-IN, and
 *   an import of one from a file that reaches a screen is a module a browser
 *   bundler cannot resolve. That fails the build, which is the good outcome; a
 *   polyfill shim would be the bad one.
 *
 *   `process.cwd()` — resolves at run time rather than at import, so it does
 *   not break the build. It breaks something worse: the guards would then only
 *   work when the process happened to start in the right directory, and every
 *   one of them asserts an ABSENCE over a file walk — so a wrong root returns
 *   `[]` and reads as a pass. That is the single commonest way a gate in this
 *   fleet has gone blind. (`process` is also undefined in a browser, so the
 *   module-scope call would throw on load.)
 *
 *   `import.meta.url` — what is left, and it is enough. Under `vitest` this
 *   module is a `file://` URL and the arithmetic below is exact. In a browser
 *   it is an http URL, the values become meaningless strings, and NOTHING READS
 *   THEM: the runtime half touches `classPrefix`, `selectors` and
 *   `hostedSlots` and no other member.
 *
 * THE INDIRECTION THROUGH `UP` IS LOAD-BEARING. Vite treats a literal
 * `new URL('…', import.meta.url)` as an ASSET REFERENCE and tries to resolve
 * what it names at build time; a variable is not statically analysable, so the
 * expression stays an ordinary URL construction. Inlining the string back is
 * the one edit here that would turn a working build into a confusing one.
 */
const UP = "../..";
const ROOT = new URL(UP, import.meta.url).pathname.replace(/\/$/, "");
const SRC = `${ROOT}/src`;

export const hostKit: HostKitConfig<HostedSlotId> = {
  appKey: "people-ops",

  /**
   * The class-name prefix, WITHOUT its trailing hyphen.
   *
   * `fp-` is what every one of this app's 119 component classes already uses,
   * and it is not renamed here to match anything. The kit's whole reason for
   * having this as one field is that the prefix used to be duplicated across
   * five places — the mount component, the cascade rule, and three test
   * selectors — four of which go GREEN when they match nothing.
   */
  classPrefix: "fp",

  hostedSlots: HOSTED_SLOTS,
  slotEmptyBehaviour: SLOT_EMPTY_BEHAVIOUR,

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * TIER 1, DECLARED DELIBERATELY, AND HERE IS WHAT IT COSTS
   * ═════════════════════════════════════════════════════════════════════════
   *
   * Tier 1 runs the seven guards that need nothing but `node:fs` and a
   * TypeScript parser. Tier 2 runs those and four more, and needs a DOM.
   *
   * ── WHY NOT TIER 2 ──────────────────────────────────────────────────────
   *
   * This app has no React test tree AT ALL. Its suites are pure-node engine
   * assertions and structural gates over `node:fs`; there is not one `.test.tsx`
   * in the repository, no `jsdom`, and nothing anywhere that renders a
   * component. Reaching tier 2 is therefore not "add a dependency" — it is
   * building a rendering harness, a tour of every surface and a recording spy
   * around the mount component, none of which this app has ever needed for
   * anything else.
   *
   * ADDING `jsdom` WOULD NOT BREACH 25 D11 and nobody should think it would:
   * that rule is about RUNTIME dependencies, about what reaches a browser, and
   * a devDependency used by `vitest run` reaches no bundle. Both hosts that
   * already carry this seam have had `jsdom` since wave 4b with no change to
   * what they ship. The reason this app sits at tier 1 is the harness, not the
   * dependency.
   *
   * DECLARING TIER 1 WHILE CARRYING `jsdom` IS A FAILURE with no exemption
   * field, and `tierGuard` checks exactly that. So this line and this app's
   * `package.json` have to agree, and if anybody adds `jsdom` for some other
   * purpose, the fix is to build the four fixtures rather than to argue here.
   *
   * ── AND THE FOUR GUARDS THAT ARE THEREFORE NOT RUNNING ──────────────────
   *
   * They print themselves by name on every single run — that is the ratchet,
   * and it is the reason a tier is declared rather than inferred — but a reader
   * of this file should not have to run the suite to find out:
   *
   *   `drewSomething`  the rule that answers "did the fill actually PAINT
   *                    anything". Not running it leaves open a fill that
   *                    returns a bare wrapper, or whose only child is
   *                    `display: none`. `:empty` is not "drew nothing", and
   *                    treating the two as one puts an empty box on a real
   *                    screen.
   *
   *   `createAddOnSlot` the mount component's own render behaviours, driven.
   *                    Not running it leaves open this app's own content
   *                    vanishing when a fill draws nothing, and doubling up
   *                    when it draws — neither visible without rendering.
   *
   *   `labelPairingRenderedGuard` the rendered half of the affiliation rule,
   *                    text node by text node. The SOURCE half runs (it is
   *                    tier 1) and covers every `.tsx` in this app; what is
   *                    lost is the check on what an ADD-ON's own surface drew,
   *                    which no grep over this repo can see.
   *
   *   `mountsGuard`    every hosted slot proved mounted BY RENDERING. Not
   *                    running it leaves open a slot declared hosted and drawn
   *                    by nothing — a mount inside a JSX comment satisfies a
   *                    grep, which is how one host shipped a slot with a real
   *                    fill and no screen.
   *
   * What partially covers the last of those here is `payloadCastsGuard`, which
   * parses every mount site it can find and would report a cast at one; and the
   * fact that this app hosts exactly ONE slot, in one drawer, which the add-ons
   * screen is built around. That is weaker than rendering and is not offered as
   * equivalent.
   */
  tier: 1,

  rootDir: ROOT,
  srcDir: SRC,
  vendorDir: `${SRC}/add-ons/vendor`,

  /**
   * Every locale this app ships, English first.
   *
   * Read off `i18n/locales.ts` rather than written out, because the lexicon
   * guard runs once per locale and a list that fell behind the registry would
   * quietly stop checking a language. `LOCALE_TAGS` is `Object.keys` of the
   * registry itself, so the two cannot disagree.
   */
  localeTags: LOCALE_TAGS,

  /**
   * The stylesheets that may carry the slot rule pair.
   *
   * All four are named and the guard requires the pair in EXACTLY ONE of them,
   * which is stricter than "somewhere": two copies of a cascade rule is how one
   * gets edited and the other does not, and the survivor is whichever the
   * browser reads last. `main.tsx` fixes that order — tokens, base, components,
   * screens — so a second copy would be invisible in a diff and decisive on a
   * screen.
   *
   * It lives in `components.css`, with the other shared-UI rules.
   */
  stylesheets: [
    `${SRC}/styles/tokens.css`,
    `${SRC}/styles/base.css`,
    `${SRC}/styles/components.css`,
    `${SRC}/styles/screens.css`,
  ],

  /**
   * Files exempt from the affiliation source sweep, each with its reason.
   *
   * EMPTY, and it is meant to stay that way. The sweep reports any `.tsx` that
   * prints an add-on's `name`, `shortName` or `monogram` and mounts no
   * `Affiliation`; in this app exactly one component prints those, and it
   * mounts one. An exemption list is where nine of wave 4b's holes came from,
   * and the guard holds every entry to two things — the file still exists, and
   * it is still subject to the rule it is exempt from — precisely so a
   * forgotten entry cannot go on widening the rule after the file it named has
   * been renamed out from under it.
   */
  affiliationExempt: {},
};
