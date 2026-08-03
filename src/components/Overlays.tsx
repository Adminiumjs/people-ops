/**
 * The overlay layer: toasts, the profile sheet, the cancel confirm and the
 * reject-with-note dialog.
 *
 * Mounted once at the root, outside the view switch, so a view change never
 * remounts them and a toast survives the navigation that raised it.
 */

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { HOLIDAYS, PEOPLE, TODAY } from "../data/demo.ts";
import { useI18n } from "../i18n/index.tsx";
import { dateLong, label } from "../lib/format.ts";
import { useStore } from "../state/store.ts";
import { Avatar, Button, Chip, Mono } from "./Primitives.tsx";
import { workingDays } from "../lib/leave.ts";

export function ToastLayer() {
  const { t } = useI18n();
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="fp-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`fp-toast fp-toast--${toast.tone}`}>
          {toast.tone === "pos" && <Check size={15} aria-hidden="true" />}
          <span>{toast.text}</span>
          <button
            type="button"
            className="fp-toast__x"
            onClick={() => dismiss(toast.id)}
            aria-label={t("chrome.toast.dismiss")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** A person's profile, opened from the directory or the topbar search. */
export function ProfileSheet() {
  const { t } = useI18n();
  const profileId = useStore((s) => s.profileId);
  const openProfile = useStore((s) => s.openProfile);
  const requests = useStore((s) => s.requests);

  if (profileId === null) return null;
  const person = PEOPLE.find((p) => p.id === profileId);
  if (!person) return null;

  const manager = PEOPLE.find((p) => p.id === person.mgr);
  const outToday = requests.some(
    (r) =>
      r.person === person.id &&
      r.status === "approved" &&
      r.start <= TODAY &&
      TODAY <= r.end,
  );

  return (
    <div
      className="fp-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) openProfile(null);
      }}
    >
      <div className="fp-modal" role="dialog" aria-modal="true" aria-label={person.name}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Avatar name={person.name} tint={person.tint} ini={person.ini} large />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="fp-modal__title">{person.name}</h2>
            <p className="fp-panel__sub">{label(person.role)}</p>
          </div>
          <button
            type="button"
            className="fp-iconbtn fp-btn"
            onClick={() => openProfile(null)}
            aria-label={t("chrome.action.close")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {outToday && (
          <div style={{ marginBlockStart: 12 }}>
            <Chip tone="warn">{t("chrome.status.outToday")}</Chip>
          </div>
        )}

        <dl className="fp-facts" style={{ marginBlockStart: 16 }}>
          <dt>{t("directory.profile.team")}</dt>
          <dd>{person.team}</dd>
          <dt>{t("directory.profile.location")}</dt>
          <dd>{label(person.city)}</dd>
          <dt>{t("directory.profile.manager")}</dt>
          <dd>{manager?.name ?? t("directory.profile.noManager")}</dd>
          <dt>{t("directory.profile.started")}</dt>
          <dd>
            <Mono>{dateLong(person.started)}</Mono>
          </dd>
        </dl>
      </div>
    </div>
  );
}

/** Cancelling a pending request — behind a confirm, because it is not undoable. */
export function CancelConfirm() {
  const { t } = useI18n();
  const code = useStore((s) => s.cancellingCode);
  const askCancel = useStore((s) => s.askCancel);
  const cancelRequest = useStore((s) => s.cancelRequest);

  if (code === null) return null;

  return (
    <div
      className="fp-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) askCancel(null);
      }}
    >
      <div className="fp-modal" role="dialog" aria-modal="true">
        <h2 className="fp-modal__title">{t("requests.cancel.confirm", { code })}</h2>
        <p className="fp-panel__sub">{t("requests.cancel.body")}</p>
        <div className="fp-modal__actions">
          <Button tone="ghost" onClick={() => askCancel(null)}>
            {t("chrome.action.keepIt")}
          </Button>
          <Button tone="danger" onClick={() => cancelRequest(code)}>
            {t("requests.cancel.yes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rejecting a request. The note is required and the button says why it is
 * disabled — being turned down without a reason is the thing this prevents.
 */
export function RejectDialog() {
  const { t } = useI18n();
  const code = useStore((s) => s.rejectingCode);
  const askReject = useStore((s) => s.askReject);
  const rejectRequest = useStore((s) => s.rejectRequest);
  const requests = useStore((s) => s.requests);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (code !== null) setNote("");
  }, [code]);

  if (code === null) return null;
  const request = requests.find((r) => r.code === code);
  if (!request) return null;

  const person = PEOPLE.find((p) => p.id === request.person);
  const days = workingDays(request.start, request.end, HOLIDAYS).count;
  const blocked = note.trim().length === 0;

  return (
    <div
      className="fp-modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) askReject(null);
      }}
    >
      <div className="fp-modal" role="dialog" aria-modal="true">
        <h2 className="fp-modal__title">{t("approvals.reject.title")}</h2>
        <p className="fp-panel__sub">
          {person?.name} · <Mono>{code}</Mono> ·{" "}
          {t("chrome.workingDays", { count: days }, days)}
        </p>

        <textarea
          className="fp-textarea fp-fld"
          style={{ marginBlockStart: 14 }}
          value={note}
          autoFocus
          placeholder={t("approvals.reject.placeholder")}
          aria-label={t("approvals.reject.title")}
          onChange={(e) => setNote(e.target.value)}
        />
        {blocked && (
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--warn)", marginBlockStart: 8 }}>
            {t("approvals.reject.required")}
          </p>
        )}

        <div className="fp-modal__actions">
          <Button tone="ghost" onClick={() => askReject(null)}>
            {t("chrome.action.cancel")}
          </Button>
          <Button tone="danger" disabled={blocked} onClick={() => rejectRequest(code, note)}>
            {t("approvals.reject.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
