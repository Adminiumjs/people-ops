-- People Ops — PostgreSQL schema (manifest §requiredSchema contract).
--
-- This is the real database behind the full self-host stack: the people desk
-- reads it (through Adminium's records API) and the auto-generated Adminium
-- dashboard is the back office that runs it. Applied automatically on first
-- boot of the `hr-db` container via /docker-entrypoint-initdb.d/01-schema.sql,
-- then seeded by 02-seed.sql. The seed mirrors src/data/demo.ts one-for-one
-- (the same twenty-four people, the same four leave types, the same six
-- requests and the same two onboarding boards) so the desk and the dashboard
-- show the same company.
--
-- Eight tables. The split is deliberate: the desk owns the day — a balance, a
-- request, a decision, a checklist — and the generated dashboard owns the
-- records behind it.
--
-- SCOPE NOTE: there is no payroll in this product. No column below holds a
-- salary, a rate or any other figure of that kind, and none ever will. Scope
-- is leave, people and onboarding. That is a boundary, not an omission.
--
-- Dates that name a day are `date`, because leave is counted in whole days and
-- a whole day must not drift across a timezone boundary. Only the audit
-- instants — when a request was raised, when it was decided — are timestamptz.

DROP TABLE IF EXISTS onboarding_tasks CASCADE;
DROP TABLE IF EXISTS onboarding_templates CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Org ------------------------------------------------------------------------

CREATE TABLE departments (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE                          -- 'Design', 'Workshop', 'Ops'
);

-- A job title, owned by exactly one department. The desk's directory groups by
-- the department reached through here, which is why nobody carries a team
-- string of their own.
CREATE TABLE positions (
  id            serial PRIMARY KEY,
  department_id integer NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  title         text    NOT NULL,
  UNIQUE (department_id, title)
);

-- People ---------------------------------------------------------------------

-- `initials` and `tint` drive the avatar the desk renders when `avatar` is
-- empty, and the demo renders nothing else — there are no bitmaps in this app.
--
-- `manager_id` is self-referential and nullable: exactly one person, the person
-- at the top, has no manager. ON DELETE SET NULL rather than CASCADE, because
-- losing a manager must never take their reports with them.
--
-- `status` is where someone stands today, not a history: 'on_leave' is the
-- person whose approved leave covers the current date.
--
-- `buddy_id` is the colleague walking a new starter through their first weeks —
-- the "Buddy: Rosa" chip the desk draws on an onboarding board. It is not the
-- manager and deliberately not derived from one: a buddy is usually a peer, and
-- the whole point is that they are someone other than the person signing your
-- leave. Only new starters carry one, so it is NULL for everybody else.
CREATE TABLE employees (
  id          serial PRIMARY KEY,
  name        text    NOT NULL,
  email       text    NOT NULL UNIQUE,
  initials    text    NOT NULL,
  avatar      text    NOT NULL DEFAULT '',
  tint        text    NOT NULL DEFAULT '#7d8ba0',
  position_id integer NOT NULL REFERENCES positions (id) ON DELETE RESTRICT,
  manager_id  integer REFERENCES employees (id) ON DELETE SET NULL,
  buddy_id    integer REFERENCES employees (id) ON DELETE SET NULL,
  started_on  date    NOT NULL,
  status      text    NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'on_leave', 'left')),
  city        text    NOT NULL DEFAULT '',
  -- Nobody manages themselves. Cheap to state, tedious to debug otherwise.
  CONSTRAINT employees_manager_not_self CHECK (manager_id IS NULL OR manager_id <> id),
  -- Nor is anybody their own buddy.
  CONSTRAINT employees_buddy_not_self CHECK (buddy_id IS NULL OR buddy_id <> id)
);

-- Leave ----------------------------------------------------------------------

-- `accrual` is the whole of the balance story. 'upfront' grants `annual_days`
-- on the first day of the leave year; 'monthly' releases `per_month` on the
-- first of each month, which is why a balance card can honestly read
-- "12.25 of 21 accrued". `per_month` is therefore required exactly when the
-- policy is monthly, and meaningless otherwise.
CREATE TABLE leave_types (
  id          serial PRIMARY KEY,
  name        text    NOT NULL,
  short_name  text    NOT NULL,                      -- chips and calendar bars
  annual_days numeric(5, 2) NOT NULL CHECK (annual_days >= 0),
  accrual     text    NOT NULL DEFAULT 'upfront'
                      CHECK (accrual IN ('upfront', 'monthly')),
  per_month   numeric(5, 2),
  color       text    NOT NULL DEFAULT '#0e7490',
  CONSTRAINT leave_types_accrual_shape CHECK (
    (accrual = 'monthly' AND per_month IS NOT NULL) OR
    (accrual = 'upfront' AND per_month IS NULL)
  )
);

