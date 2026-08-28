// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Connected mode (28-public-surface.md §5.2, 28-T28 wave 4).
 *
 * Drives the SHIPPED client against canned wire responses, so `assertRefs`, the
 * config fetch and URL building are under test — not a stub of them.
 *
 * This repo is the one where identity is NOT free: every primary key is a
 * `serial` and nothing carries the app's own slugs, so the interesting cases
 * are the ones where that shows — a leave type recognised by its display name,
 * a request code that does not exist, a partial approval that cannot be
 * represented. Each of those degrades silently if it is wrong, which is why
 * each is pinned rather than described.
 */

import { describe, expect, it } from "vitest";

import { createPublicClient } from "@adminiumjs/public-client";

import { loadSnapshot, snapshotSource } from "./adminiumSource.ts";
import { demoSource, isConnected, setDataSource, source } from "./source.ts";

const ROWS: Record<string, unknown[]> = {
  departments: [{ id: 1, name: "Design" }, { id: 2, name: "Ops" }],
  positions: [
    { id: 1, department_id: 1, title: "Design lead" },
    { id: 19, department_id: 2, title: "COO" },
  ],
  employees: [
    {
      id: 1, name: "Arthur Boone", initials: "AB", tint: "#7d8ba0",
      position_id: 19, manager_id: null, buddy_id: null,
      started_on: "2014-03-03", status: "active", city: "Rotterdam",
    },
    {
      id: 2, name: "Jonas Wilde", initials: "JW", tint: "#6f8bb0",
      position_id: 1, manager_id: 1, buddy_id: null,
      started_on: "2017-09-04", status: "active", city: "Rotterdam",
    },
    {
      id: 9, name: "Noa Lindqvist", initials: "NL", tint: "#6f8bb0",
      position_id: 1, manager_id: 2, buddy_id: 1,
      started_on: "2026-08-10", status: "active", city: "Rotterdam",
    },
  ],
  leaveTypes: [
    { id: 1, name: "Annual leave", short_name: "Annual", annual_days: "21.00", accrual: "monthly", per_month: "1.75", color: "#0e7490" },
    { id: 2, name: "Sick leave", short_name: "Sick", annual_days: "10.00", accrual: "upfront", per_month: null, color: "#cf273c" },
    // Renamed in the dashboard: no longer resolvable to the union.
    { id: 3, name: "Duvet day", short_name: "Duvet", annual_days: "3.00", accrual: "upfront", per_month: null, color: "#7c3aed" },
  ],
  leaveRequests: [
    {
      id: 299, employee_id: 2, type_id: 1, starts_on: "2026-06-08", ends_on: "2026-06-12",
      working_days: 5, status: "approved", decided_by: 1, decided_at: "2026-06-01T09:00:00Z",
      note: "data.note.family", decision_note: "", created_at: "2026-05-28T09:00:00Z",
    },
    {
      id: 305, employee_id: 2, type_id: 1, starts_on: "2026-08-10", ends_on: "2026-08-21",
      working_days: 10, status: "pending", decided_by: null, decided_at: null,
      note: null, decision_note: null, created_at: "2026-07-20T09:00:00Z",
    },
    // Its type was renamed, so it cannot be placed on a calendar or a balance.
    {
      id: 310, employee_id: 2, type_id: 3, starts_on: "2026-09-01", ends_on: "2026-09-01",
      working_days: 1, status: "pending", decided_by: null, decided_at: null,
      note: null, decision_note: null, created_at: "2026-08-01T09:00:00Z",
    },
  ],
  holidays: [{ name: "data.holiday.civic", on_date: "2026-08-03" }],
  onboardingTasks: [
    { id: 1, employee_id: 9, title: "data.ob.laptop", phase: "data.ob.before", due_offset_days: -3, done: true },
    { id: 2, employee_id: 9, title: "data.ob.tour", phase: "data.ob.day1", due_offset_days: 0, done: false },
  ],
};

function fakeFetch(overrides: { expose?: (ref: string) => string[] } = {}) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/public/config")) {
      const refs: Record<string, unknown> = {};
      for (const ref of Object.keys(ROWS)) {
        refs[ref] = {
          actions: ["list"],
          expose: overrides.expose?.(ref) ?? Object.keys((ROWS[ref]?.[0] ?? {}) as object),
          filterable: [], searchable: [], orderable: [], writable: [], limit: 500,
        };
      }
      // `/public/config` is the one route the client unwraps (`body.data`).
      return json({ data: { version: 1, side: "customer", timezone: "Europe/Amsterdam", currency: "EUR", claim: null, refs } });
    }
    const ref = url.pathname.split("/").pop() ?? "";
    return json({ data: ROWS[ref] ?? [] });
  };
}

const clientWith = (fetch: ReturnType<typeof fakeFetch> | typeof globalThis.fetch) =>
  createPublicClient({ baseUrl: "https://api.example.test", publishableKey: "adm_pub_test", fetch });

const snapshot = async () => (await loadSnapshot(clientWith(fakeFetch())!))!;

describe("demo mode is the structural default", () => {
  it("builds no client when either variable is absent", () => {
    expect(createPublicClient({ baseUrl: "https://x.test", publishableKey: "" })).toBeNull();
    expect(createPublicClient({ baseUrl: "", publishableKey: "adm_pub_x" })).toBeNull();
  });

  it("falls back rather than throwing when the server is unreachable", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await loadSnapshot(client!)).toBeNull();
  });

  it("falls back when the scope does not expose a column the app reads", async () => {
    const client = clientWith(fakeFetch({ expose: (ref) => (ref === "employees" ? ["id"] : ["id"]) }));
    expect(await loadSnapshot(client!)).toBeNull();
  });
});

