// SPDX-License-Identifier: AGPL-3.0-only
/**
 * A `DataSource` backed by a real Adminium instance (28-public-surface.md §5.2,
 * 28-T28 wave 4).
 *
 * ── READS DO NOT BECOME ASYNC ──────────────────────────────────────────────
 * `loadSnapshot` fetches the whole read-set once, before React mounts, and
 * hands back the same SYNCHRONOUS shapes `demoSource` returns.
 *
 * ── THIS APP IS STAFF-ONLY ─────────────────────────────────────────────────
 * §5.3: people-ops has no customer side, and employee self-service is internal
 * rather than public. So the key this reads with is a STAFF-side one, and
 * nothing here is reachable by a member of the public.
 *
 * ── WHAT THIS APP HAS INSTEAD OF TEXT KEYS ─────────────────────────────────
 * Unlike hotel-reservations and factory-ops, every primary key here is a
 * `serial`. There is no column carrying the app's own identifiers, so:
 *
 *  • **People are addressed by their row id, stringified.** That is safe
 *    because every reference to a person — manager, buddy, requester, approver
 *    — is a foreign key to the same table, so the whole graph stays internally
 *    consistent. The app never hard-codes a person; only its TESTS do, against
 *    seeded fiction.
 *  • **Leave types are recognised by NAME**, because `LeaveTypeKey` is a
 *    compile-time union of four members and nothing in the schema carries it.
 *    That is the same WS-I defect clinic-desk carries for visit types: rename
 *    "Annual leave" in the dashboard and its rows stop resolving. A row that
 *    does not resolve is DROPPED rather than guessed at, which is the honest
 *    outcome and is itself the argument for the `key` column.
 *
 * ── THREE THINGS THE SCHEMA CANNOT SAY ─────────────────────────────────────
 *  1. **A request has no code.** `leave_requests.id` is a serial; the app shows
 *     "LR-299". Derived below, so it is stable per row but not authored.
 *  2. **`step` is not stored, and a PARTIAL approval cannot be represented.**
 *     The row keeps one decision, so a long request waiting on its second
 *     approver looks exactly like one waiting on its first. Decided requests
 *     get the count their chain needed; pending ones get 0. Wants a
 *     `leave_request_decisions` child table.
 *  3. **A leave type has no icon or tint token.** `color` is a hex value the
 *     app's CSS custom properties do not take. Both come from the catalogue
 *     below, keyed by the resolved type, which is WS-I G4 for this repo.
 *
 * ── TIME IS A DAY SERIAL, AND STAYS ONE ────────────────────────────────────
 * Leave is counted in whole days, so the app works in serials (days since the
 * epoch, UTC) and never in instants — a serial cannot drift across a timezone
 * boundary. `toTenantDay` gives the tenant's calendar day; the conversion to a
 * serial is arithmetic on that, never on the browser's clock.
 */

import { createPublicClient, toTenantDay, type PublicClient } from "@adminiumjs/public-client";

import type {
  AccrualPolicy,
  EventKind,
  Holiday,
  LeaveRequest,
  LeaveType,
  LeaveTypeKey,
  NewHire,
  OnboardingTask,
  Person,
  RequestEvent,
  RequestStatus,
  Team,
} from "./types.ts";
import type { DataSource } from "./source.ts";

/* --------------------------------------------------------------- the wire */

interface WireDepartment { id: number; name: string }
interface WirePosition { id: number; department_id: number; title: string }
interface WireEmployee {
  id: number; name: string; initials: string; tint: string;
  position_id: number; manager_id: number | null; buddy_id: number | null;
  started_on: string; status: string; city: string;
}
interface WireLeaveType {
  id: number; name: string; short_name: string; annual_days: string;
  accrual: AccrualPolicy; per_month: string | null; color: string;
}
interface WireLeaveRequest {
  id: number; employee_id: number; type_id: number;
  starts_on: string; ends_on: string; working_days: number;
  status: RequestStatus; decided_by: number | null; decided_at: string | null;
  note: string | null; decision_note: string | null; created_at: string;
}
interface WireHoliday { name: string; on_date: string }
interface WireOnboardingTask {
  id: number; employee_id: number | null; title: string;
  phase: string; due_offset_days: number; done: boolean;
}

/*
 * WS-I GAP — a leave type's identity, recognised by its display name because
 * nothing in the schema carries the union member the app is typed against.
 */
const TYPE_BY_NAME: Record<string, LeaveTypeKey> = {
  "Annual leave": "annual",
  "Sick leave": "sick",
  "Personal day": "personal",
  "Volunteer day": "volunteer",
};

