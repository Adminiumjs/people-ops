/**
 * Engine assertions for `lib/leave.ts`.
 *
 * These run against the shipped seed wherever the seed makes the point, so a
 * change to `data/demo.ts` that quietly breaks a balance card or drops the
 * mid-chain request out of the HR queue fails here rather than on screen.
 */

import { describe, expect, it } from "vitest";

import {
  HOLIDAYS,
  LEAVE_TYPES,
  ONBOARDING,
  PEOPLE,
  SEED_REQUESTS,
  TODAY,
  fromSer,
  ser,
} from "../data/demo.ts";
import {
  TWO_STEP_THRESHOLD,
  accruedAsOf,
  approvalChain,
  balanceFor,
  holidaysThisQuarter,
  isFullyApproved,
  isWeekend,
  isWorkday,
  monthGrid,
  nextCode,
  nextTimeOff,
  onboardingProgress,
  outOn,
  pendingQueue,
  stepsNeeded,
  validateRequest,
  workingDays,
} from "./leave.ts";

const person = (id: string) => PEOPLE.find((p) => p.id === id);

describe("day serials", () => {
  it("round-trips a calendar date", () => {
    const s = ser(2026, 7, 28);
    expect(fromSer(s)).toMatchObject({ y: 2026, m: 7, d: 28 });
  });

  it("knows 28 July 2026 is a Tuesday", () => {
    expect(fromSer(TODAY).dow).toBe(2);
    expect(isWeekend(TODAY)).toBe(false);
  });

  it("identifies weekends", () => {
    expect(isWeekend(ser(2026, 8, 1))).toBe(true); // Saturday
    expect(isWeekend(ser(2026, 8, 2))).toBe(true); // Sunday
    expect(isWeekend(ser(2026, 8, 3))).toBe(false); // Monday
  });

  it("treats a public holiday as a non-working day", () => {
    // 3 August 2026 is a Monday AND the seeded Civic Day.
    expect(isWeekend(ser(2026, 8, 3))).toBe(false);
    expect(isWorkday(ser(2026, 8, 3), HOLIDAYS)).toBe(false);
  });
});

describe("working days", () => {
  it("counts a plain Monday-to-Friday week as five", () => {
    const r = workingDays(ser(2026, 7, 6), ser(2026, 7, 10), HOLIDAYS);
    expect(r.count).toBe(5);
    expect(r.skipped).toEqual([]);
  });

  it("excludes the weekend from a nine-day span", () => {
    const r = workingDays(ser(2026, 7, 6), ser(2026, 7, 14), HOLIDAYS);
    expect(r.count).toBe(7);
    expect(r.skipped).toHaveLength(2);
    expect(r.skipped.every((s) => s.why === "weekend")).toBe(true);
  });

  it("excludes a public holiday and names it", () => {
    // Mon 3 Aug is Civic Day; the rest of that week is working.
    const r = workingDays(ser(2026, 8, 3), ser(2026, 8, 7), HOLIDAYS);
    expect(r.count).toBe(4);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].why).toBe("data.holiday.civic");
  });

  it("counts a single working day as one", () => {
    expect(workingDays(ser(2026, 7, 28), ser(2026, 7, 28), HOLIDAYS).count).toBe(1);
  });

  it("counts a weekend-only range as zero", () => {
    const r = workingDays(ser(2026, 8, 1), ser(2026, 8, 2), HOLIDAYS);
    expect(r.count).toBe(0);
    expect(r.skipped).toHaveLength(2);
  });

  it("returns zero for a reversed range rather than a negative count", () => {
    expect(workingDays(ser(2026, 7, 10), ser(2026, 7, 6), HOLIDAYS)).toEqual({
      count: 0,
      skipped: [],
    });
  });
});

describe("accrual", () => {
  it("grants an upfront type its whole year immediately", () => {
    expect(accruedAsOf("sick", TODAY)).toBe(LEAVE_TYPES.sick.annual);
    expect(accruedAsOf("personal", ser(2026, 1, 1))).toBe(3);
    expect(accruedAsOf("volunteer", TODAY)).toBe(2);
  });

  it("accrues a monthly type by the month, on the first", () => {
    // 1.75/month × 7 months by 28 July.
    expect(accruedAsOf("annual", TODAY)).toBe(12.25);
    expect(accruedAsOf("annual", ser(2026, 1, 31))).toBe(1.75);
    expect(accruedAsOf("annual", ser(2026, 4, 2))).toBe(7);
  });

  it("never accrues past the annual entitlement", () => {
    expect(accruedAsOf("annual", ser(2026, 12, 31))).toBe(21);
    expect(accruedAsOf("annual", ser(2026, 12, 31))).toBeLessThanOrEqual(
      LEAVE_TYPES.annual.annual,
    );
  });
});

