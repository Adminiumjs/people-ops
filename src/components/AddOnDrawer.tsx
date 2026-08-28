/**
 * THE MANAGE DRAWER — the one place in this app an add-on draws its own form.
 *
 * ── WHY THIS SCREEN HAD TO BE BUILT AND COULD NOT BE FOUND ──────────────────
 *
 * `settings.add-on.panel` is an ADMIN surface, filled per add-on, and this app
 * had no settings screen of any kind: no preferences, no configuration, no
 * admin area, nothing with a form on it that was not a leave request. Four of
 * the wave-6 hosts are in that position and the retrofit budget has to include
 * it. So this drawer is new, and it is a drawer rather than a page because that
 * is what this app already does with a thing you open ABOUT one record — the
 * directory's profile sheet is the same shape, the same scrim, the same escape
 * behaviour.
 *
 * ── WHAT IS THE ADD-ON'S AND WHAT IS OURS ───────────────────────────────────
 *
 * The settings section is a SLOT, not a branch on the add-on's key. The
 * argument for branching is better than it looks — a form generated from
 * `{ key, kind }` would give somebody four checkboxes and no idea what turning
 * one off does, because every setting worth having carries a SENTENCE and a
 * sentence is not something a schema supplies — and the right conclusion from
 * it is not that this app should write the sentences. It is that the ADD-ON
 * should, which is what the slot is for. The add-on owns the control and the
 * sentence together; this drawer owns the heading above them, the permissions
 * above that, and the disconnect below.
 *
 * An add-on with nothing to set fills the slot anyway and says so in its own
 * words. One that fills no panel at all gets the fallback, which SPEAKS — see
 * `add-ons/slots.ts` for why an empty region under a heading somebody pressed
 * "manage" to reach is worse than a sentence.
 */

import { useState } from "react";
import { Unplug, X } from "lucide-react";

import { AddOnSlot } from "../add-ons/slot.tsx";
import { resolveActivity } from "../add-ons/vendor/host/index.ts";
import { LEAVE_TYPE_KEYS, fromSer } from "../data/demo.ts";
import { LEAVE_TYPES, TODAY } from "../data/live.ts";
import { useI18n } from "../i18n/index.tsx";
import { label } from "../lib/format.ts";
import { useStore } from "../state/store.ts";
import { AddOnTile, Affiliation, SeededNote } from "./AddOnBits.tsx";
import { Button, Chip, Mono } from "./Primitives.tsx";

/**
 * THE DEMO CLOCK'S HOUR, pinned, because a seeded history has to be dated by
 * SOMETHING and this app's clock stops at a day.
 *
 * `data/demo.ts` pins the date — 28 July 2026 — and every screen in this app is
 * built on whole-day arithmetic, so there is no hour anywhere to read. An
 * add-on's seeded lines are declared as "this many minutes ago" precisely so
 * the HOST dates them against its own reckoning, and half past five on the
 * pinned day is this app's reckoning. The alternative was the real wall clock,
 * which would have made a screenshot of a seeded list disagree with itself
 * between two runs of the same demo.
 */
const DEMO_HOUR = 17;
const DEMO_MINUTE = 30;

function demoClock(): { iso: string; hour: number; minute: number } {
  const { y, m, d } = fromSer(TODAY);
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { iso, hour: DEMO_HOUR, minute: DEMO_MINUTE };
}

/** `17:30` in the reader's own numerals, from a pinned clock. */
function clockFace(locale: string, hour: number, minute: number): string {
  return new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }).format(
    hour,
  ) +
    ":" +
    new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }).format(minute);
}

