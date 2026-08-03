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
  /** i18n key for the holiday's name. */
  name: string;
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
