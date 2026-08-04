-- People Ops — seed data.
--
-- Mirrors src/data/demo.ts one-for-one: the same twenty-four people of
-- Foundry's ~120, the same three teams, the same four leave types, the same
-- two public holidays, the same six requests LR-299 to LR-304 in the same
-- states, and the same two onboarding boards at the same progress. Run the
-- desk and the generated dashboard side by side and they show one company.
--
-- The clock is pinned exactly as the app pins it: "now" is Tuesday
-- 28 July 2026. Nothing here is relative to the machine that loads it, so the
-- dashboard shows Elif out sick today and Tom's twelve-day request sitting
-- mid-chain, the same as the desk does.
--
-- Ids are explicit so they are stable across loads, and every sequence is
-- reset with setval at the end so a row created afterwards cannot collide.
-- Requests are the one place that matters twice: their ids ARE their codes —
-- LR-299 is row 299 — so the first request raised after this seed mints
-- LR-305, which is what the app promises.
--
-- Instants land at UTC midnight on purpose. Leave is counted in whole days;
-- the app never recorded a time of day, so neither does this.
--
-- Everything here is demo fiction. Foundry is not a real company, the people
-- are invented, and the email addresses are on a reserved domain that can
-- never receive mail.

BEGIN;

-- Org ------------------------------------------------------------------------

INSERT INTO departments (id, name) VALUES
  (1, 'Design'),
  (2, 'Workshop'),
  (3, 'Ops');

INSERT INTO positions (id, department_id, title) VALUES
  (1,  1, 'Design Lead'),
  (2,  1, 'Industrial Designer'),
  (3,  1, 'Product Designer'),
  (4,  1, 'CMF Designer'),
  (5,  1, 'Design Technologist'),
  (6,  1, 'Design Researcher'),
  (7,  1, '3D Visualiser'),
  (8,  1, 'Junior Designer'),
  (9,  2, 'Workshop Manager'),
  (10, 2, 'Fabrication Lead'),
  (11, 2, 'CNC Machinist'),
  (12, 2, 'Finishing Specialist'),
  (13, 2, 'Prototype Builder'),
  (14, 2, 'Materials Technician'),
  (15, 2, 'Welder & Fitter'),
  (16, 2, 'Upholsterer'),
  (17, 2, 'Assembly Technician'),
  (18, 2, 'Junior Fabricator'),
  (19, 3, 'Chief Operating Officer'),
  (20, 3, 'People Ops Lead'),
  (21, 3, 'Facilities Manager'),
  (22, 3, 'Logistics Coordinator'),
  (23, 3, 'Operations Analyst'),
  (24, 3, 'Supply Planner'),
  (25, 3, 'IT Support'),
  (26, 3, 'Ops Coordinator');

-- People ---------------------------------------------------------------------

