/**
 * THE SEAM, BOUND TO THIS APP — once, at module scope.
 *
 * `createAddOnSlot` is a factory rather than a component because the two facts
 * it needs are host facts: the class-name prefix its markup writes, and the
 * store it reads fills and settings out of. Both existing hosts had those
 * written INTO their copy of the component — a literal `className` and a fixed
 * relative import of `../state/store.ts` — which is why their copies could only
 * ever be installed by hand-editing them, and a copy that must be edited to be
 * installed is a fork from the first keystroke.
 *
 * ── CALLED ONCE, AND THAT IS NOT TIDINESS ───────────────────────────────────
 *
 * A second call would make a second COMPONENT IDENTITY, so React would unmount
 * and remount every fill under it whenever a screen happened to render the
 * other one — an add-on's form losing what somebody had typed into it because
 * two files each called a factory.
 *
 * ── AND THE ADAPTER IS FOUR LINES BECAUSE IT IS ALLOWED TO BE ───────────────
 *
 * `UseSlotFills` asks for exactly what `AddOnRegistry.fillsFor` already returns
 * and exactly the settings document the store already holds. There is no
 * mapping step on purpose: a mapping step is where a host would get the chance
 * to reorder, filter or re-key, and the registry has already made all three of
 * those decisions — fills come back ordered by `order` then add-on key, so a
 * multi-fill slot draws the same way in every host.
 */

import { createAddOnSlot, type UseSlotFills } from "./kit/index.ts";
import { hostKit } from "./host-kit.config.ts";
import type { HostedSlotId } from "./slots.ts";
import { useStore } from "../state/store.ts";

const useSlotFills: UseSlotFills<HostedSlotId> = (slot, forAddOn) => ({
  fills: useStore((s) => s.registry).fillsFor(slot, useStore((s) => s.enabled), forAddOn),
  settings: useStore((s) => s.addOnSettings),
});

export const { AddOnSlot, SlotFill } = createAddOnSlot(hostKit, useSlotFills);
