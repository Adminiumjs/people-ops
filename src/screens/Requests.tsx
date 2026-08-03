/**
 * MY REQUESTS and APPROVALS — the two views over the same list.
 *
 * `MyRequests` shows the signed-in person's own history newest-first, each row
 * expanding to its full timeline with actor names, dates and quoted decision
 * notes. `Approvals` shows the HR queue oldest-first, with a balance-after
 * preview and the two-step chain indicator on anything over five days.
 */

import { ChevronDown, Inbox, ClipboardList } from "lucide-react";

import { HOLIDAYS, LEAVE_TYPES, PEOPLE, TODAY } from "../data/demo.ts";
import type { EventKind, LeaveRequest, RequestStatus } from "../data/types.ts";
import { useI18n } from "../i18n/index.tsx";
import { dateLong, dateRange, days, label } from "../lib/format.ts";
import {
  balanceFor,
  pendingQueue,
  stepsNeeded,
  workingDays,
} from "../lib/leave.ts";
import { currentUser, personName, useStore } from "../state/store.ts";
import { Avatar, Button, Chip, Empty, Mono, Panel } from "../components/Primitives.tsx";

const STATUS_TONE: Record<RequestStatus, "info" | "pos" | "danger" | undefined> = {
  pending: "info",
  approved: "pos",
  rejected: "danger",
  cancelled: undefined,
};

const STATUS_KEY: Record<RequestStatus, "chrome.status.pending"> = {
  pending: "chrome.status.pending",
  approved: "chrome.status.approved" as "chrome.status.pending",
  rejected: "chrome.status.rejected" as "chrome.status.pending",
  cancelled: "chrome.status.cancelled" as "chrome.status.pending",
};

const EVENT_KEY: Record<EventKind, "chrome.event.submitted"> = {
  submitted: "chrome.event.submitted",
  approved: "chrome.event.approved" as "chrome.event.submitted",
  rejected: "chrome.event.rejected" as "chrome.event.submitted",
  cancelled: "chrome.event.cancelled" as "chrome.event.submitted",
};

function TypeChip({ type }: { type: LeaveRequest["type"] }) {
  const meta = LEAVE_TYPES[type];
  return (
    <Chip
      style={{ background: meta.tintSoft, color: meta.tint, borderColor: "transparent" }}
    >
      {label(meta.name)}
    </Chip>
  );
}

