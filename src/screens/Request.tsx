/**
 * REQUEST LEAVE — the form, and the live summary that makes it trustworthy.
 *
 * Three things happen as the reader picks dates, all from `lib/leave.ts`:
 * the working-day count recomputes, the skipped days are named (weekend, or
 * the holiday by name), and the approval chain is previewed BEFORE submission
 * so nobody discovers the second signature by waiting for it.
 *
 * When the balance is short the panel turns --warn-soft, states exactly how
 * short, and the submit button DISABLES with that reason attached rather than
 * disappearing.
 */

import { CalendarCheck, CircleAlert, Info } from "lucide-react";

import { HOLIDAYS, LEAVE_TYPES, LEAVE_TYPE_KEYS, PEOPLE, TODAY, fromSer } from "../data/demo.ts";
import { useI18n } from "../i18n/index.tsx";
import { dateLong, dateRange, dateShort, days, label } from "../lib/format.ts";
import { balanceFor, validateRequest } from "../lib/leave.ts";
import {
  currentUser,
  draftChain,
  draftWorkingDays,
  personName,
  useStore,
} from "../state/store.ts";
import { Button, Chip, Mono, Panel } from "../components/Primitives.tsx";

/** `YYYY-MM-DD` for a date input, built in UTC to match the serial. */
function toInputValue(serial: number | null): string {
  if (serial === null) return "";
  const { y, m, d } = fromSer(serial);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fromInputValue(value: string): number | null {
  if (value === "") return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export default function Request() {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const requests = useStore((s) => s.requests);
  const type = useStore((s) => s.draftType);
  const start = useStore((s) => s.draftStart);
  const end = useStore((s) => s.draftEnd);
  const note = useStore((s) => s.draftNote);
  const submittedCode = useStore((s) => s.submittedCode);
  const setType = useStore((s) => s.setDraftType);
  const setStart = useStore((s) => s.setDraftStart);
  const setEnd = useStore((s) => s.setDraftEnd);
  const setNote = useStore((s) => s.setDraftNote);
  const submit = useStore((s) => s.submitRequest);
  const clearDraft = useStore((s) => s.clearDraft);
  const go = useStore((s) => s.go);

  const meId = currentUser(persona);

  if (submittedCode !== null) {
    return <Receipt code={submittedCode} onAgain={clearDraft} onView={() => go("requests")} />;
  }

  const { count, skipped } = draftWorkingDays(start, end);
  const balance = balanceFor(meId, type, requests, HOLIDAYS, TODAY);
  const check = validateRequest(meId, type, start, end, requests, HOLIDAYS, TODAY);
  const chain = draftChain(meId, count);

  const blockedReason = check.ok
    ? null
    : check.reason === "insufficient"
      ? t("request.blocked.insufficient", { short: days(check.short ?? 0) })
      : t(`request.blocked.${check.reason}` as "request.blocked.empty");

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("request.title")}</h1>
        <p className="fp-head__sub">{t("request.subtitle")}</p>
      </header>

      <div className="fp-request-grid">
        <div style={{ minWidth: 0, display: "grid", gap: 16 }}>
          <Panel title={t("request.type")}>
            <div className="fp-typepick">
              {LEAVE_TYPE_KEYS.map((key) => {
                const meta = LEAVE_TYPES[key];
                const left = balanceFor(meId, key, requests, HOLIDAYS, TODAY).remaining;
                return (
                  <button
                    key={key}
                    type="button"
                    className="fp-typepick__btn"
                    aria-pressed={type === key}
                    onClick={() => setType(key)}
                    style={type === key ? { borderColor: meta.tint, background: meta.tintSoft } : undefined}
                  >
                    <span className="fp-typepick__dot" style={{ background: meta.tint }} aria-hidden="true" />
                    <span className="fp-typepick__name">{label(meta.name)}</span>
                    <span className="fp-typepick__left fp-mono">
                      {t("request.type.remaining", { days: days(left) })}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title={t("request.dates")}>
            <div className="fp-daterow">
              <label className="fp-field">
                <span className="fp-label">{t("request.from")}</span>
                <input
                  className="fp-input fp-fld fp-mono"
                  type="date"
                  value={toInputValue(start)}
                  onChange={(e) => setStart(fromInputValue(e.target.value))}
                />
              </label>
              <label className="fp-field">
                <span className="fp-label">{t("request.to")}</span>
                <input
                  className="fp-input fp-fld fp-mono"
                  type="date"
                  value={toInputValue(end)}
                  min={toInputValue(start)}
                  onChange={(e) => setEnd(fromInputValue(e.target.value))}
                />
              </label>
            </div>
          </Panel>

          <Panel title={t("request.note")}>
            <textarea
              className="fp-textarea fp-fld"
              value={note}
              placeholder={t("request.note.placeholder")}
              aria-label={t("request.note")}
              onChange={(e) => setNote(e.target.value)}
            />
          </Panel>
        </div>

        <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <section
            className={`fp-summary${check.ok ? "" : " fp-summary--warn"}`}
            aria-live="polite"
          >
            <h2 className="fp-panel__title">{t("request.summary.title")}</h2>

            <dl className="fp-facts" style={{ marginBlockStart: 12 }}>
              <dt>{t("request.summary.range")}</dt>
              <dd>
                {start !== null && end !== null ? (
                  <Mono>{dateRange(start, end)}</Mono>
                ) : (
                  "—"
                )}
              </dd>
              <dt>{t("request.summary.working")}</dt>
              <dd>
                <Mono>{days(count)}</Mono>
              </dd>
              <dt>{t("request.summary.balanceNow")}</dt>
              <dd>
                <Mono>{days(balance.remaining)}</Mono>
              </dd>
              <dt>{t("request.summary.balanceAfter")}</dt>
              <dd style={check.ok ? undefined : { color: "var(--warn)" }}>
                <Mono>{days(balance.remaining - count)}</Mono>
              </dd>
            </dl>

            {skipped.length > 0 && (
              <div className="fp-skipped">
                <div className="fp-label">{t("request.summary.skipped")}</div>
                <ul>
                  {skipped.map((s) => (
                    <li key={s.serial}>
                      <Mono>{dateShort(s.serial)}</Mono>
                      <span>
                        {s.why === "weekend"
                          ? t("request.summary.skipped.weekend")
                          : label(s.why)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockedReason !== null && count > 0 && (
              <p className="fp-summary__blocked">
                <CircleAlert size={14} aria-hidden="true" />
                {blockedReason}
              </p>
            )}
          </section>

          <Panel title={t("request.chain.title")}>
            <p className="fp-panel__sub" style={{ marginBlockEnd: 11 }}>
              {t(chain.length > 1 ? "request.chain.two" : "request.chain.one")}
            </p>
            <ol className="fp-chain">
              {chain.map((step, i) => (
                <li key={step.roleKey} className="fp-chain__step">
                  <span className="fp-chain__n fp-mono">{i + 1}</span>
                  <span>
                    <span className="fp-chain__role">{t(step.roleKey)}</span>
                    <span className="fp-chain__who">
                      {step.approver !== null
                        ? personName(step.approver)
                        : t("directory.profile.noManager")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <div>
            <Button
              disabled={!check.ok}
              onClick={submit}
              title={blockedReason ?? undefined}
              className="fp-fullwidth"
            >
              <CalendarCheck size={16} aria-hidden="true" />
              {t("request.submit")}
            </Button>
            {blockedReason !== null && (
              <p className="fp-submit-reason">{blockedReason}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** The receipt shown after a successful submission. */
function Receipt({
  code,
  onAgain,
  onView,
}: {
  code: string;
  onAgain: () => void;
  onView: () => void;
}) {
  const { t } = useI18n();
  const requests = useStore((s) => s.requests);
  const request = requests.find((r) => r.code === code);
  const person = PEOPLE.find((p) => p.id === request?.person);
  const chain = draftChain(
    request?.person ?? "",
    draftWorkingDays(request?.start ?? null, request?.end ?? null).count,
  );

  return (
    <div className="fp-screen">
      <section className="fp-receipt">
        <span className="fp-receipt__mark" aria-hidden="true">
          <CalendarCheck size={26} />
        </span>
        <h1 className="fp-receipt__title">{t("request.sent.title")}</h1>
        <p className="fp-receipt__code fp-mono">{code}</p>

        {request !== undefined && (
          <p className="fp-receipt__range fp-mono">
            {dateRange(request.start, request.end)}
          </p>
        )}

        <p className="fp-receipt__body">
          {t("request.sent.body", {
            who:
              chain[0]?.approver !== null && chain[0]?.approver !== undefined
                ? personName(chain[0].approver)
                : t("chain.peopleOps"),
          })}
        </p>

        {request !== undefined && (
          <div className="fp-receipt__chips">
            <Chip tone="info">{t("chrome.status.pending")}</Chip>
            <Chip>{t("chain.step", { n: 1, total: chain.length })}</Chip>
            {person !== undefined && <Chip>{label(person.role)}</Chip>}
          </div>
        )}

        <div className="fp-receipt__actions">
          <Button tone="ghost" onClick={onAgain}>
            {t("request.sent.another")}
          </Button>
          <Button onClick={onView}>{t("request.sent.view")}</Button>
        </div>
      </section>
    </div>
  );
}

export { dateLong, Info };