describe("balances", () => {
  it("charges approved days as used", () => {
    // Maya: LR-299 (5 working days, approved) + LR-302 (5, approved).
    const b = balanceFor("maya", "annual", SEED_REQUESTS, HOLIDAYS, TODAY);
    expect(b.accrued).toBe(12.25);
    expect(b.used).toBe(10);
    expect(b.pending).toBe(0);
    expect(b.remaining).toBe(2.25);
  });

  it("charges pending days too, so the number never flatters", () => {
    // Tom: LR-303 is 10 working days across two weeks, still pending.
    const b = balanceFor("tom", "annual", SEED_REQUESTS, HOLIDAYS, TODAY);
    expect(b.pending).toBe(10);
    expect(b.used).toBe(0);
    expect(b.remaining).toBe(2.25);
  });

  it("ignores rejected requests", () => {
    // Maya's LR-300 (personal) was rejected — it must not consume the day.
    const b = balanceFor("maya", "personal", SEED_REQUESTS, HOLIDAYS, TODAY);
    expect(b.used).toBe(0);
    expect(b.pending).toBe(0);
    expect(b.remaining).toBe(3);
  });

  it("keeps types separate", () => {
    const sick = balanceFor("maya", "sick", SEED_REQUESTS, HOLIDAYS, TODAY);
    expect(sick.used).toBe(0);
    expect(sick.remaining).toBe(10);
  });

  it("returns a clean balance for somebody with no requests", () => {
    const b = balanceFor("yuki", "annual", SEED_REQUESTS, HOLIDAYS, TODAY);
    expect(b.used).toBe(0);
    expect(b.remaining).toBe(12.25);
  });
});

describe("the approval chain", () => {
  it("needs only the manager for five working days or fewer", () => {
    const chain = approvalChain(5, person("maya"), "priya");
    expect(chain).toHaveLength(1);
    expect(chain[0]).toMatchObject({ approver: "jonas", roleKey: "chain.manager" });
  });

  it("chains manager then People ops beyond the threshold", () => {
    const chain = approvalChain(TWO_STEP_THRESHOLD + 1, person("maya"), "priya");
    expect(chain).toHaveLength(2);
    expect(chain[1]).toMatchObject({ approver: "priya", roleKey: "chain.peopleOps" });
  });

  it("derives the step count from the request's own dates", () => {
    const short = { start: ser(2026, 8, 10), end: ser(2026, 8, 14) }; // 5 days
    const long = { start: ser(2026, 8, 10), end: ser(2026, 8, 21) }; //  10 days
    expect(stepsNeeded(short, HOLIDAYS)).toBe(1);
    expect(stepsNeeded(long, HOLIDAYS)).toBe(2);
  });

  it("leaves the seeded two-week request mid-chain", () => {
    const lr303 = SEED_REQUESTS.find((r) => r.code === "LR-303")!;
    expect(stepsNeeded(lr303, HOLIDAYS)).toBe(2);
    expect(lr303.step).toBe(1);
    expect(isFullyApproved(lr303, HOLIDAYS)).toBe(false);
    expect(lr303.status).toBe("pending");
  });

  it("counts a one-step request signed once as fully approved", () => {
    const lr299 = SEED_REQUESTS.find((r) => r.code === "LR-299")!;
    expect(stepsNeeded(lr299, HOLIDAYS)).toBe(1);
    expect(isFullyApproved(lr299, HOLIDAYS)).toBe(true);
  });

  it("handles the one person with no manager", () => {
    const chain = approvalChain(3, person("arthur"), "priya");
    expect(chain[0].approver).toBeNull();
  });
});

describe("submission validation", () => {
  const ok = (r: ReturnType<typeof validateRequest>) => r.ok;

  it("accepts a request that fits the balance", () => {
    const r = validateRequest(
      "yuki", "annual", ser(2026, 8, 10), ser(2026, 8, 14),
      SEED_REQUESTS, HOLIDAYS, TODAY,
    );
    expect(ok(r)).toBe(true);
    if (r.ok) expect(r.days).toBe(5);
  });

  it("refuses an empty or reversed range", () => {
    expect(validateRequest("yuki", "annual", null, null, SEED_REQUESTS, HOLIDAYS, TODAY))
      .toMatchObject({ ok: false, reason: "empty" });
    expect(
      validateRequest("yuki", "annual", ser(2026, 8, 14), ser(2026, 8, 10), SEED_REQUESTS, HOLIDAYS, TODAY),
    ).toMatchObject({ ok: false, reason: "empty" });
  });

  it("refuses a start in the past", () => {
    expect(
      validateRequest("yuki", "annual", ser(2026, 7, 1), ser(2026, 7, 3), SEED_REQUESTS, HOLIDAYS, TODAY),
    ).toMatchObject({ ok: false, reason: "past" });
  });

  it("refuses a range with no working day in it", () => {
    expect(
      validateRequest("yuki", "annual", ser(2026, 8, 1), ser(2026, 8, 2), SEED_REQUESTS, HOLIDAYS, TODAY),
    ).toMatchObject({ ok: false, reason: "nonWorking" });
  });

  it("refuses an over-balance request and says exactly how short it is", () => {
    // Maya has 2.25 annual days left; ask for five.
    const r = validateRequest(
      "maya", "annual", ser(2026, 9, 14), ser(2026, 9, 18),
      SEED_REQUESTS, HOLIDAYS, TODAY,
    );
    expect(r).toMatchObject({ ok: false, reason: "insufficient" });
    if (!r.ok) expect(r.short).toBe(2.75);
  });

  it("does not charge for the holiday inside a range", () => {
    // Mon 3 Aug is Civic Day, so 3–7 Aug is four working days, not five.
    const r = validateRequest(
      "yuki", "annual", ser(2026, 8, 3), ser(2026, 8, 7),
      SEED_REQUESTS, HOLIDAYS, TODAY,
    );
    expect(ok(r)).toBe(true);
    if (r.ok) expect(r.days).toBe(4);
  });
});