/** The shared event list — the same timeline in both views. */
function Timeline({ request }: { request: LeaveRequest }) {
  const { t } = useI18n();
  return (
    <div className="fp-timeline">
      {request.events.map((ev, i) => (
        <article key={`${ev.kind}-${ev.at}-${i}`} className="fp-tl-row">
          <span
            className="fp-tl-dot"
            style={
              ev.kind === "approved"
                ? { background: "var(--pos-soft)", color: "var(--pos)" }
                : ev.kind === "rejected"
                  ? { background: "var(--danger-soft)", color: "var(--danger)" }
                  : undefined
            }
            aria-hidden="true"
          >
            •
          </span>
          <div className="fp-tl-body">
            <div className="fp-tl-head">
              <span className="fp-tl-type">
                {t(EVENT_KEY[ev.kind], { who: personName(ev.by) })}
              </span>
              <span className="fp-tl-when fp-mono">{dateLong(ev.at)}</span>
            </div>
            {ev.note.trim().length > 0 && (
              <p className="fp-tl-text">“{label(ev.note)}”</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ my requests */

export function MyRequests() {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const requests = useStore((s) => s.requests);
  const expanded = useStore((s) => s.expandedRequest);
  const expand = useStore((s) => s.expandRequest);
  const askCancel = useStore((s) => s.askCancel);
  const go = useStore((s) => s.go);

  const meId = currentUser(persona);
  const mine = requests
    .filter((r) => r.person === meId)
    .slice()
    .sort((a, b) => (b.events[0]?.at ?? 0) - (a.events[0]?.at ?? 0));

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("requests.title")}</h1>
        <p className="fp-head__sub">{t("requests.subtitle")}</p>
      </header>

      {mine.length === 0 ? (
        <Panel>
          <Empty
            icon={<ClipboardList size={22} aria-hidden="true" />}
            title={t("requests.empty.title")}
            body={t("requests.empty.body")}
            action={<Button onClick={() => go("request")}>{t("chrome.nav.request")}</Button>}
          />
        </Panel>
      ) : (
        <div style={{ display: "grid", gap: 11 }}>
          {mine.map((r) => {
            const count = workingDays(r.start, r.end, HOLIDAYS).count;
            const open = expanded === r.code;
            return (
              <article key={r.code} className="fp-reqrow">
                <div className="fp-reqrow__main">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fp-reqrow__top">
                      <Mono className="fp-reqrow__code">{r.code}</Mono>
                      <TypeChip type={r.type} />
                      <Chip tone={STATUS_TONE[r.status]}>{t(STATUS_KEY[r.status])}</Chip>
                    </div>
                    <p className="fp-reqrow__range fp-mono">{dateRange(r.start, r.end)}</p>
                    <p className="fp-reqrow__days">
                      {t("chrome.workingDays", { count: days(count) }, count)}
                    </p>
                  </div>

                  <div className="fp-reqrow__actions">
                    {r.status === "pending" && (
                      <Button size="sm" tone="ghost" onClick={() => askCancel(r.code)}>
                        {t("requests.cancel")}
                      </Button>
                    )}
                    <button
                      type="button"
                      className="fp-reqrow__toggle"
                      onClick={() => expand(open ? null : r.code)}
                      aria-expanded={open}
                      aria-label={t(open ? "requests.collapse" : "requests.expand")}
                    >
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        style={open ? { transform: "rotate(180deg)" } : undefined}
                      />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="fp-reqrow__history">
                    <Timeline request={r} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- approvals */

export function Approvals() {
  const { t } = useI18n();
  const requests = useStore((s) => s.requests);
  const approve = useStore((s) => s.approveRequest);
  const askReject = useStore((s) => s.askReject);
  const queue = pendingQueue(requests);

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("approvals.title")}</h1>
        <p className="fp-head__sub">{t("approvals.subtitle")}</p>
      </header>

      {queue.length === 0 ? (
        <Panel>
          <Empty
            icon={<Inbox size={22} aria-hidden="true" />}
            title={t("approvals.empty.title")}
            body={t("approvals.empty.body")}
          />
        </Panel>
      ) : (
        <div style={{ display: "grid", gap: 11 }}>
          {queue.map((r) => {
            const person = PEOPLE.find((p) => p.id === r.person);
            const count = workingDays(r.start, r.end, HOLIDAYS).count;
            const balance = balanceFor(r.person, r.type, requests, HOLIDAYS, TODAY);
            const total = stepsNeeded(r, HOLIDAYS);
            const note = r.events[0]?.note ?? "";

            return (
              <article key={r.code} className="fp-approw">
                <div className="fp-approw__who">
                  {person !== undefined && (
                    <Avatar name={person.name} tint={person.tint} ini={person.ini} large />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="fp-reqrow__top">
                      <span className="fp-approw__name">{person?.name}</span>
                      <TypeChip type={r.type} />
                    </div>
                    <p className="fp-reqrow__range fp-mono">{dateRange(r.start, r.end)}</p>
                    <p className="fp-reqrow__days">
                      {t("chrome.workingDays", { count: days(count) }, count)} ·{" "}
                      {t("approvals.balanceAfter", { days: days(balance.remaining) })}
                    </p>
                  </div>
                </div>

                {total > 1 && (
                  <div className="fp-approw__chain">
                    <Chip tone="info">
                      {t("chain.step", { n: r.step + 1, total })}
                    </Chip>
                    <Chip>
                      {t("chain.awaiting", {
                        who: t(r.step === 0 ? "chain.manager" : "chain.peopleOps"),
                      })}
                    </Chip>
                  </div>
                )}

                {note.trim().length > 0 && (
                  <p className="fp-approw__note">“{label(note)}”</p>
                )}

                <div className="fp-approw__actions">
                  <Button tone="ghost" size="sm" onClick={() => askReject(r.code)}>
                    {t("approvals.reject")}
                  </Button>
                  <Button tone="pos" size="sm" onClick={() => approve(r.code)}>
                    {t("approvals.approve")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