/* WS-I G4 — the icon and the tint tokens, which have no columns. */
const TYPE_STYLE: Record<LeaveTypeKey, { icon: string; tint: string; tintSoft: string }> = {
  annual: { icon: "plane", tint: "var(--lt-annual)", tintSoft: "var(--lt-annual-soft)" },
  sick: { icon: "thermometer", tint: "var(--lt-sick)", tintSoft: "var(--lt-sick-soft)" },
  personal: { icon: "coffee", tint: "var(--lt-personal)", tintSoft: "var(--lt-personal-soft)" },
  volunteer: { icon: "heart-handshake", tint: "var(--lt-volunteer)", tintSoft: "var(--lt-volunteer-soft)" },
};

/** The app's own rule: over five working days needs a second approver. */
const TWO_STEP_THRESHOLD = 5;

const REQUIRED = {
  departments: ["id", "name"],
  positions: ["id", "department_id", "title"],
  employees: ["id", "name", "initials", "tint", "position_id", "manager_id", "buddy_id", "started_on", "status", "city"],
  leaveTypes: ["id", "name", "short_name", "annual_days", "accrual", "per_month", "color"],
  leaveRequests: ["id", "employee_id", "type_id", "starts_on", "ends_on", "working_days", "status", "decided_by", "decided_at", "note", "decision_note", "created_at"],
  holidays: ["name", "on_date"],
  onboardingTasks: ["id", "employee_id", "title", "phase", "due_offset_days", "done"],
};

export interface Snapshot {
  now: number;
  people: Person[];
  leaveTypes: Record<LeaveTypeKey, LeaveType>;
  holidays: Holiday[];
  requests: LeaveRequest[];
  hires: NewHire[];
}

