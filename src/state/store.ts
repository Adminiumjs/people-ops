/**
 * The app's single store.
 *
 * Requests live here; balances, queues and the calendar grid are derived from
 * them in `lib/leave.ts` at render time. That is what makes cancelling a
 * request put its days back on the Home balance card without any bookkeeping.
 */

import { create } from "zustand";

import {
  HOLIDAYS,
  HR_PERSON,
  ME,
  ONBOARDING,
  PEOPLE,
  SEED_REQUESTS,
  TODAY,
} from "../data/demo.ts";
import type {
  LeaveRequest,
  LeaveTypeKey,
  NewHire,
  Persona,
  Toast,
  View,
} from "../data/types.ts";
import { t } from "../i18n/ambient.ts";
import {
  approvalChain,
  nextCode,
  stepsNeeded,
  workingDays,
} from "../lib/leave.ts";

const THEME_KEY = "people-ops-theme";

export type Theme = "light" | "dark";

interface State {
  view: View;
  persona: Persona;
  /** Whose profile the directory sheet is showing. */
  profileId: string | null;
  /** Whose checklist the onboarding view is showing. */
  hireId: string | null;

  theme: Theme;
  navOpen: boolean;
  dockOpen: boolean;
  overlayOpen: boolean;

  requests: LeaveRequest[];
  hires: NewHire[];

  /* --- the request form --- */
  draftType: LeaveTypeKey;
  draftStart: number | null;
  draftEnd: number | null;
  draftNote: string;
  /** Set once a request is submitted, so the form can show its receipt. */
  submittedCode: string | null;

  /* --- transient UI --- */
  toasts: Toast[];
  expandedRequest: string | null;
  cancellingCode: string | null;
  rejectingCode: string | null;
  directoryQuery: string;
  teamFilter: string;
  /** Month the team calendar is showing, as [year, month]. */
  calendarMonth: [number, number];

  go: (view: View) => void;
  setPersona: (p: Persona) => void;
  openProfile: (id: string | null) => void;
  openHire: (id: string | null) => void;

  initTheme: () => void;
  toggleTheme: () => void;
  setNavOpen: (open: boolean) => void;
  setDockOpen: (open: boolean) => void;
  setDirectoryQuery: (q: string) => void;
  setTeamFilter: (team: string) => void;
  stepCalendar: (by: 1 | -1) => void;

  setDraftType: (type: LeaveTypeKey) => void;
  setDraftStart: (serial: number | null) => void;
  setDraftEnd: (serial: number | null) => void;
  setDraftNote: (note: string) => void;
  submitRequest: () => void;
  clearDraft: () => void;

  expandRequest: (code: string | null) => void;
  askCancel: (code: string | null) => void;
  cancelRequest: (code: string) => void;
  askReject: (code: string | null) => void;
  approveRequest: (code: string) => void;
  rejectRequest: (code: string, note: string) => void;

  toggleTask: (hireId: string, taskId: string) => void;

  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  escape: () => void;
  reset: () => void;
}

/** The signed-in person for the current persona. */
export function currentUser(persona: Persona): string {
  return persona === "hr" ? HR_PERSON : ME;
}

export function personName(id: string | null): string {
  return PEOPLE.find((p) => p.id === id)?.name ?? "—";
}

let toastSeq = 0;

const clone = <T,>(xs: T[]): T[] => xs.map((x) => ({ ...x }));

