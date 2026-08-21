# People Ops

A complete, production-shaped people desk — built with Vite + React +
TypeScript, no CSS framework, no backend required. It's an example app that
ships with [Adminium](https://adminium.dev): check a leave balance, request
time off and watch the days being counted, approve a queue, and see the month
fill up — all from built-in demo data.

**There is no payroll in this product.** No payslip, no salary figure, no
compensation screen, and no type in the codebase has a field for one. Scope is
leave, people and onboarding; that is a deliberate boundary, not an omission.

The demo is dressed as **Foundry**, a fictional ~120-person design-and-
manufacturing company, so the requests, decisions and checklists read like a
quarter already in motion rather than lorem ipsum.

**Live demo → [adminium.dev/demo/people-ops](https://adminium.dev/demo/people-ops)**

## What it does

- **Two personas in one build.** The demo dock switches between an employee's
  self-service view and the HR manager's working queues. The loop closes across
  the switch: submit a request as the employee, switch to HR, approve it, and
  the balance card on Home has already moved.

- **A leave engine that shows its working.**
  [`src/lib/leave.ts`](src/lib/leave.ts) is a pure, React-free module: working
  days excluding weekends and public holidays, per-policy accrual (upfront vs
  monthly, so a balance reads "12.25 of 21 accrued as of Jul 28"), balances
  that charge pending days as well as approved ones, and the manager → People
  ops chain that engages past five working days. 46 assertions in
  [`leave.test.ts`](src/lib/leave.test.ts) run against the shipped seed.

- **A form that never refuses without saying why.** As you pick dates the
  count recomputes, the skipped days are named (weekend, or the holiday by
  name), and the approval chain is previewed before you submit. When the
  balance is short the panel turns amber, states exactly how short, and the
  submit button disables *with that reason attached* rather than disappearing.

- **Dates as day serials.** Leave is counted in whole days, so dates are stored
  as whole days since the epoch in UTC rather than `Date` objects — a serial
  cannot drift across a timezone boundary the way a local midnight can.

- **Eight languages, including a right-to-left one.** English, German, French,
  Czech, Danish, Simplified and Traditional Chinese, and Egyptian Arabic. The
  seeded fiction — job titles, holiday names, decision notes, onboarding
  checklists — is translated too, not just the chrome. Plurals go through
  `Intl.PluralRules` in each locale's own CLDR order.

- **RTL by construction.** Every positional rule is a CSS logical property, so
  `dir="rtl"` mirrors the sidebar, the calendar grid, the balance cards'
  coloured edge and the demo dock with no second stylesheet.

- **Light / dark themes** via CSS custom properties, following the OS on first
  load with a toggle that latches it.

- **A pinned clock.** Nothing reads `Date.now()`. "Now" is Tuesday 28 July
  2026, so every machine shows the same balances and the same two-week request
  sitting mid-chain in the HR queue.

- **No bitmaps, no external requests.** People are initials on tinted
  gradients. Fonts are self-hosted woff2. The app works offline.

## Local development

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

### Driving the demo

| Control | What it does |
| --- | --- |
| **Employee / HR** | Switches persona. The loop closes across it. |
| **Language** | Eight locales, including Arabic, which flips the layout to RTL. |
| **Theme** | Latches light or dark over the OS preference. |
| **Reset** | Puts the seeded requests and checklists back. |

A sixty-second tour: Home → note 2.25 annual days left → Request leave → pick
10–21 August and watch the panel turn amber, name the skipped weekend, and
preview the two-signature chain → shorten it to 10–14 August → submit as
LR-305 → switch to **HR** → Approvals → approve it → switch back → the balance
card has moved.

## Deploy

- **Vercel** — import the repo. Build command `npm run build`, output `dist`.
- **DigitalOcean App Platform** — import the repo; same build command.
- **Host anywhere** — `npm run build` produces a static `dist/`. Or build the
  container:

  ```bash
  docker build -t people-ops .
  ```

### Build scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check + build to `dist/` at base `/`. |
| `npm run build:demo` | Build at base `/demo/people-ops/` (Adminium demo). |
| `npm run preview` | Preview a production build locally. |
| `npm test` | Run the leave engine suite. |

## Full implementation (self-host)

There are two ways to run this desk, and they stack.

**The frontend, one click.** The Vercel / DigitalOcean buttons above deploy the
people desk on its own, running on the bundled demo data. No database, no
dashboard — a fully static preview of both personas.

**The whole stack, one command.**
[`docker-compose.yml`](docker-compose.yml) stands up Postgres (seeded by default
with the *same* twenty-four people, the same four leave types, the same six
requests and the same two onboarding boards), an auto-generated Adminium
dashboard that runs that real database, and the desk itself:

```bash
cp .env.example .env      # then set ADMINIUM_SECRET — e.g. openssl rand -hex 32
docker compose up
```

- **People desk** → http://localhost:8080
- **Adminium dashboard** → http://localhost:4600

On first boot, `hr-db` applies [`db/schema.sql`](db/schema.sql), installs the
demo bookkeeping in [`db/demo-toolkit.sql`](db/demo-toolkit.sql), and then runs
a hook that loads [`db/seed.sql`](db/seed.sql) unless `DEMO_DATA=0`. Adminium
imports the Foundry database as its first source connection, introspects the
schema, and generates the back office. Finish the ~1-minute first-run wizard at
`:4600` — it's pre-pointed at the Foundry DB. The install spec Adminium reads
to configure itself is
[`manifest.json`](manifest.json); it scaffolds **8 tables, 6 dashboard pages, 2
access presets** (`hr-manager`, `employee`) **and 4 settings** into your
connected database.

The seeded database is the *same company* the app shows, down to the pinned
clock: Elif is out sick on 28 July in both places, Tom's twelve-day request sits
mid-chain in both, and request ids are the codes — row 303 is LR-303, so the
next one raised is LR-305.

### Demo data

Foundry arrives with the database: `docker compose up` gives you a desk and a
dashboard with people, requests and boards already in them. Set `DEMO_DATA=0`
in `.env` before the first `docker compose up` and you get the same full schema
with nothing in it instead. Neither choice is permanent — the demo rows can be
loaded later, and taken out again, as often as you like.

| Command | What it does |
| --- | --- |
| `npm run demo:status` | What is loaded right now, table by table. |
| `npm run demo:import` | Load `db/seed.sql`. |
| `npm run demo:wipe` | Remove the demo rows. |
| `npm run demo:reset` | Wipe, then import a fresh copy. |

A wipe removes only the rows the seed put there: the schema and your own rows
stay, and a demo row your own data still depends on is kept rather than
force-deleted, and reported under `kept`. `ON DELETE CASCADE` still applies,
though — `leave_requests.employee_id` cascades from `employees`, so a request
you filed against a demo person goes when they do, counted separately under
`cascaded`. `wipe` and `reset` ask before they act — pass `-- --yes`
(`npm run demo:wipe -- --yes`) to skip the question, which is also what a script
needs, since there is nobody there to answer. Set `DATABASE_URL` to run any of
these against a Postgres outside the compose file. The full reference, including
what a wipe reports and how it knows what to remove, is
[db/README.md](db/README.md).

## The split: the desk and the back office

| In this app | In the generated dashboard |
| --- | --- |
| Requesting leave and deciding on it | Every table as records, with full CRUD |
| Balances, the team calendar, onboarding | Joining, editing and offboarding people |
| The employee's own view of their year | Reporting across the whole company |

## Connecting to Adminium

All data access goes through a thin `DataSource` interface
([`src/data/source.ts`](src/data/source.ts)) with a single `demoSource`
implementation. **Today the deployed demo is demo data only — nothing is
persisted and no email is sent.** Once Adminium's browser-safe publishable key
(`adm_pub_…`) ships, a second implementation reads and writes live data without
touching any screen or the store.

### What is deliberately out of scope

- **Payroll, in every form.** See above. This is a boundary, not a backlog item.
- **Notification email.** Approvals raise a toast, not a message; outbound mail
  needs a job runner this version does not have.
- **Document e-signing.** Onboarding tracks tasks, not signatures.
- **Per-person time zones.** Leave resolves against one company calendar.

## Project structure

```
src/
  app/         App shell + the exhaustive 8-view switch
  state/       Zustand store (persona, requests, draft, checklists, toasts)
  data/        demo.ts (the seeded company), types.ts, source.ts (DataSource seam)
  i18n/        8-locale runtime, locale registry, ambient bridge, strings/
  lib/         leave.ts (the engine) + tests, format.ts (locale-aware output)
  screens/     home, request, my requests, directory, approvals, calendar,
               onboarding, 404
  components/  shell, demo dock, overlays, primitives
  styles/      tokens.css (canonical tokens + leave-type tints), base.css,
               components.css, screens.css
public/fonts/  self-hosted Manrope + JetBrains Mono (woff2)
db/            schema.sql, seed.sql and the demo-data toolkit (see db/README.md)
```

## License

[AGPL-3.0](LICENSE) © 2026 People Ops. A demo shipped with Adminium.
