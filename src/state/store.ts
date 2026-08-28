/**
 * The app's single store.
 *
 * Requests live here; balances, queues and the calendar grid are derived from
 * them in `lib/leave.ts` at render time. That is what makes cancelling a
 * request put its days back on the Home balance card without any bookkeeping.
 */

import { create } from "zustand";

import { HOLIDAYS, ONBOARDING, PEOPLE, SEED_REQUESTS, TODAY } from "../data/live.ts";
import { HR_PERSON, ME } from "../data/demo.ts";
import { addOnHolidays, mergeHolidays } from "../add-ons/registry.ts";
import {
  applyAddOnSettings,
  createRegistry,
  defaultSettingsFor,
  EMPTY_REGISTRY,
  type AddOn,
  type AddOnRegistry,
  type AddOnSettings,
} from "../add-ons/vendor/host/index.ts";
import type {
  Holiday,
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

  /* --- add-ons --- */

  /**
   * The registered add-ons, and which of them are switched on.
   *
   * BOOTED EMPTY. `main.tsx` registers the list once the app is about to
   * render, so this module — which every screen imports — does not itself
   * import an add-on bundle, and so the day the list comes from an API instead
   * of a static array only the SOURCE of the list changes. It is also what
   * makes the seam installable before any add-on exists: with an empty registry
   * every slot draws its fallback and the app is exactly the app that shipped
   * before it (24 D6).
   */
  registry: AddOnRegistry;
  enabled: Set<string>;
  /**
   * One opaque settings document per add-on, keyed by add-on key.
   *
   * This app never reads inside one. The add-on's own panel writes it through
   * `patchAddOnSettings`, and the only thing that ever looks at the contents is
   * the add-on's own reader, called from `add-ons/registry.ts`.
   */
  addOnSettings: AddOnSettings;
  /**
   * THE HOLIDAY LIST EVERYTHING IN THE APP READS — the app's own days plus
   * every day an ENABLED add-on supplies.
   *
   * ── WHY IT IS A STORE FIELD AND NOT A HOOK ────────────────────────────────
   *
   * There are thirteen holiday reads across six screens and this module, and
   * the arithmetic has to agree at every one of them: `approveRequest` decides
   * how many signatures a request needs from `stepsNeeded`, and the request
   * form previewed that same number to the person who submitted it. A hook
   * would compute the merge once per component — nine or ten times a render,
   * memoized in some of them and not others — and the day two of those
   * disagreed, a request would need a second approval nobody was warned about.
   * One value, in one place, is the whole reason this is a field.
   *
   * It is RECOMPUTED, never accumulated: every action that can change what an
   * add-on contributes rebuilds it from `HOLIDAYS` and the current settings, so
   * there is no path by which a day can be left behind by an add-on that is no
   * longer on. And when nothing is contributed the rebuild hands back the very
   * array `data/live.ts` exported, by identity — see `mergeHolidays`.
   */
  holidays: Holiday[];
  /** Which add-on the manage drawer is showing, or null. */
  managingAddOn: string | null;

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

  registerAddOns: (addOns: readonly AddOn[]) => void;
  toggleAddOn: (key: string) => void;
  connectAddOn: (key: string) => void;
  disconnectAddOn: (key: string) => void;
  /**
   * `Record<string, unknown>` and not a typed patch: this app holds an add-on's
   * settings and never reads inside one. The add-on's own panel is what calls
   * this, with its own machine keys.
   */
  patchAddOnSettings: (addOn: string, patch: Record<string, unknown>) => void;
  manageAddOn: (key: string | null) => void;

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

/**
 * The app's own holidays plus whatever the enabled add-ons contribute.
 *
 * Recomputed from scratch by every action that can change either input, rather
 * than added to. An accumulating list is how a day belonging to an add-on
 * somebody switched off two actions ago is still on the calendar, and the
 * arithmetic that produced it is not the kind anybody re-derives by hand.
 */
function recomputeHolidays(settings: AddOnSettings, enabled: ReadonlySet<string>): Holiday[] {
  return mergeHolidays(HOLIDAYS, addOnHolidays(settings, enabled));
}

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

  registry: EMPTY_REGISTRY,
  enabled: new Set<string>(),
  addOnSettings: {},
  holidays: HOLIDAYS,
  managingAddOn: null,

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

  /* ── add-ons ─────────────────────────────────────────────────────────── */

  /**
   * Take the list of add-ons this build has, and start from their own defaults.
   *
   * The existing document wins a collision, so registering twice — which the
   * demo does not do and a hot reload does — never throws away what somebody
   * has already imported.
   *
   * `applyAddOnSettings` PUSHES the values at the add-ons rather than leaving
   * them to poll. Nothing registered here asks to be told (the day-set add-on's
   * engines take the values as an argument, so it has no copy to keep in step),
   * and the call is here anyway: an add-on that DOES keep a copy and is never
   * pushed to is one whose stale answer is indistinguishable from its right
   * one.
   */
  registerAddOns: (addOns) => {
    const addOnSettings: AddOnSettings = { ...defaultSettingsFor(addOns), ...get().addOnSettings };
    set({ registry: createRegistry(addOns), addOnSettings });
    applyAddOnSettings(addOns, addOnSettings);
    set({ holidays: recomputeHolidays(addOnSettings, get().enabled) });
  },

  /** The add-ons screen's one switch, so a card and a drawer cannot disagree. */
  toggleAddOn: (key) => {
    if (get().enabled.has(key)) get().disconnectAddOn(key);
    else get().connectAddOn(key);
  },

  connectAddOn: (key) => {
    const enabled = new Set(get().enabled);
    enabled.add(key);
    set({ enabled, holidays: recomputeHolidays(get().addOnSettings, enabled) });
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * DISCONNECTING REMOVES SURFACES AND CONTRIBUTIONS. IT NEVER REMOVES DATA.
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * 24 D16, and in this app the promise needs saying in three parts because two
   * of them pull in opposite directions and a reader is owed both.
   *
   * WHAT GOES: the add-on's fills stop resolving, so its panel is gone from the
   * moment this set changes — and its DAYS come off the calendar with them.
   * That second half is the one worth arguing. Leaving them on would mean this
   * app going on counting closed days supplied by something that is switched
   * off, with the only screen that could show or remove them removed: a person
   * whose leave request came back one day shorter would have nowhere to go and
   * look. It would also break D6 outright — with the add-on off, this app is
   * supposed to be the app that shipped before the seam existed, and an app
   * still doing arithmetic on an add-on's data is not.
   *
   * WHAT STAYS: every day that was imported, and every day somebody typed in by
   * hand. They are the add-on's own document, they are not touched here, and
   * `enabled` is a different fact from `addOnSettings` precisely so that this
   * action can change one without reaching the other. Switch it back on and the
   * whole list is exactly as it was — which is asserted, because "we did not
   * delete it" is the kind of claim that stops being true quietly.
   *
   * AND THE PERSON IS TOLD BOTH, BEFORE ANYTHING HAPPENS. The disconnect
   * confirmation prints the add-on's own two sentences — what goes, and what
   * stays — out of its own eight-locale bundle, because what survives a
   * disconnect is a fact about the add-on and not one this app is entitled to
   * assert on its behalf.
   */
  disconnectAddOn: (key) => {
    const enabled = new Set(get().enabled);
    enabled.delete(key);
    set({
      enabled,
      managingAddOn: null,
      overlayOpen: false,
      holidays: recomputeHolidays(get().addOnSettings, enabled),
    });
  },

  patchAddOnSettings: (addOn, patch) => {
    const addOnSettings: AddOnSettings = {
      ...get().addOnSettings,
      [addOn]: { ...(get().addOnSettings[addOn] ?? {}), ...patch },
    };
    set({ addOnSettings, holidays: recomputeHolidays(addOnSettings, get().enabled) });
    // Pushed, never polled: a value read a second later must be the one the
    // business just chose.
    applyAddOnSettings(get().registry.all, addOnSettings);
  },

  manageAddOn: (managingAddOn) =>
    set({ managingAddOn, overlayOpen: managingAddOn !== null }),

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

    const needed = stepsNeeded(request, get().holidays);
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
    if (s.managingAddOn !== null) return set({ managingAddOn: null, overlayOpen: false });
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
      /*
       * The add-ons are NOT reset, and that is a decision rather than an
       * oversight. This resets the seeded fiction — requests, checklists, the
       * view — and an add-on's day-set is neither seeded nor fiction: somebody
       * chose a country and pressed import. Clearing it here would make the
       * demo dock a destructive control over data D16 says a DISCONNECT may not
       * even touch, and it would do it on a button labelled "reset the demo".
       */
      managingAddOn: null,
    });
    get().toast(t("chrome.toast.reset"), "info");
  },
}));

/**
 * Working days in the current draft, for the live summary panel.
 *
 * The holidays are an ARGUMENT rather than read from `data/live.ts` here: the
 * form's summary and the balance beside it must come off the same array, and
 * the caller is the one holding the merged one.
 */
export function draftWorkingDays(
  start: number | null,
  end: number | null,
  holidays: Holiday[],
): ReturnType<typeof workingDays> {
  if (start === null || end === null) return { count: 0, skipped: [] };
  return workingDays(start, end, holidays);
}

/** The chain a draft would go through, previewed before submission. */
export function draftChain(personId: string, days: number) {
  return approvalChain(
    days,
    PEOPLE.find((p) => p.id === personId),
    HR_PERSON,
  );
}
