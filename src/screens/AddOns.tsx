/**
 * ADD-ONS — the admin surface this retrofit had to build.
 *
 * ── WHY IT IS AN HR-ONLY VIEW ───────────────────────────────────────────────
 *
 * `settings.add-on.panel` is declared `surface: 'admin'`, and this app's two
 * personas are both staff: an employee looks at their own leave, and People ops
 * looks at everybody's. Choosing where a country's public holidays come from
 * changes every balance in the business, so it belongs to the persona that
 * already approves requests and runs onboarding.
 *
 * The persona switch is a LENS rather than a permission — everything here sits
 * behind the operator's own session and RBAC — so this is about where a control
 * sensibly LIVES, not about withholding it. Anything that must actually be
 * withheld belongs in a role.
 *
 * ── AND WHAT IT LOOKS LIKE WITH NOTHING REGISTERED (24 D6) ──────────────────
 *
 * An honest empty state, and the rest of the app untouched. The criterion the
 * retrofit is held to is that with no add-ons registered every slot draws its
 * fallback and the app is the app that shipped before the seam — which is why
 * the merge returns the app's own holiday array BY IDENTITY when nothing is
 * contributed, and why this screen has an empty state at all rather than
 * assuming the list it is given is non-empty.
 *
 * This screen itself is new, and it is the one thing that could not be avoided:
 * a per-add-on admin surface cannot be found in an app that has never had a
 * settings screen. Its nav entry is always present rather than appearing when
 * an add-on happens to be compiled in — a menu item that comes and goes is a
 * worse surprise than a page that says there is nothing here yet.
 */

import { Blocks, Plug } from "lucide-react";

import { AddOnTile, Affiliation } from "../components/AddOnBits.tsx";
import { Button, Chip, Empty, Honest, Panel } from "../components/Primitives.tsx";
import { useI18n } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";

export default function AddOns() {
  const { t } = useI18n();
  const registry = useStore((s) => s.registry);
  const enabled = useStore((s) => s.enabled);
  const connect = useStore((s) => s.connectAddOn);
  const manage = useStore((s) => s.manageAddOn);
  const holidays = useStore((s) => s.holidays);

  const all = registry.all;
  const supplied = holidays.filter((h) => h.fromAddOn !== undefined).length;

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("addon.host.title")}</h1>
        <p className="fp-head__sub">{t("addon.host.subtitle")}</p>
      </header>

      {all.length === 0 ? (
        <Panel>
          <Empty
            icon={<Blocks size={22} aria-hidden="true" />}
            title={t("addon.host.empty.title")}
            body={t("addon.host.empty.body")}
          />
        </Panel>
      ) : (
        <>
          {/*
            WHAT IS CURRENTLY COMING FROM AN ADD-ON, counted, at the top of the
            screen that can turn it off. The three places these days SHOW UP —
            the holidays panel, the request form and the team calendar — each
            mark their own rows; this is the one place that says how many there
            are in total, which is the question somebody arriving here to
            switch something off is actually asking.
           */}
          <Honest>
            {supplied === 0
              ? t("addon.host.supplying.none")
              : t("addon.host.supplying.days", { count: supplied }, supplied)}
          </Honest>

          <div className="fp-addon-list">
            {all.map((addOn) => {
              const on = enabled.has(addOn.key);
              return (
                <article key={addOn.key} className="fp-addon-card">
                  <div className="fp-addon-card__top">
                    <AddOnTile letters={addOn.monogram} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 className="fp-addon-card__name">{addOn.name}</h2>
                      <div className="fp-addon-card__meta">
                        <Chip>{t(`addon.host.category.${addOn.category}` as never)}</Chip>
                        <Chip tone={on ? "pos" : undefined}>
                          {on ? t("addon.host.state.on") : t("addon.host.state.off")}
                        </Chip>
                      </div>
                    </div>
                  </div>

                  <p className="fp-addon-card__line">{t(addOn.lineKey as never)}</p>

                  {/*
                    ONE BUTTON, AND SWITCHING OFF IS NOT ON IT. Connecting is a
                    decision with nothing to lose; disconnecting takes a screen
                    away and stops an add-on's days counting, and D16 says the
                    person is owed both halves of what that does BEFORE it
                    happens. Those two sentences are the add-on's own and live in
                    the drawer, so that is where the control lives too — a
                    one-press disconnect on a card is a press somebody makes
                    before reading anything.
                   */}
                  <div className="fp-addon-card__actions">
                    {on ? (
                      <Button size="sm" onClick={() => manage(addOn.key)}>
                        {t("addon.host.manage")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => connect(addOn.key)}>
                        <Plug size={14} aria-hidden="true" />
                        {t("addon.host.connect")}
                      </Button>
                    )}
                  </div>

                  {/*
                    ON THE CARD, not once at the foot of the page (24 AC6). A
                    single line under a whole list disclaims a relationship on
                    behalf of entries that have nothing to disclaim, says nothing
                    a reader can attach to the entries that do, and — the part
                    that actually bit the sibling host — makes a page-wide grep
                    for the word come back green on a page where no card said it.
                   */}
                  <Affiliation addOn={addOn} />
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
