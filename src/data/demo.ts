/**
 * Seeded demo data — Foundry, a fictional ~120-person design-and-manufacturing
 * company. Twenty-four of them are visible here.
 *
 * Dates are stored as DAY SERIALS — whole days since the Unix epoch in UTC —
 * rather than `Date` objects. Leave is counted in whole days, and a serial
 * cannot drift across a timezone boundary the way a local `Date` at midnight
 * can, which is the bug class this representation exists to remove.
 *
 * Translatable prose (roles, cities, holiday names, decision notes, onboarding
 * tasks) is stored as an i18n KEY. Proper nouns — people's names — are never
 * translated and are stored literally.
 */

import type {
  Holiday,
  LeaveRequest,
  LeaveType,
  LeaveTypeKey,
  NewHire,
  Person,
} from "./types.ts";

/** Whole days since the epoch for a Y/M/D, in UTC. */
export function ser(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Back to a UTC calendar date + weekday. */
export function fromSer(s: number): {
  y: number;
  m: number;
  d: number;
  dow: number;
} {
  const dt = new Date(s * 86_400_000);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    dow: dt.getUTCDay(),
  };
}

/** A serial as a `Date` at UTC midnight — what `Intl` formatters take. */
export function serDate(s: number): Date {
  return new Date(s * 86_400_000);
}

/** The pinned clock: Tuesday, 28 July 2026. Nothing reads `Date.now()`. */
export const TODAY = ser(2026, 7, 28);

export const LEAVE_TYPES: Record<LeaveTypeKey, LeaveType> = {
  annual: {
    key: "annual",
    name: "data.leave.annual",
    short: "data.leave.annual.short",
    icon: "plane",
    tint: "var(--lt-annual)",
    tintSoft: "var(--lt-annual-soft)",
    policy: "monthly",
    perMonth: 1.75,
    annual: 21,
  },
  sick: {
    key: "sick",
    name: "data.leave.sick",
    short: "data.leave.sick.short",
    icon: "thermometer",
    tint: "var(--lt-sick)",
    tintSoft: "var(--lt-sick-soft)",
    policy: "upfront",
    annual: 10,
  },
  personal: {
    key: "personal",
    name: "data.leave.personal",
    short: "data.leave.personal.short",
    icon: "coffee",
    tint: "var(--lt-personal)",
    tintSoft: "var(--lt-personal-soft)",
    policy: "upfront",
    annual: 3,
  },
  volunteer: {
    key: "volunteer",
    name: "data.leave.volunteer",
    short: "data.leave.volunteer.short",
    icon: "hand-heart",
    tint: "var(--lt-volunteer)",
    tintSoft: "var(--lt-volunteer-soft)",
    policy: "upfront",
    annual: 2,
  },
};

export const LEAVE_TYPE_KEYS: LeaveTypeKey[] = [
  "annual",
  "sick",
  "personal",
  "volunteer",
];

/** Two public holidays inside the quarter, so the picker visibly skips them. */
export const HOLIDAYS: Holiday[] = [
  { serial: ser(2026, 8, 3), name: "data.holiday.civic" },
  { serial: ser(2026, 9, 7), name: "data.holiday.labour" },
];