-- Ids follow demo.ts order, so employee 6 is Maya — the signed-in person on the
-- employee side — and employee 4 is Priya, who works the People Ops queue.
--
-- Elif (13) is the one person not 'active': her approved sick leave covers
-- 27 to 29 July, and the pinned today is the 28th. She is who the desk's
-- "who is out today" strip names, and she is who the dashboard shows out too.
--
-- Noa (25) starts on 10 August — after the pinned today. A starter whose first
-- day has not arrived is carried as active with a future `started_on`; what
-- says they are not at a bench yet is their onboarding board, not their status.
--
-- `buddy_id` is set for exactly the two starters and nobody else, matching the
-- desk: Rosa (15) walks Noa in, Nadia (23) walks Owen in. Both are peers rather
-- than either starter's manager, which is the point of a buddy.
--
-- Rows reference ids defined later in this same statement (Noa's buddy is row
-- 15, Kofi's manager is row 13). That is safe: PostgreSQL queues foreign-key
-- checks as after-row triggers and fires them at the end of the statement, by
-- which time every row above exists.
INSERT INTO employees
  (id, name, email, initials, tint, position_id, manager_id, buddy_id, started_on, status, city)
VALUES
  (1,  'Arthur Boone',    'arthur.boone@foundry.example',    'AB', '#7d8ba0', 19, NULL, NULL, '2014-03-03', 'active',   'Rotterdam'),
  (2,  'Jonas Wilde',     'jonas.wilde@foundry.example',     'JW', '#6f8bb0', 1,  1,    NULL, '2017-09-04', 'active',   'Rotterdam'),
  (3,  'Henrik Voss',     'henrik.voss@foundry.example',     'HV', '#8a7ba6', 9,  1,    NULL, '2015-06-01', 'active',   'Rotterdam'),
  (4,  'Priya Nair',      'priya.nair@foundry.example',      'PN', '#b07d9a', 20, 1,    NULL, '2019-02-11', 'active',   'Rotterdam'),
  (5,  'Sam Whitfield',   'sam.whitfield@foundry.example',   'SW', '#7d9166', 21, 1,    NULL, '2016-10-17', 'active',   'Rotterdam'),
  (6,  'Maya Torres',     'maya.torres@foundry.example',     'MT', '#b0836a', 2,  2,    NULL, '2022-04-19', 'active',   'Antwerp'),
  (7,  'Dana Okafor',     'dana.okafor@foundry.example',     'DO', '#9a7fb0', 3,  2,    NULL, '2021-08-02', 'active',   'Rotterdam'),
  (8,  'Iris Chen',       'iris.chen@foundry.example',       'IC', '#6a86ab', 4,  2,    NULL, '2023-01-09', 'active',   'Antwerp'),
  (9,  'Leo Marchetti',   'leo.marchetti@foundry.example',   'LM', '#c08a6a', 5,  2,    NULL, '2020-11-02', 'active',   'Remote'),
  (10, 'Sana Qureshi',    'sana.qureshi@foundry.example',    'SQ', '#8a9a6a', 6,  2,    NULL, '2024-05-06', 'active',   'Utrecht'),
  (11, 'Felix Braun',     'felix.braun@foundry.example',     'FB', '#a8846f', 7,  2,    NULL, '2023-10-16', 'active',   'Remote'),
  (12, 'Wren Kowalski',   'wren.kowalski@foundry.example',   'WK', '#b58a6a', 8,  2,    NULL, '2025-09-01', 'active',   'Rotterdam'),
  (13, 'Elif Demir',      'elif.demir@foundry.example',      'ED', '#b07d9a', 10, 3,    NULL, '2018-04-09', 'on_leave', 'Rotterdam'),
  (14, 'Kofi Mensah',     'kofi.mensah@foundry.example',     'KM', '#6f8bb0', 11, 13,   NULL, '2020-02-03', 'active',   'Rotterdam'),
  (15, 'Rosa Delgado',    'rosa.delgado@foundry.example',    'RD', '#b0836a', 12, 13,   NULL, '2019-07-15', 'active',   'Rotterdam'),
  (16, 'Jules Perrin',    'jules.perrin@foundry.example',    'JP', '#7d9166', 13, 13,   NULL, '2021-03-22', 'active',   'Antwerp'),
  (17, 'Anya Sokolova',   'anya.sokolova@foundry.example',   'AS', '#9a7fb0', 14, 3,    NULL, '2022-09-12', 'active',   'Rotterdam'),
  (18, 'Marcus Reed',     'marcus.reed@foundry.example',     'MR', '#6a86ab', 15, 3,    NULL, '2017-01-30', 'active',   'Rotterdam'),
  (19, 'Bea Fontaine',    'bea.fontaine@foundry.example',    'BF', '#c08a6a', 16, 3,    NULL, '2020-06-08', 'active',   'Antwerp'),
  (20, 'Omar Haddad',     'omar.haddad@foundry.example',     'OH', '#8a9a6a', 17, 13,   NULL, '2024-02-05', 'active',   'Rotterdam'),
  (21, 'Tom Alvarez',     'tom.alvarez@foundry.example',     'TA', '#a8846f', 22, 5,    NULL, '2021-11-08', 'active',   'Rotterdam'),
  (22, 'Grace Liu',       'grace.liu@foundry.example',       'GL', '#b58a6a', 23, 1,    NULL, '2023-06-12', 'active',   'Utrecht'),
  (23, 'Nadia Petrova',   'nadia.petrova@foundry.example',   'NP', '#7d8ba0', 24, 5,    NULL, '2022-01-10', 'active',   'Rotterdam'),
  (24, 'Yuki Tanaka',     'yuki.tanaka@foundry.example',     'YT', '#8a7ba6', 25, 5,    NULL, '2023-03-20', 'active',   'Remote'),
  (25, 'Noa Lindqvist',   'noa.lindqvist@foundry.example',   'NL', '#6f8bb0', 18, 13,   15,   '2026-08-10', 'active',   'Rotterdam'),
  (26, 'Owen Gallagher',  'owen.gallagher@foundry.example',  'OG', '#7d9166', 26, 5,    23,   '2026-07-20', 'active',   'Rotterdam');

-- Leave policy ---------------------------------------------------------------

-- Annual is the only monthly-accrual type: 1.75 days a month, which is what
-- makes a balance read "12.25 of 21 accrued as of 28 July" — seven months in.
-- The colours are the desk's own leave tints, lifted from styles/tokens.css.
INSERT INTO leave_types (id, name, short_name, annual_days, accrual, per_month, color) VALUES
  (1, 'Annual leave',  'Annual',    21, 'monthly', 1.75, '#0e7490'),
  (2, 'Sick leave',    'Sick',      10, 'upfront', NULL, '#cf273c'),
  (3, 'Personal day',  'Personal',   3, 'upfront', NULL, '#7c3aed'),
  (4, 'Volunteer day', 'Volunteer',  2, 'upfront', NULL, '#0b7d59');

-- Two holidays inside the quarter, so a range picked across either one visibly
-- skips it and the count says why.
INSERT INTO holidays (id, name, on_date) VALUES
  (1, 'Civic Day',  '2026-08-03'),
  (2, 'Labour Day', '2026-09-07');

-- Requests -------------------------------------------------------------------

-- Six requests in mixed states, ids doubling as codes.
--
-- 303 is the interesting one: twelve calendar days is ten working days, which
-- is past the five-day threshold, so it needs two signatures. Sam has signed as
-- Tom's manager and it sits at 'manager_approved' — still in the People Ops
-- queue, exactly as the desk shows it.
--
-- `working_days` is counted the way lib/leave.ts counts it: weekdays only, with
-- any dated holiday removed. None of these six span 3 August, so no row here
-- has a holiday deducted; the picker demonstrates that live instead.
INSERT INTO leave_requests
  (id, employee_id, type_id, starts_on, ends_on, working_days, status,
   decided_by, decided_at, note, decision_note, created_at)
VALUES
  (299, 6,  1, '2026-06-08', '2026-06-12', 5,  'approved',
   2,    '2026-06-02 00:00+00',
   '',
   'Enjoy the break — the studio is covered.',
   '2026-06-01 00:00+00'),

  (300, 6,  3, '2026-07-10', '2026-07-10', 1,  'rejected',
   2,    '2026-07-03 00:00+00',
   'Moving day, second attempt.',
   'Design review lands that Friday — could we look at the week after?',
   '2026-07-02 00:00+00'),

  (301, 13, 2, '2026-07-27', '2026-07-29', 3,  'approved',
   3,    '2026-07-27 00:00+00',
   'Flu — keeping it off the shop floor.',
   'Rest up. Kofi runs the CNC queue.',
   '2026-07-27 00:00+00'),

  (302, 6,  1, '2026-08-24', '2026-08-28', 5,  'approved',
   2,    '2026-07-15 00:00+00',
   'Coast week with family.',
   'Have a great one.',
   '2026-07-14 00:00+00'),

  (303, 21, 1, '2026-08-10', '2026-08-21', 10, 'manager_approved',
   5,    '2026-07-21 00:00+00',
   'Two weeks in Galicia.',
   'Coverage sorted with Nadia.',
   '2026-07-20 00:00+00'),

  (304, 7,  4, '2026-08-07', '2026-08-07', 1,  'pending',
   NULL, NULL,
   'Harbour clean-up with the city crew.',
   '',
   '2026-07-26 00:00+00');

-- Onboarding -----------------------------------------------------------------

INSERT INTO onboarding_templates (id, name) VALUES
  (1, 'Workshop new starter'),
  (2, 'Ops new starter');

-- Rows 1 to 16 are the two checklists as written: no employee, never ticked.
INSERT INTO onboarding_tasks (id, template_id, employee_id, title, phase, due_offset_days, done) VALUES
  (1,  1, NULL, 'Sign the offer and ID paperwork',        'before',  -7, false),
  (2,  1, NULL, 'Order PPE set and workshop badge',       'before',  -5, false),
  (3,  1, NULL, 'Create accounts: mail, wiki, floor app', 'before',  -3, false),
  (4,  1, NULL, 'Workshop safety induction with Henrik',  'day_1',    0, false),
  (5,  1, NULL, 'Tour, locker and bench assignment',      'day_1',    0, false),
  (6,  1, NULL, 'Shadow Rosa on the finishing line',      'week_1',   7, false),
  (7,  1, NULL, 'First guided cut on the small CNC',      'week_1',   7, false),
  (8,  1, NULL, '30-day check-in with Elif and People',   'month_1', 28, false),

  (9,  2, NULL, 'Sign the offer and ID paperwork',        'before',  -7, false),
  (10, 2, NULL, 'Create accounts: mail, wiki, ops board', 'before',  -3, false),
  (11, 2, NULL, 'Welcome coffee with the Ops team',       'day_1',    0, false),
  (12, 2, NULL, 'Laptop, desk and building access',       'day_1',    0, false),
  (13, 2, NULL, 'Shadow Tom on inbound logistics',        'week_1',   7, false),
  (14, 2, NULL, 'Read the supplier playbook',             'week_1',   7, false),
  (15, 2, NULL, 'Own the Tuesday dispatch run',           'month_1', 21, false),
  (16, 2, NULL, '30-day check-in with Sam and People',    'month_1', 28, false);

-- Noa's board, stamped from the workshop checklist. She starts on 10 August, so
-- only the before-day-one lines are ticked: three of eight, and the ring on the
-- desk says so.
INSERT INTO onboarding_tasks (id, template_id, employee_id, title, phase, due_offset_days, done) VALUES
  (17, 1, 25, 'Sign the offer and ID paperwork',        'before',  -7, true),
  (18, 1, 25, 'Order PPE set and workshop badge',       'before',  -5, true),
  (19, 1, 25, 'Create accounts: mail, wiki, floor app', 'before',  -3, true),
  (20, 1, 25, 'Workshop safety induction with Henrik',  'day_1',    0, false),
  (21, 1, 25, 'Tour, locker and bench assignment',      'day_1',    0, false),
  (22, 1, 25, 'Shadow Rosa on the finishing line',      'week_1',   7, false),
  (23, 1, 25, 'First guided cut on the small CNC',      'week_1',   7, false),
  (24, 1, 25, '30-day check-in with Elif and People',   'month_1', 28, false);

-- Owen started on 20 July and is a week in: six of eight done, with the month-one
-- pair still open. Two boards at deliberately different progress, so the desk's
-- progress ring is measuring something rather than decorating.
INSERT INTO onboarding_tasks (id, template_id, employee_id, title, phase, due_offset_days, done) VALUES
  (25, 2, 26, 'Sign the offer and ID paperwork',        'before',  -7, true),
  (26, 2, 26, 'Create accounts: mail, wiki, ops board', 'before',  -3, true),
  (27, 2, 26, 'Welcome coffee with the Ops team',       'day_1',    0, true),
  (28, 2, 26, 'Laptop, desk and building access',       'day_1',    0, true),
  (29, 2, 26, 'Shadow Tom on inbound logistics',        'week_1',   7, true),
  (30, 2, 26, 'Read the supplier playbook',             'week_1',   7, true),
  (31, 2, 26, 'Own the Tuesday dispatch run',           'month_1', 21, false),
  (32, 2, 26, '30-day check-in with Sam and People',    'month_1', 28, false);

-- Sequences ------------------------------------------------------------------

-- Every id above was explicit, so the sequences never moved. Set each one past
-- the last row it owns. leave_requests lands on 304, which is the point: the
-- next request raised is 305, and the desk calls it LR-305.
SELECT setval('departments_id_seq',          (SELECT max(id) FROM departments));
SELECT setval('positions_id_seq',            (SELECT max(id) FROM positions));
SELECT setval('employees_id_seq',            (SELECT max(id) FROM employees));
SELECT setval('leave_types_id_seq',          (SELECT max(id) FROM leave_types));
SELECT setval('leave_requests_id_seq',       (SELECT max(id) FROM leave_requests));
SELECT setval('holidays_id_seq',             (SELECT max(id) FROM holidays));
SELECT setval('onboarding_templates_id_seq', (SELECT max(id) FROM onboarding_templates));
SELECT setval('onboarding_tasks_id_seq',     (SELECT max(id) FROM onboarding_tasks));

COMMIT;