/** `YYYY-MM-DD` → whole days since the epoch, UTC. The app's date currency. */
function serialOf(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * The client, or null when either build-time variable is absent.
 *
 * The emptiness check is `createPublicClient`'s, not repeated here.
 */
export function clientFromEnv(): PublicClient | null {
  return createPublicClient({
    baseUrl: import.meta.env["VITE_ADMINIUM_API_BASE_URL"] as string | undefined,
    publishableKey: import.meta.env["VITE_ADMINIUM_PUBLISHABLE_KEY"] as string | undefined,
  });
}

/**
 * Read a whole ref, a page at a time.
 *
 * The page size is the SCOPE's — `refs[ref].limit` is the operator's ceiling
 * and asking for more than it allows is refused. This file used to read each
 * ref in ONE request with a generous `limit`, which works only while the set is
 * small: past the operator's ceiling the server answers page one with a 200 and
 * nothing anywhere says so. `max` is this app's own guard against a runaway
 * read; hitting it is reported rather than silently dropping the tail.
 */
async function listAll<T>(
  client: PublicClient,
  ref: string,
  size: number,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  const page = Math.max(1, Math.min(size, 500));
  for (let offset = 0; offset < max; offset += page) {
    const res = await client.list<T>(ref, { limit: page, offset });
    out.push(...res.data);
    if (res.data.length < page) return out;
  }
  console.warn(`[adminium] ${ref}: stopped at ${String(max)} rows — the rest were not read.`);
  return out;
}

/**
 * Fetch the read-set and map it into the app's shapes.
 *
 * Returns `null` on ANY failure so the caller falls back to demo mode
 * structurally rather than in a catch — the marketplace demos are static clones
 * with no server and must keep working byte-identically.
 */
export async function loadSnapshot(client: PublicClient): Promise<Snapshot | null> {
  try {
    await client.assertRefs(REQUIRED);
    const config = await client.config();
    const timezone = config.timezone;
    /* The operator's per-ref page ceiling. `?? 100` is the server's own
     * conservative default for a ref the scope does not size. */
    const cap = (ref: string): number => config.refs[ref]?.limit ?? 100;

    const [departments, positions, employees, types, requests, holidays, tasks] = await Promise.all([
      listAll<WireDepartment>(client, "departments", cap("departments"), 50_000),
      listAll<WirePosition>(client, "positions", cap("positions"), 50_000),
      listAll<WireEmployee>(client, "employees", cap("employees"), 50_000),
      listAll<WireLeaveType>(client, "leaveTypes", cap("leaveTypes"), 50_000),
      listAll<WireLeaveRequest>(client, "leaveRequests", cap("leaveRequests"), 50_000),
      listAll<WireHoliday>(client, "holidays", cap("holidays"), 50_000),
      listAll<WireOnboardingTask>(client, "onboardingTasks", cap("onboardingTasks"), 50_000),
    ]);

    const deptById = new Map(departments.map((d) => [d.id, d.name]));
    const positionById = new Map(positions.map((p) => [p.id, p]));

    const people: Person[] = employees.map((e) => {
      const position = positionById.get(e.position_id);
      return {
        id: String(e.id),
        name: e.name,
        ini: e.initials,
        // Operator text, not a key. `format.label()` is `tOr(key, key)`, so a
        // value with no translation renders as itself — which is why the
        // schema's own words are safe to pass straight through.
        role: position?.title ?? "",
        team: (position === undefined ? "" : (deptById.get(position.department_id) ?? "")) as Team,
        city: e.city,
        mgr: e.manager_id === null ? null : String(e.manager_id),
        tint: e.tint,
        started: serialOf(e.started_on),
      };
    });

    const typeKeyById = new Map<number, LeaveTypeKey>();
    const leaveTypes = {} as Record<LeaveTypeKey, LeaveType>;
    for (const row of types) {
      const key = TYPE_BY_NAME[row.name];
      // A type nobody can resolve has no icon, no tint and no place in the
      // union. Dropping it is honest; guessing would put an unstyled chip on
      // the calendar and a wrong balance on the card.
      if (key === undefined) continue;
      typeKeyById.set(row.id, key);
      leaveTypes[key] = {
        key,
        name: row.name,
        short: row.short_name,
        ...TYPE_STYLE[key],
        policy: row.accrual,
        ...(row.per_month === null ? {} : { perMonth: Number(row.per_month) }),
        annual: Number(row.annual_days),
      };
    }

    const mappedRequests: LeaveRequest[] = [];
    for (const r of requests) {
      const type = typeKeyById.get(r.type_id);
      if (type === undefined) continue;
      // The decision is folded into the row, so the timeline is rebuilt from
      // it rather than read from an event log the schema does not keep.
      const events: RequestEvent[] = [
        {
          kind: "submitted" as EventKind,
          by: String(r.employee_id),
          at: serialOf(r.created_at),
          note: r.note ?? "",
        },
      ];
      if (r.decided_at !== null && r.status !== "pending") {
        events.push({
          kind: r.status as EventKind,
          by: r.decided_by === null ? "" : String(r.decided_by),
          at: serialOf(r.decided_at),
          note: r.decision_note ?? "",
        });
      }
      mappedRequests.push({
        code: `LR-${String(r.id)}`,
        person: String(r.employee_id),
        type,
        start: serialOf(r.starts_on),
        end: serialOf(r.ends_on),
        status: r.status,
        /*
         * `step` counts the decisions ALREADY made, and the schema records
         * only the FINAL one — so a long request sitting between its manager
         * and People ops is indistinguishable from one nobody has looked at.
         * Both read as 0. That is the honest floor rather than a guess, and it
         * is the third thing this schema cannot say: a partial approval needs
         * a `leave_request_decisions` child table, not another column.
         */
        step:
          r.status === "pending" ? 0 : r.working_days > TWO_STEP_THRESHOLD ? 2 : 1,
        events,
      });
    }

    const tasksByEmployee = new Map<number, WireOnboardingTask[]>();
    for (const task of tasks) {
      if (task.employee_id === null) continue;
      const list = tasksByEmployee.get(task.employee_id) ?? [];
      list.push(task);
      tasksByEmployee.set(task.employee_id, list);
    }

    const today = serialOf(toTenantDay(new Date().toISOString(), timezone));
    const hires: NewHire[] = employees
      .filter((e) => tasksByEmployee.has(e.id))
      .map((e) => {
        const position = positionById.get(e.position_id);
        return {
          id: String(e.id),
          name: e.name,
          ini: e.initials,
          role: position?.title ?? "",
          team: (position === undefined ? "" : (deptById.get(position.department_id) ?? "")) as Team,
          tint: e.tint,
          starts: serialOf(e.started_on),
          buddy: e.buddy_id === null ? "" : String(e.buddy_id),
          tasks: (tasksByEmployee.get(e.id) ?? []).map(
            (t): OnboardingTask => ({
              id: String(t.id),
              group: t.phase,
              due: String(t.due_offset_days),
              label: t.title,
              done: t.done,
            }),
          ),
        };
      });

    return {
      now: today,
      people,
      leaveTypes,
      holidays: holidays.map(
        (h): Holiday => ({ serial: serialOf(h.on_date), name: h.name }),
      ),
      requests: mappedRequests,
      hires,
    };
  } catch (error) {
    console.warn("[adminium] connected mode unavailable, using demo data:", error);
    return null;
  }
}

/** A synchronous `DataSource` over an already-fetched snapshot. */
export function snapshotSource(snap: Snapshot): DataSource {
  return {
    now: () => snap.now,
    people: () => snap.people.map((p) => ({ ...p })),
    leaveTypes: () => ({ ...snap.leaveTypes }),
    holidays: () => snap.holidays.map((h) => ({ ...h })),
    requests: () => snap.requests.map((r) => ({ ...r, events: r.events.map((e) => ({ ...e })) })),
    hires: () => snap.hires.map((h) => ({ ...h, tasks: h.tasks.map((t) => ({ ...t })) })),
  };
}