export const PEOPLE: Person[] = [
  { id: "arthur", name: "Arthur Boone", ini: "AB", role: "data.job.coo", team: "Ops", city: "data.city.rotterdam", mgr: null, tint: "#7d8ba0", started: ser(2014, 3, 3) },
  { id: "jonas", name: "Jonas Wilde", ini: "JW", role: "data.job.designLead", team: "Design", city: "data.city.rotterdam", mgr: "arthur", tint: "#6f8bb0", started: ser(2017, 9, 4) },
  { id: "henrik", name: "Henrik Voss", ini: "HV", role: "data.job.workshopManager", team: "Workshop", city: "data.city.rotterdam", mgr: "arthur", tint: "#8a7ba6", started: ser(2015, 6, 1) },
  { id: "priya", name: "Priya Nair", ini: "PN", role: "data.job.peopleOpsLead", team: "Ops", city: "data.city.rotterdam", mgr: "arthur", tint: "#b07d9a", started: ser(2019, 2, 11) },
  { id: "sam", name: "Sam Whitfield", ini: "SW", role: "data.job.facilitiesManager", team: "Ops", city: "data.city.rotterdam", mgr: "arthur", tint: "#7d9166", started: ser(2016, 10, 17) },
  { id: "maya", name: "Maya Torres", ini: "MT", role: "data.job.industrialDesigner", team: "Design", city: "data.city.antwerp", mgr: "jonas", tint: "#b0836a", started: ser(2022, 4, 19) },
  { id: "dana", name: "Dana Okafor", ini: "DO", role: "data.job.productDesigner", team: "Design", city: "data.city.rotterdam", mgr: "jonas", tint: "#9a7fb0", started: ser(2021, 8, 2) },
  { id: "iris", name: "Iris Chen", ini: "IC", role: "data.job.cmfDesigner", team: "Design", city: "data.city.antwerp", mgr: "jonas", tint: "#6a86ab", started: ser(2023, 1, 9) },
  { id: "leo", name: "Leo Marchetti", ini: "LM", role: "data.job.designTechnologist", team: "Design", city: "data.city.remote", mgr: "jonas", tint: "#c08a6a", started: ser(2020, 11, 2) },
  { id: "sana", name: "Sana Qureshi", ini: "SQ", role: "data.job.designResearcher", team: "Design", city: "data.city.utrecht", mgr: "jonas", tint: "#8a9a6a", started: ser(2024, 5, 6) },
  { id: "felix", name: "Felix Braun", ini: "FB", role: "data.job.visualiser", team: "Design", city: "data.city.remote", mgr: "jonas", tint: "#a8846f", started: ser(2023, 10, 16) },
  { id: "wren", name: "Wren Kowalski", ini: "WK", role: "data.job.juniorDesigner", team: "Design", city: "data.city.rotterdam", mgr: "jonas", tint: "#b58a6a", started: ser(2025, 9, 1) },
  { id: "elif", name: "Elif Demir", ini: "ED", role: "data.job.fabricationLead", team: "Workshop", city: "data.city.rotterdam", mgr: "henrik", tint: "#b07d9a", started: ser(2018, 4, 9) },
  { id: "kofi", name: "Kofi Mensah", ini: "KM", role: "data.job.cncMachinist", team: "Workshop", city: "data.city.rotterdam", mgr: "elif", tint: "#6f8bb0", started: ser(2020, 2, 3) },
  { id: "rosa", name: "Rosa Delgado", ini: "RD", role: "data.job.finishing", team: "Workshop", city: "data.city.rotterdam", mgr: "elif", tint: "#b0836a", started: ser(2019, 7, 15) },
  { id: "jules", name: "Jules Perrin", ini: "JP", role: "data.job.prototypeBuilder", team: "Workshop", city: "data.city.antwerp", mgr: "elif", tint: "#7d9166", started: ser(2021, 3, 22) },
  { id: "anya", name: "Anya Sokolova", ini: "AS", role: "data.job.materialsTech", team: "Workshop", city: "data.city.rotterdam", mgr: "henrik", tint: "#9a7fb0", started: ser(2022, 9, 12) },
  { id: "marcus", name: "Marcus Reed", ini: "MR", role: "data.job.welder", team: "Workshop", city: "data.city.rotterdam", mgr: "henrik", tint: "#6a86ab", started: ser(2017, 1, 30) },
  { id: "bea", name: "Bea Fontaine", ini: "BF", role: "data.job.upholsterer", team: "Workshop", city: "data.city.antwerp", mgr: "henrik", tint: "#c08a6a", started: ser(2020, 6, 8) },
  { id: "omar", name: "Omar Haddad", ini: "OH", role: "data.job.assemblyTech", team: "Workshop", city: "data.city.rotterdam", mgr: "elif", tint: "#8a9a6a", started: ser(2024, 2, 5) },
  { id: "tom", name: "Tom Alvarez", ini: "TA", role: "data.job.logisticsCoord", team: "Ops", city: "data.city.rotterdam", mgr: "sam", tint: "#a8846f", started: ser(2021, 11, 8) },
  { id: "grace", name: "Grace Liu", ini: "GL", role: "data.job.opsAnalyst", team: "Ops", city: "data.city.utrecht", mgr: "arthur", tint: "#b58a6a", started: ser(2023, 6, 12) },
  { id: "nadia", name: "Nadia Petrova", ini: "NP", role: "data.job.supplyPlanner", team: "Ops", city: "data.city.rotterdam", mgr: "sam", tint: "#7d8ba0", started: ser(2022, 1, 10) },
  { id: "yuki", name: "Yuki Tanaka", ini: "YT", role: "data.job.itSupport", team: "Ops", city: "data.city.remote", mgr: "sam", tint: "#8a7ba6", started: ser(2023, 3, 20) },
];

/** The signed-in employee, and the People Ops person on the HR side. */
export const ME = "maya";
export const HR_PERSON = "priya";

/**
 * Six seeded requests in mixed states. Codes end at LR-304, so the first live
 * submission mints LR-305 — the house gag, and a way to prove the counter is
 * derived rather than hard-coded.
 *
 * LR-303 is deliberately mid-chain: twelve calendar days is more than five
 * working days, so it needs manager THEN People ops; its manager has signed,
 * `step` is 1, and it still sits in the HR queue.
 */
