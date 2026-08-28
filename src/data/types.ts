/**
 * The app's domain types.
 *
 * `View` is the routing union: `app/App.tsx` maps every member to a screen, so
 * adding a view here is a compile error until a screen exists for it.
 *
 * SCOPE NOTE: there is no payroll in this product. No payslip, no salary, no
 * compensation figure, and no type below has a field for one. That is a
 * deliberate boundary, not an omission — see the README.
 */

export type View =
  | "home"
  | "request"
  | "requests"
  | "directory"
  | "approvals"
  | "calendar"
  | "onboarding"
  | "addons"
  | "notfound";

export type Persona = "employee" | "hr";

export type LeaveTypeKey = "annual" | "sick" | "personal" | "volunteer";

/**
 * How a type's entitlement arrives. `upfront` grants the whole year on 1 Jan;
 * `monthly` accrues `perMonth` on the first of each month, which is why a
 * balance card can read "12.25 of 21 accrued".
 */
export type AccrualPolicy = "upfront" | "monthly";

export interface LeaveType {
  key: LeaveTypeKey;
  /** i18n key for the full name. */
  name: string;
  /** i18n key for the short name used on chips and calendar bars. */
  short: string;
  icon: string;
  /** CSS custom property carrying this type's tint. */
  tint: string;
  tintSoft: string;
  policy: AccrualPolicy;
  /** Days granted per month; only meaningful when `policy` is "monthly". */
  perMonth?: number;
  /** Days per year. */
  annual: number;
}

export interface Holiday {
  /** Day serial — whole days since the Unix epoch, UTC. */
  serial: number;
  /**
   * The holiday's name — an i18n KEY for a seeded day, and a LITERAL for one an
   * add-on supplied.
   *
   * `format.label()` resolves either, because it falls back to the raw string
   * when the bundle has no key for it. That fallback is what lets an imported
   * day carry the country's own name for itself — `Tag der Deutschen Einheit`,
   * `Velký pátek` — without the add-on inventing i18n keys this app would then
   * have to translate into eight languages it has no business translating a
   * German public holiday into. A holiday's name is a proper noun belonging to
   * a country; translating it renames it.
   */
  name: string;
  /**
   * The key of the add-on that supplied this day, absent for one of the app's
   * own.
   *
   * ── WHY THE FIELD IS HERE AND WHAT IS NOT ALLOWED TO READ IT ──────────────
   *
   * Every day an add-on put on this app's calendar has to be VISIBLY
   * add-on-supplied wherever it appears — the holidays panel, the request
   * form's skipped-day list, the team calendar — because a reader who sees a
   * new closed day appear on their leave form is owed the fact that it did not
   * come out of this app. This is how the three screens know to draw the chip.
   *
   * IT IS NOT RENDERED. What the screens draw is this app's own neutral words
   * for "an add-on supplied this", not the key and not the add-on's name — the
   * first is a machine identifier and the second would put an add-on's identity
   * on three ordinary screens and drag the not-affiliated rule onto all of them
   * (24 AC6). The key is carried rather than a bare `boolean` so that a second
   * day-set add-on can be told from the first without a second field, which is
   * a distinction a boolean would have to be replaced to make.
   *
   * OPTIONAL, so the app's own seeded rows are byte-identical to what they were
   * before the seam existed (24 D6): nothing sets it unless an add-on supplied
   * the row.
   */
  fromAddOn?: string;
}

export type Team = "Design" | "Workshop" | "Ops";

export interface Person {
  id: string;
  name: string;
  ini: string;
  /** i18n key for the job title. */
  role: string;
  team: Team;
  /** i18n key for the location. */
  city: string;
  /** The person's manager, or null for the one person without one. */
  mgr: string | null;
  tint: string;
  /** Day serial of their start date. */
  started: number;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type EventKind = "submitted" | "approved" | "rejected" | "cancelled";

export interface RequestEvent {
  kind: EventKind;
  /** Person id of the actor. */
  by: string;
  at: number;
  /**
   * Free text. Seeded events store an i18n KEY; events created in-session
   * store what the reader typed. `format.label()` resolves either.
   */
  note: string;
}

export interface LeaveRequest {
  code: string;
  person: string;
  type: LeaveTypeKey;
  /** Inclusive day serials. */
  start: number;
  end: number;
  status: RequestStatus;
  /**
   * Which step of the approval chain the request is on. A request of five
   * working days or fewer has one step (the manager); a longer one has two
   * (manager, then People ops), and `step` is the index of the next one owed
   * a decision.
   */
  step: number;
  events: RequestEvent[];
}

export interface OnboardingTask {
  id: string;
  /** i18n key for the group heading. */
  group: string;
  /** i18n key for the due-offset chip. */
  due: string;
  /** i18n key for the task itself. */
  label: string;
  done: boolean;
}

export interface NewHire {
  id: string;
  name: string;
  ini: string;
  role: string;
  team: Team;
  tint: string;
  starts: number;
  buddy: string;
  tasks: OnboardingTask[];
}

export interface Toast {
  id: number;
  /** Already-resolved text — toasts are raised post-`t()`. */
  text: string;
  tone: "pos" | "danger" | "info";
}