describe("identity is reconstructed, because every key is a serial", () => {
  it("addresses people by row id and keeps the graph consistent", async () => {
    const snap = await snapshot();
    const jonas = snap.people.find((p) => p.name === "Jonas Wilde")!;
    expect(jonas.id).toBe("2");
    // The manager reference resolves to a person actually in the set — the
    // property that makes stringified serials safe here.
    expect(snap.people.some((p) => p.id === jonas.mgr)).toBe(true);
    expect(snap.people.find((p) => p.id === "1")!.mgr).toBeNull();
  });

  it("reads role and team through positions and departments", async () => {
    const snap = await snapshot();
    const arthur = snap.people.find((p) => p.id === "1")!;
    // Operator text, not a key: `format.label()` is `tOr(key, key)`, so a value
    // with no translation renders as itself.
    expect(arthur.role).toBe("COO");
    expect(arthur.team).toBe("Ops");
    // `started_on` is a date, and the app counts leave in day serials.
    expect(arthur.started).toBe(Math.round(Date.UTC(2014, 2, 3) / 86_400_000));
  });

  it("drops a leave type nobody can resolve, and every request using it", async () => {
    // THE WS-I DEFECT THIS PINS. `LeaveTypeKey` is a compile-time union and
    // nothing in the schema carries it, so a type is recognised by its display
    // name. Rename it in the dashboard and its rows stop resolving — dropping
    // them is honest; guessing would put an unstyled chip on the calendar and
    // a wrong number on a balance card.
    const snap = await snapshot();
    expect(Object.keys(snap.leaveTypes).sort()).toEqual(["annual", "sick"]);
    expect(snap.requests.map((r) => r.code)).toEqual(["LR-299", "LR-305"]);
  });

  it("carries the entitlement policy the schema already has a home for", async () => {
    const snap = await snapshot();
    expect(snap.leaveTypes.annual).toMatchObject({ policy: "monthly", perMonth: 1.75, annual: 21 });
    // `upfront` types have no monthly figure, and must not get one.
    expect(snap.leaveTypes.sick.perMonth).toBeUndefined();
    // No column for either: both come from the catalogue, keyed by the type.
    expect(snap.leaveTypes.annual.tint).toBe("var(--lt-annual)");
  });
});

describe("what the schema cannot say", () => {
  it("derives a request code from the row id", async () => {
    const snap = await snapshot();
    expect(snap.requests[0]!.code).toBe("LR-299");
  });

  it("rebuilds the timeline from the one decision the row keeps", async () => {
    const snap = await snapshot();
    const decided = snap.requests.find((r) => r.code === "LR-299")!;
    expect(decided.events.map((e) => e.kind)).toEqual(["submitted", "approved"]);
    expect(decided.events[1]!.by).toBe("1");
    const pending = snap.requests.find((r) => r.code === "LR-305")!;
    expect(pending.events.map((e) => e.kind)).toEqual(["submitted"]);
  });

  it("cannot represent a partial approval, and floors it rather than guessing", async () => {
    // A ten-day request needs two approvals. The row keeps only the final one,
    // so one waiting on its SECOND approver is indistinguishable from one
    // nobody has looked at. Both read 0 — the honest floor.
    const snap = await snapshot();
    expect(snap.requests.find((r) => r.code === "LR-305")!.step).toBe(0);
    // A decided request gets the count its chain needed.
    expect(snap.requests.find((r) => r.code === "LR-299")!.step).toBe(1);
  });

  it("builds onboarding only for people who actually have tasks", async () => {
    const snap = await snapshot();
    expect(snap.hires.map((h) => h.id)).toEqual(["9"]);
    expect(snap.hires[0]!.buddy).toBe("1");
    expect(snap.hires[0]!.tasks.map((t) => t.done)).toEqual([true, false]);
  });
});

describe("the clock and the seam", () => {
  it("turns the tenant's calendar day into a serial", async () => {
    const snap = await snapshot();
    expect(Number.isInteger(snap.now)).toBe(true);
    // Sanity: somewhere after 2020 and before 2100, i.e. a real day count and
    // not a millisecond value that happens to be a number.
    expect(snap.now).toBeGreaterThan(18_000);
    expect(snap.now).toBeLessThan(48_000);
  });

  it("hands back copies, like demoSource does", async () => {
    const connected = snapshotSource(await snapshot());
    connected.requests()[0]!.events.push({ kind: "cancelled", by: "x", at: 0, note: "" });
    expect(connected.requests()[0]!.events).toHaveLength(2);
  });

  it("reports demo mode until a real source is installed", () => {
    expect(isConnected()).toBe(false);
  });

  it("refuses a swap that arrives after the seam has been read", () => {
    // THE SILENT FAILURE THIS PINS, and the one this repo was most exposed to:
    // §5.3 recorded its seam as ORPHANED — seven modules read `demo.ts`
    // directly, so a swap changed nothing anybody could see. `live.ts` is now
    // the single reader, and it reads at module scope.
    source.people();
    expect(() => setDataSource(demoSource)).toThrow(/after the store already read/);
  });
});