describe("queues and lookups", () => {
  it("returns pending requests oldest submission first", () => {
    const q = pendingQueue(SEED_REQUESTS);
    expect(q).toHaveLength(2);
    expect(q.map((r) => r.code)).toEqual(["LR-303", "LR-304"]);
  });

  it("finds who is out on a given day from approved leave only", () => {
    // Elif's sick leave covers 27–29 July; LR-304 is pending, so Dana is out.
    const out = outOn(TODAY, SEED_REQUESTS, PEOPLE);
    expect(out.map((o) => o.person.id)).toContain("elif");
    const volunteerDay = outOn(ser(2026, 8, 7), SEED_REQUESTS, PEOPLE);
    expect(volunteerDay.map((o) => o.person.id)).not.toContain("dana");
  });

  it("finds the next approved future leave", () => {
    const next = nextTimeOff("maya", SEED_REQUESTS, TODAY);
    expect(next?.code).toBe("LR-302");
  });

  it("returns null when there is nothing booked ahead", () => {
    expect(nextTimeOff("yuki", SEED_REQUESTS, TODAY)).toBeNull();
  });

  it("lists the holidays left in the current quarter", () => {
    // Q3 2026 is Jul–Sep: Civic Day (3 Aug) and Labour Day (7 Sep) both fall in it.
    const hs = holidaysThisQuarter(HOLIDAYS, TODAY);
    expect(hs.map((h) => h.name)).toEqual([
      "data.holiday.civic",
      "data.holiday.labour",
    ]);
  });

  it("mints the next code from the highest seeded one", () => {
    expect(nextCode(SEED_REQUESTS)).toBe("LR-305");
    expect(nextCode([])).toBe("LR-1");
  });
});

describe("the month grid", () => {
  const grid = monthGrid(2026, 8, SEED_REQUESTS, PEOPLE, HOLIDAYS);

  it("pads to whole weeks", () => {
    expect(grid.length % 7).toBe(0);
  });

  it("starts on a Monday", () => {
    expect(fromSer(grid[0].serial).dow).toBe(1);
  });

  it("marks days outside the month", () => {
    expect(grid[0].inMonth).toBe(false); // 27 July
    expect(grid.some((c) => c.inMonth)).toBe(true);
  });

  it("covers every day of August exactly once", () => {
    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
  });

  it("carries the holiday on its cell", () => {
    const civic = grid.find((c) => c.serial === ser(2026, 8, 3))!;
    expect(civic.holiday?.name).toBe("data.holiday.civic");
  });

  it("shows pending absences but flags them", () => {
    const day = grid.find((c) => c.serial === ser(2026, 8, 7))!;
    const dana = day.absences.find((a) => a.person.id === "dana");
    expect(dana).toBeDefined();
    expect(dana?.pending).toBe(true);
  });

  it("shows an approved absence as confirmed", () => {
    const day = grid.find((c) => c.serial === ser(2026, 8, 25))!;
    const maya = day.absences.find((a) => a.person.id === "maya");
    expect(maya?.pending).toBe(false);
  });
});

describe("onboarding progress", () => {
  it("is the completed fraction", () => {
    const noa = ONBOARDING.find((h) => h.id === "noa")!;
    const owen = ONBOARDING.find((h) => h.id === "owen")!;
    expect(onboardingProgress(noa.tasks)).toBeCloseTo(3 / 8, 6);
    expect(onboardingProgress(owen.tasks)).toBeCloseTo(6 / 8, 6);
  });

  it("is zero for an empty checklist rather than NaN", () => {
    expect(onboardingProgress([])).toBe(0);
  });

  it("reaches one when everything is ticked", () => {
    expect(onboardingProgress([{ done: true }, { done: true }])).toBe(1);
  });
});