-- One row per request, with its decision folded in rather than a separate
-- event log — the desk shows a two-step timeline, the dashboard shows a record.
--
-- `status` carries the approval chain. A request of five working days or fewer
-- needs one signature and goes 'pending' → 'approved'. A longer one needs two,
-- and 'manager_approved' is the middle state: the manager has signed, People
-- Ops has not. The threshold itself is the `escalation_days` setting.
--
-- `working_days` is stored rather than derived, because it was counted against
-- the holiday calendar as it stood on the day the request was raised, and a
-- holiday added later must not silently re-measure a decision already made.
--
-- `note` is what the person wrote when they asked. `decision_note` is what the
-- approver wrote back. Both are prose, both are optional, and neither is ever
-- the same field.
CREATE TABLE leave_requests (
  id            serial PRIMARY KEY,
  employee_id   integer NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  type_id       integer NOT NULL REFERENCES leave_types (id) ON DELETE RESTRICT,
  starts_on     date    NOT NULL,
  ends_on       date    NOT NULL,
  working_days  integer NOT NULL CHECK (working_days >= 0),
  status        text    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'manager_approved', 'approved',
                                          'rejected', 'cancelled')),
  -- Who signed last. Kept when they leave the company, so the audit trail
  -- survives them; the row is only orphaned, never rewritten.
  decided_by    integer REFERENCES employees (id) ON DELETE SET NULL,
  decided_at    timestamptz,
  note          text    NOT NULL DEFAULT '',
  decision_note text    NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_range CHECK (ends_on >= starts_on),
  -- A settled request names who settled it; an open one cannot.
  CONSTRAINT leave_requests_decision_shape CHECK (
    (status IN ('pending', 'cancelled') AND decided_by IS NULL) OR
    (status IN ('manager_approved', 'approved', 'rejected') AND decided_by IS NOT NULL)
  )
);

-- Dated, not recurring: a public holiday moves, and the desk would rather be
-- told than guess. One row per company-wide day off, and the day is unique.
CREATE TABLE holidays (
  id      serial PRIMARY KEY,
  name    text NOT NULL,
  on_date date NOT NULL UNIQUE
);

-- Onboarding -----------------------------------------------------------------

CREATE TABLE onboarding_templates (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- Both the template and the stamped copy live here. A row with `employee_id`
-- NULL is the template line — the checklist as written. A row with an
-- `employee_id` is that line stamped onto one new starter, and `done` is only
-- ever meaningful there.
--
-- `due_offset_days` counts from the starter's first day: -7 is a week before
-- they arrive, 0 is day one, 7 is the end of week one. Storing the offset
-- rather than a date is what lets one template serve every start date.
CREATE TABLE onboarding_tasks (
  id              serial PRIMARY KEY,
  template_id     integer NOT NULL REFERENCES onboarding_templates (id) ON DELETE CASCADE,
  employee_id     integer REFERENCES employees (id) ON DELETE CASCADE,
  title           text    NOT NULL,
  phase           text    NOT NULL DEFAULT 'before'
                          CHECK (phase IN ('before', 'day_1', 'week_1', 'month_1')),
  due_offset_days integer NOT NULL DEFAULT 0,
  done            boolean NOT NULL DEFAULT false,
  -- An unstamped template line is never ticked; only a starter's copy is.
  CONSTRAINT onboarding_tasks_template_not_done CHECK (employee_id IS NOT NULL OR done = false)
);

-- Indexes the dashboard's list pages lean on ---------------------------------

CREATE INDEX ON positions (department_id);
CREATE INDEX ON employees (position_id);
CREATE INDEX ON employees (manager_id);
CREATE INDEX ON employees (buddy_id) WHERE buddy_id IS NOT NULL;
CREATE INDEX ON employees (status, name);
CREATE INDEX ON employees (started_on);
CREATE INDEX ON leave_requests (employee_id, starts_on DESC);
CREATE INDEX ON leave_requests (type_id);
CREATE INDEX ON leave_requests (decided_by);
-- The team calendar: everything overlapping a month window.
CREATE INDEX ON leave_requests (starts_on, ends_on);
-- The approvals inbox: what is still owed a signature, oldest first.
CREATE INDEX ON leave_requests (status, created_at)
  WHERE status IN ('pending', 'manager_approved');
CREATE INDEX ON holidays (on_date);
CREATE INDEX ON onboarding_tasks (template_id, due_offset_days);
-- One starter's board, in the order the desk draws it.
CREATE INDEX ON onboarding_tasks (employee_id, due_offset_days) WHERE employee_id IS NOT NULL;
