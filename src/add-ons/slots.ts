/**
 * THE SLOTS THIS APP MOUNTS — one of them, and the list is deliberately short.
 *
 * ── THIS IS NOT THE CLOSED REGISTRY ─────────────────────────────────────────
 *
 * `vendor/host/slots.ts` exports the closed registry of every slot id that
 * EXISTS, under the name `HOSTED_SLOTS` — the same identifier this file uses
 * for the ids THIS app draws. Importing the wrong one is the single trap the
 * host kit's config calls out by name, and it fails quietly rather than loudly:
 * every check keyed off this list would silently widen to twelve ids, the
 * empty-behaviour table below would need twelve rows nobody thought about, and
 * the mount component would accept a slot no screen here draws.
 *
 * So this list is ours, it is narrower, and `mountsGuard` asserts it is a
 * strict SUBSET of the registry — a mis-import is then a named failure instead
 * of a widening.
 *
 * ── WHY ONE, AND WHAT WOULD ADD A SECOND ────────────────────────────────────
 *
 * A slot nobody fills is a guess about a future add-on; the closed registry's
 * own header refuses ids on exactly that ground, and a HOST that mounts an id
 * nothing draws is the same mistake one level down — it ships a hole in a
 * screen and an empty state nobody will ever read. This app hosts the one slot
 * it has a real place for and a real filler for.
 *
 * The two that were considered and are absent:
 *
 *   `nav.add-on.routes` — a whole page in the shell. This app's routing is a
 *   switch over one store field with no router at all (`app/App.tsx`), so a
 *   route slot would be a `View` member with no way for anything but the host
 *   to reach it. The sibling print works declared this id for a release,
 *   an add-on filled it, and nothing anywhere drew it, for this exact reason.
 *
 *   `record.editor.panel` — a panel inside a generated dashboard's record
 *   editor. This app has no record editor: it has a leave form, a directory
 *   sheet and a checklist, none of which is the generated CRUD surface that
 *   payload describes.
 *
 * Adding one is two lines here — the id, and its empty behaviour below — and
 * the second line is a compile error until it is written, which is where the
 * decision belongs.
 */

import type { SlotEmptyBehaviour, SlotId } from "./vendor/host/index.ts";

export const HOSTED_SLOTS = ["settings.add-on.panel"] as const satisfies readonly SlotId[];

export type HostedSlotId = (typeof HOSTED_SLOTS)[number];

/**
 * WHAT THIS APP DRAWS WHERE NOTHING FILLS EACH SLOT.
 *
 * `speaks` — a real empty state IN WORDS, where a person has something to be
 * told. `silent` — nothing at all, where there is nothing to act on and a
 * dashed placeholder would make an unconfigured app look broken.
 *
 * `settings.add-on.panel` SPEAKS, and the choice is not obvious enough to leave
 * unexplained. The slot sits inside a drawer somebody opened ON PURPOSE, having
 * pressed "manage" against one add-on, under a heading that says settings. An
 * empty region under that heading reads as a screen that failed to load. So the
 * host says the true thing instead — this one has nothing to set here — which
 * is a finished sentence rather than a gap.
 *
 * The sibling print works reached the same answer and the maker studio reached
 * the other one, which is why there is no shared table of these anywhere: the
 * behaviour is a property of the SCREEN a host built, not of the slot id.
 */
export const SLOT_EMPTY_BEHAVIOUR: Readonly<Record<HostedSlotId, SlotEmptyBehaviour>> = {
  "settings.add-on.panel": "speaks",
};