export const useStore = create<State>((set, get) => ({
  view: "home",
  persona: "employee",
  profileId: null,
  hireId: null,

  theme: "light",
  navOpen: false,
  dockOpen: true,
  overlayOpen: false,

  requests: SEED_REQUESTS.map((r) => ({ ...r, events: [...r.events] })),
  hires: ONBOARDING.map((h) => ({ ...h, tasks: clone(h.tasks) })),

  draftType: "annual",
  draftStart: null,
  draftEnd: null,
  draftNote: "",
  submittedCode: null,

  toasts: [],
  expandedRequest: null,
  cancellingCode: null,
  rejectingCode: null,
  directoryQuery: "",
  teamFilter: "all",
  calendarMonth: [2026, 8],

  /** Every view change scrolls to the top and closes the mobile nav. */
  go: (view) => {
    set({ view, navOpen: false, overlayOpen: false });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  /*
   * Switching persona lands on that persona's home view: an HR person arriving
   * on the employee's balance cards is looking at somebody else's leave.
   */
  setPersona: (persona) => {
    set({
      persona,
      view: persona === "hr" ? "approvals" : "home",
      navOpen: false,
      profileId: null,
      hireId: null,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  openProfile: (profileId) => set({ profileId, overlayOpen: profileId !== null }),

  openHire: (hireId) => {
    set({ hireId });
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  initTheme: () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage disabled — fall back to the OS preference.
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme: Theme =
      stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not remembering the choice is not a reason to refuse it.
    }
    set({ theme });
  },

  setNavOpen: (navOpen) => set({ navOpen, overlayOpen: navOpen }),
  setDockOpen: (dockOpen) => set({ dockOpen }),
  setDirectoryQuery: (directoryQuery) => set({ directoryQuery }),
  setTeamFilter: (teamFilter) => set({ teamFilter }),

  stepCalendar: (by) => {
    const [y, m] = get().calendarMonth;
    const next = m + by;
    if (next < 1) set({ calendarMonth: [y - 1, 12] });
    else if (next > 12) set({ calendarMonth: [y + 1, 1] });
    else set({ calendarMonth: [y, next] });
  },

  setDraftType: (draftType) => set({ draftType, submittedCode: null }),

  /*
   * Setting a start after the current end clears the end rather than silently
   * inverting the range — an inverted range would validate as "empty" and the
   * reader would not know why.
   */
  setDraftStart: (draftStart) => {
    const { draftEnd } = get();
    set({
      draftStart,
      draftEnd: draftStart !== null && draftEnd !== null && draftEnd < draftStart ? null : draftEnd,
      submittedCode: null,
    });
  },

  setDraftEnd: (draftEnd) => set({ draftEnd, submittedCode: null }),
  setDraftNote: (draftNote) => set({ draftNote }),

  /**
   * Submission mints the next code from the highest already issued, so the
   * counter is derived rather than hard-coded — the seeds end at LR-304 and
   * the first live request is therefore LR-305.
   */
  submitRequest: () => {
    const { requests, draftType, draftStart, draftEnd, draftNote, persona } = get();
    if (draftStart === null || draftEnd === null) return;

    const code = nextCode(requests);
    const me = currentUser(persona);

    const request: LeaveRequest = {
      code,
      person: me,
      type: draftType,
      start: draftStart,
      end: draftEnd,
      status: "pending",
      step: 0,
      events: [
        { kind: "submitted", by: me, at: TODAY, note: draftNote.trim() },
      ],
    };

    set({
      requests: [...requests, request],
      submittedCode: code,
      draftNote: "",
    });
    get().toast(t("chrome.toast.submitted", { code }), "pos");
  },

  clearDraft: () =>
    set({ draftStart: null, draftEnd: null, draftNote: "", submittedCode: null }),

  expandRequest: (expandedRequest) => set({ expandedRequest }),

  askCancel: (cancellingCode) =>
    set({ cancellingCode, overlayOpen: cancellingCode !== null }),

  cancelRequest: (code) => {
    const { requests, persona } = get();
    set({
      requests: requests.map((r) =>
        r.code === code
          ? {
              ...r,
              status: "cancelled" as const,
              events: [
                ...r.events,
                { kind: "cancelled" as const, by: currentUser(persona), at: TODAY, note: "" },
              ],
            }
          : r,
      ),
      cancellingCode: null,
      overlayOpen: false,
    });
    get().toast(t("chrome.toast.cancelled", { code }), "info");
  },

  askReject: (rejectingCode) =>
    set({ rejectingCode, overlayOpen: rejectingCode !== null }),

  /**
   * Approving advances the chain by one step. A request needing two steps and
   * sitting at step 0 stays pending after the first signature — which is what
   * makes the two-step indicator on the queue mean something.
   */
  approveRequest: (code) => {
    const { requests, persona } = get();
    const request = requests.find((r) => r.code === code);
    if (!request) return;

    const needed = stepsNeeded(request, HOLIDAYS);
    const step = request.step + 1;
    const done = step >= needed;

    set({
      requests: requests.map((r) =>
        r.code === code
          ? {
              ...r,
              step,
              status: done ? ("approved" as const) : ("pending" as const),
              events: [
                ...r.events,
                { kind: "approved" as const, by: currentUser(persona), at: TODAY, note: "" },
              ],
            }
          : r,
      ),
    });

    get().toast(
      done
        ? t("chrome.toast.approved", { code })
        : t("chrome.toast.stepApproved", { code }),
      "pos",
    );
  },

  rejectRequest: (code, note) => {
    const trimmed = note.trim();
    if (trimmed.length === 0) return;

    const { requests, persona } = get();
    set({
      requests: requests.map((r) =>
        r.code === code
          ? {
              ...r,
              status: "rejected" as const,
              events: [
                ...r.events,
                { kind: "rejected" as const, by: currentUser(persona), at: TODAY, note: trimmed },
              ],
            }
          : r,
      ),
      rejectingCode: null,
      overlayOpen: false,
    });
    get().toast(t("chrome.toast.rejected", { code }), "danger");
  },

  toggleTask: (hireId, taskId) => {
    let nowDone = false;
    set({
      hires: get().hires.map((h) =>
        h.id !== hireId
          ? h
          : {
              ...h,
              tasks: h.tasks.map((task) => {
                if (task.id !== taskId) return task;
                nowDone = !task.done;
                return { ...task, done: nowDone };
              }),
            },
      ),
    });
    get().toast(
      t(nowDone ? "chrome.toast.taskDone" : "chrome.toast.taskUndone"),
      nowDone ? "pos" : "info",
    );
  },

  toast: (text, tone = "info") => {
    toastSeq += 1;
    const id = toastSeq;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    window.setTimeout(() => get().dismissToast(id), 3600);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),

  /** Overlays close outermost-first, so one Escape does one thing. */
  escape: () => {
    const s = get();
    if (s.cancellingCode !== null) return set({ cancellingCode: null, overlayOpen: false });
    if (s.rejectingCode !== null) return set({ rejectingCode: null, overlayOpen: false });
    if (s.profileId !== null) return set({ profileId: null, overlayOpen: false });
    if (s.navOpen) return set({ navOpen: false, overlayOpen: false });
  },

  reset: () => {
    set({
      requests: SEED_REQUESTS.map((r) => ({ ...r, events: [...r.events] })),
      hires: ONBOARDING.map((h) => ({ ...h, tasks: clone(h.tasks) })),
      view: get().persona === "hr" ? "approvals" : "home",
      profileId: null,
      hireId: null,
      draftType: "annual",
      draftStart: null,
      draftEnd: null,
      draftNote: "",
      submittedCode: null,
      expandedRequest: null,
      cancellingCode: null,
      rejectingCode: null,
      directoryQuery: "",
      teamFilter: "all",
      calendarMonth: [2026, 8],
      overlayOpen: false,
    });
    get().toast(t("chrome.toast.reset"), "info");
  },
}));

/** Working days in the current draft, for the live summary panel. */
export function draftWorkingDays(
  start: number | null,
  end: number | null,
): ReturnType<typeof workingDays> {
  if (start === null || end === null) return { count: 0, skipped: [] };
  return workingDays(start, end, HOLIDAYS);
}

/** The chain a draft would go through, previewed before submission. */
export function draftChain(personId: string, days: number) {
  return approvalChain(
    days,
    PEOPLE.find((p) => p.id === personId),
    HR_PERSON,
  );
}