export default function AddOnDrawer() {
  const { t, locale, date } = useI18n();
  const key = useStore((s) => s.managingAddOn);
  const registry = useStore((s) => s.registry);
  const enabled = useStore((s) => s.enabled);
  const close = useStore((s) => s.manageAddOn);
  const patch = useStore((s) => s.patchAddOnSettings);
  const disconnect = useStore((s) => s.disconnectAddOn);
  const [confirming, setConfirming] = useState(false);

  if (key === null) return null;
  const addOn = registry.byKey(key);
  if (addOn === undefined) return null;

  const connected = enabled.has(addOn.key);
  const activity = resolveActivity(addOn.activity, { now: demoClock(), refs: [] });

  return (
    <div
      className="fp-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) close(null);
      }}
    >
      <div
        className="fp-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("addon.host.manage.title", { name: addOn.name })}
      >
        <header className="fp-drawer__head">
          <AddOnTile letters={addOn.monogram} size={40} />
          <span style={{ flex: 1, minInlineSize: 0 }}>
            <span className="fp-drawer__name">{addOn.name}</span>
            {connected && <Chip tone="pos">{t("addon.host.state.on")}</Chip>}
          </span>
          <button
            type="button"
            className="fp-iconbtn fp-btn"
            aria-label={t("chrome.menu.close")}
            onClick={() => close(null)}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="fp-drawer__body fp-scroll">
          <section>
            <div className="fp-label">{t("addon.host.manage.what")}</div>
            <p className="fp-addon__what">{t(addOn.whatKey as never)}</p>
          </section>

          <section>
            <div className="fp-label">{t("addon.host.manage.permissions")}</div>
            {addOn.permissions.length === 0 ? (
              /*
               * AN EMPTY LIST IS A FACT, AND A GOOD ONE. This is what connecting
               * LETS an add-on do, and an add-on that reads no record, writes no
               * record and reaches nowhere has an honest list of length zero.
               * Drawing nothing here would read as a section that failed to
               * load; inventing a row so the section looked substantial would be
               * asking for a power in order to look reassuring.
               */
              <p className="fp-addon__none">{t("addon.host.manage.noPermissions")}</p>
            ) : (
              <ul className="fp-addon__perms">
                {addOn.permissions.map((p) => (
                  <li key={p.key}>{t(p.key as never)}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="fp-label">{t("addon.host.manage.settings")}</div>
            {/*
              THE SLOT. Scoped to the add-on this drawer is managing, which is
              what `per-add-on` means: the drawer asks for that one panel and
              gets it, or the fallback if that add-on renders no settings form.
             */}
            <AddOnSlot
              slot="settings.add-on.panel"
              forAddOn={addOn.key}
              payload={{
                patch: (values: Record<string, unknown>) => patch(addOn.key, values),
                /*
                 * WHAT THIS APP KNOWS AND NO ADD-ON DOES: the families of the
                 * thing it is about, one representative record each.
                 *
                 * `samples` is REQUIRED by the payload, and its own comment
                 * records why an optional field was the easier and worse choice:
                 * a host passed `{ patch }` alone, the compiler was happy, and an
                 * add-on's settings form threw on `.map`. Being required forces
                 * the question "what is a representative record HERE", and for a
                 * leave app the answer is a LEAVE TYPE — the four families of
                 * what the business grants, with the year's entitlement as the
                 * quantity, which is exactly what `quantity` asks for ("a
                 * representative order quantity — what somebody actually buys").
                 *
                 * The three optional facts are absent and one of them is absent
                 * on principle: `unitPrice` would be a money figure attached to a
                 * person's leave, and this product has NO PAYROLL — no payslip,
                 * no salary, no compensation figure, and no type in the app has a
                 * field for one. That is a boundary rather than an omission, and
                 * a settings payload is not where it gets crossed.
                 *
                 * The day-set add-on has no opinion about any of this and ignores
                 * the field, which is the case the payload's own comment says is
                 * ordinary.
                 */
                samples: LEAVE_TYPE_KEYS.map((typeKey) => ({
                  key: typeKey,
                  label: label(LEAVE_TYPES[typeKey].name),
                  quantity: LEAVE_TYPES[typeKey].annual,
                })),
              }}
              fallback={<p className="fp-addon__none">{t("addon.host.manage.noSettings")}</p>}
            />
          </section>

          <section>
            <div className="fp-label">{t("addon.host.manage.activity")}</div>
            {activity.length === 0 ? (
              <p className="fp-addon__none">{t("addon.host.manage.noActivity")}</p>
            ) : (
              <>
                {/*
                  READ `activity.length`, NEVER `addOn.activity.length`. An entry
                  naming a reference this app has not got is dropped by
                  `resolveActivity`, so the declared list can be longer than the
                  one on screen — and captioning an empty list "these are seeded"
                  is as wrong as leaving three seeded lines uncaptioned.
                 */}
                <SeededNote>{t("addon.host.manage.activitySeeded")}</SeededNote>
                <ul className="fp-addon__activity">
                  {activity.map((entry, i) => (
                    <li key={`${entry.iso}-${String(i)}`}>
                      <Mono>
                        {t(entry.messageKey as never, {
                          when: `${date(new Date(`${entry.iso}T00:00:00Z`), {
                            timeZone: "UTC",
                            day: "numeric",
                            month: "short",
                          })} ${clockFace(locale, entry.hour, entry.minute)}`,
                          ref: entry.ref,
                        })}
                      </Mono>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <Affiliation addOn={addOn} />
        </div>

        {connected && (
          <footer className="fp-drawer__foot">
            {/*
              ═════════════════════════════════════════════════════════════════
              24 D16 — DISCONNECTING KEEPS THE DATA, AND SAYS SO FIRST
              ═════════════════════════════════════════════════════════════════

              Both sentences are the ADD-ON'S OWN, out of its own eight-locale
              bundle. What survives a disconnect is a fact about the add-on: it
              knows what it stored and this app does not, and a host that wrote
              the reassurance itself would be making a promise on somebody
              else's behalf about a document it has never read inside.

              They are shown BEFORE anything happens rather than as a toast
              afterwards. A promise that data survives is worth nothing to
              somebody who has already pressed the button.
             */}
            {confirming ? (
              <div className="fp-addon__confirm">
                {/*
                  THIS APP'S OWN SENTENCE, FIRST, and it is the only one of the
                  three this app is entitled to write. The add-on's two lines
                  below are about the add-on's own document; this one is about
                  what happens to the screens the person is looking at, which
                  the add-on cannot know and this app cannot leave unsaid — see
                  `i18n/strings/addOns.ts` for the reading of the add-on's own
                  "stays exactly where it is" that made it necessary.
                 */}
                <p className="fp-addon__goes">{t("addon.host.disconnect.hostEffect")}</p>
                {/*
                  AND WHERE AN ADD-ON SUPPLIED NEITHER SENTENCE, this app still
                  says the one thing it is entitled to say — which is about
                  ITSELF: `disconnectAddOn` changes `enabled` and does not touch
                  `addOnSettings`, so nothing an add-on stored is deleted here.
                  That is a narrower claim than the add-on's own two lines and it
                  is the only one available; drawing an empty confirmation would
                  leave the reader to guess, and guessing about whether a button
                  destroys data is the thing D16 exists to stop.
                 */}
                <p className="fp-addon__goes">
                  {addOn.disconnect === undefined
                    ? t("addon.host.disconnect.goesFallback")
                    : t(addOn.disconnect.goesKey as never)}
                </p>
                <p className="fp-addon__stays">
                  {addOn.disconnect === undefined
                    ? t("addon.host.disconnect.staysFallback")
                    : t(addOn.disconnect.staysKey as never)}
                </p>
                <div className="fp-addon__confirmrow">
                  <Button tone="danger" onClick={() => disconnect(addOn.key)}>
                    {t("addon.host.disconnect.confirm")}
                  </Button>
                  <Button tone="ghost" onClick={() => setConfirming(false)}>
                    {t("addon.host.disconnect.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                tone="ghost"
                className="fp-fullwidth"
                onClick={() => setConfirming(true)}
              >
                <Unplug size={15} aria-hidden="true" />
                {t("addon.host.disconnect")}
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