export const SEED_REQUESTS: LeaveRequest[] = [
  {
    code: "LR-299", person: "maya", type: "annual",
    start: ser(2026, 6, 8), end: ser(2026, 6, 12), status: "approved", step: 1,
    events: [
      { kind: "submitted", by: "maya", at: ser(2026, 6, 1), note: "" },
      { kind: "approved", by: "jonas", at: ser(2026, 6, 2), note: "data.note.lr299" },
    ],
  },
  {
    code: "LR-300", person: "maya", type: "personal",
    start: ser(2026, 7, 10), end: ser(2026, 7, 10), status: "rejected", step: 1,
    events: [
      { kind: "submitted", by: "maya", at: ser(2026, 7, 2), note: "data.note.lr300sub" },
      { kind: "rejected", by: "jonas", at: ser(2026, 7, 3), note: "data.note.lr300" },
    ],
  },
  {
    code: "LR-301", person: "elif", type: "sick",
    start: ser(2026, 7, 27), end: ser(2026, 7, 29), status: "approved", step: 1,
    events: [
      { kind: "submitted", by: "elif", at: ser(2026, 7, 27), note: "data.note.lr301sub" },
      { kind: "approved", by: "henrik", at: ser(2026, 7, 27), note: "data.note.lr301" },
    ],
  },
  {
    code: "LR-302", person: "maya", type: "annual",
    start: ser(2026, 8, 24), end: ser(2026, 8, 28), status: "approved", step: 1,
    events: [
      { kind: "submitted", by: "maya", at: ser(2026, 7, 14), note: "data.note.lr302sub" },
      { kind: "approved", by: "jonas", at: ser(2026, 7, 15), note: "data.note.lr302" },
    ],
  },
  {
    code: "LR-303", person: "tom", type: "annual",
    start: ser(2026, 8, 10), end: ser(2026, 8, 21), status: "pending", step: 1,
    events: [
      { kind: "submitted", by: "tom", at: ser(2026, 7, 20), note: "data.note.lr303sub" },
      { kind: "approved", by: "sam", at: ser(2026, 7, 21), note: "data.note.lr303" },
    ],
  },
  {
    code: "LR-304", person: "dana", type: "volunteer",
    start: ser(2026, 8, 7), end: ser(2026, 8, 7), status: "pending", step: 0,
    events: [
      { kind: "submitted", by: "dana", at: ser(2026, 7, 26), note: "data.note.lr304sub" },
    ],
  },
];

/** Two hires at deliberately different progress, so the ring is not decorative. */
export const ONBOARDING: NewHire[] = [
  {
    id: "noa", name: "Noa Lindqvist", ini: "NL", role: "data.job.juniorFabricator",
    team: "Workshop", tint: "#6f8bb0", starts: ser(2026, 8, 10), buddy: "rosa",
    tasks: [
      { id: "n1", group: "data.ob.before", due: "data.ob.dayMinus7", label: "data.ob.offer", done: true },
      { id: "n2", group: "data.ob.before", due: "data.ob.dayMinus5", label: "data.ob.ppe", done: true },
      { id: "n3", group: "data.ob.before", due: "data.ob.dayMinus3", label: "data.ob.accountsFloor", done: true },
      { id: "n4", group: "data.ob.day1", due: "data.ob.day1chip", label: "data.ob.safety", done: false },
      { id: "n5", group: "data.ob.day1", due: "data.ob.day1chip", label: "data.ob.tour", done: false },
      { id: "n6", group: "data.ob.week1", due: "data.ob.week1chip", label: "data.ob.shadowRosa", done: false },
      { id: "n7", group: "data.ob.week1", due: "data.ob.week1chip", label: "data.ob.firstCut", done: false },
      { id: "n8", group: "data.ob.month1", due: "data.ob.week4chip", label: "data.ob.checkinElif", done: false },
    ],
  },
  {
    id: "owen", name: "Owen Gallagher", ini: "OG", role: "data.job.opsCoordinator",
    team: "Ops", tint: "#7d9166", starts: ser(2026, 7, 20), buddy: "nadia",
    tasks: [
      { id: "o1", group: "data.ob.before", due: "data.ob.dayMinus7", label: "data.ob.offer", done: true },
      { id: "o2", group: "data.ob.before", due: "data.ob.dayMinus3", label: "data.ob.accountsOps", done: true },
      { id: "o3", group: "data.ob.day1", due: "data.ob.day1chip", label: "data.ob.coffee", done: true },
      { id: "o4", group: "data.ob.day1", due: "data.ob.day1chip", label: "data.ob.laptop", done: true },
      { id: "o5", group: "data.ob.week1", due: "data.ob.week1chip", label: "data.ob.shadowTom", done: true },
      { id: "o6", group: "data.ob.week1", due: "data.ob.week1chip", label: "data.ob.playbook", done: true },
      { id: "o7", group: "data.ob.month1", due: "data.ob.week3chip", label: "data.ob.dispatch", done: false },
      { id: "o8", group: "data.ob.month1", due: "data.ob.week4chip", label: "data.ob.checkinSam", done: false },
    ],
  },
];

/** The order onboarding groups are shown in — not alphabetical, chronological. */
export const ONBOARDING_GROUPS = [
  "data.ob.before",
  "data.ob.day1",
  "data.ob.week1",
  "data.ob.month1",
] as const;

export const TEAMS = ["Design", "Workshop", "Ops"] as const;
