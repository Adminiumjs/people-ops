/**
 * HOME (Employee) — balances, who is out, what is next.
 *
 * The balance cards are the point: a big remaining figure, a thin accrual
 * bar, and one line that explains where the figure came from. "12.25 of 21
 * accrued as of Jul 28 · 10 used" is what stops a reader wondering whether the
 * number is wrong.
 */

import { CalendarHeart, PartyPopper, Plane } from "lucide-react";

import { HOLIDAYS, LEAVE_TYPES, LEAVE_TYPE_KEYS, PEOPLE, TODAY } from "../data/demo.ts";
import type { LeaveTypeKey } from "../data/types.ts";
import { useI18n } from "../i18n/index.tsx";
import { dateFull, dateLong, dateRange, dateShort, days, label } from "../lib/format.ts";
import {
  balanceFor,
  holidaysThisQuarter,
  nextTimeOff,
  outOn,
  workingDays,
} from "../lib/leave.ts";
import { currentUser, personName, useStore } from "../state/store.ts";
import { Avatar, Button, Chip, Empty, Mono, Panel } from "../components/Primitives.tsx";

export default function Home() {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const requests = useStore((s) => s.requests);
  const go = useStore((s) => s.go);
  const openProfile = useStore((s) => s.openProfile);

  const meId = currentUser(persona);
  const out = outOn(TODAY, requests, PEOPLE);
  const next = nextTimeOff(meId, requests, TODAY);
  const holidays = holidaysThisQuarter(HOLIDAYS, TODAY);

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">
          {t("home.greeting", { name: personName(meId).split(" ")[0] })}
        </h1>
        <p className="fp-head__sub fp-mono">{dateFull(TODAY)}</p>
      </header>

      <section aria-label={t("home.balances.title")}>
        <h2 className="fp-section-title">{t("home.balances.title")}</h2>
        <div className="fp-balances">
          {LEAVE_TYPE_KEYS.map((key) => (
            <BalanceCard key={key} type={key} personId={meId} />
          ))}
        </div>
      </section>

      <div className="fp-home-grid">
        <Panel title={t("home.out.title")}>
          {out.length === 0 ? (
            <p className="fp-col__empty">{t("home.out.empty")}</p>
          ) : (
            <ul className="fp-outstrip">
              {out.map(({ person, type }) => (
                <li key={`${person.id}-${type}`}>
                  <button
                    type="button"
                    className="fp-outstrip__item"
                    onClick={() => openProfile(person.id)}
                  >
                    <Avatar name={person.name} tint={person.tint} ini={person.ini} large />
                    <span className="fp-outstrip__name">{person.name}</span>
                    <Chip style={{ background: LEAVE_TYPES[type].tintSoft, color: LEAVE_TYPES[type].tint, borderColor: "transparent" }}>
                      {label(LEAVE_TYPES[type].short)}
                    </Chip>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("home.next.title")}>
          {next === null ? (
            <Empty
              icon={<Plane size={20} aria-hidden="true" />}
              title={t("home.next.empty")}
              action={
                <Button size="sm" onClick={() => go("request")}>
                  {t("home.next.empty.action")}
                </Button>
              }
            />
          ) : (
            <div className="fp-next">
              <div className="fp-next__range fp-mono">{dateRange(next.start, next.end)}</div>
              <div className="fp-next__meta">
                <Chip
                  style={{
                    background: LEAVE_TYPES[next.type].tintSoft,
                    color: LEAVE_TYPES[next.type].tint,
                    borderColor: "transparent",
                  }}
                >
                  {label(LEAVE_TYPES[next.type].name)}
                </Chip>
                <Chip>
                  {t(
                    "chrome.workingDays",
                    { count: days(workingDays(next.start, next.end, HOLIDAYS).count) },
                    workingDays(next.start, next.end, HOLIDAYS).count,
                  )}
                </Chip>
                <Chip tone="accent">
                  {t("home.next.until", { count: next.start - TODAY }, next.start - TODAY)}
                </Chip>
              </div>
              <p className="fp-next__code">
                <Mono>{next.code}</Mono>
              </p>
            </div>
          )}
        </Panel>

        <Panel title={t("home.holidays.title")}>
          {holidays.length === 0 ? (
            <p className="fp-col__empty">{t("home.holidays.empty")}</p>
          ) : (
            <ul className="fp-holidays">
              {holidays.map((h) => (
                <li key={h.serial}>
                  <PartyPopper size={15} aria-hidden="true" />
                  <span>{label(h.name)}</span>
                  <Mono className="fp-holidays__date">{dateShort(h.serial)}</Mono>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function BalanceCard({ type, personId }: { type: LeaveTypeKey; personId: string }) {
  const { t } = useI18n();
  const requests = useStore((s) => s.requests);
  const meta = LEAVE_TYPES[type];
  const balance = balanceFor(personId, type, requests, HOLIDAYS, TODAY);

  // The bar shows how much of the year's entitlement has been EARNED so far,
  // which is a different question from how much is left.
  const accruedFraction = Math.min(1, balance.accrued / balance.annual);

  return (
    <article className="fp-balance" style={{ borderInlineStartColor: meta.tint }}>
      <header className="fp-balance__head">
        <span className="fp-balance__dot" style={{ background: meta.tint }} aria-hidden="true" />
        <span className="fp-balance__name">{label(meta.name)}</span>
      </header>

      <div className="fp-balance__figure">
        <Mono className="fp-balance__value">{days(balance.remaining)}</Mono>
        <span className="fp-balance__unit">{t("home.balance.remaining")}</span>
      </div>

      <div
        className="fp-balance__track"
        role="img"
        aria-label={t("home.balance.accrued", {
          accrued: days(balance.accrued),
          annual: days(balance.annual),
          date: dateShort(TODAY),
          used: days(balance.used),
        })}
      >
        <div
          className="fp-balance__fill"
          style={{ inlineSize: `${accruedFraction * 100}%`, background: meta.tint }}
        />
      </div>

      <p className="fp-balance__line">
        {t("home.balance.accrued", {
          accrued: days(balance.accrued),
          annual: days(balance.annual),
          date: dateShort(TODAY),
          used: days(balance.used),
        })}
      </p>

      {balance.pending > 0 && (
        <p className="fp-balance__pending">
          <CalendarHeart size={12} aria-hidden="true" />
          {t("chrome.status.pending")}: <Mono>{days(balance.pending)}</Mono>
        </p>
      )}
    </article>
  );
}

/** Re-exported for the profile sheet, which shows the same long-date form. */
export { dateLong };
