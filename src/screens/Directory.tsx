/**
 * DIRECTORY, TEAM CALENDAR, ONBOARDING and the 404.
 *
 * Three HR-side views plus the fallback, grouped in one module because each is
 * a single screen with no shared state beyond the store.
 */

import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Search,
  UserRound,
  UserRoundPlus,
} from "lucide-react";

import {
  HOLIDAYS,
  LEAVE_TYPES,
  LEAVE_TYPE_KEYS,
  PEOPLE,
  TEAMS,
  TODAY,
} from "../data/demo.ts";
import { useI18n } from "../i18n/index.tsx";
import { dateLong, dayNumber, label, monthLong, percent, weekdayInitials } from "../lib/format.ts";
import { monthGrid, onboardingProgress, outOn } from "../lib/leave.ts";
import { personName, useStore } from "../state/store.ts";
import { Avatar, Button, Chip, Empty, Honest, Mono, Panel } from "../components/Primitives.tsx";

/* -------------------------------------------------------------- directory */

export function Directory() {
  const { t } = useI18n();
  const query = useStore((s) => s.directoryQuery);
  const setQuery = useStore((s) => s.setDirectoryQuery);
  const team = useStore((s) => s.teamFilter);
  const setTeam = useStore((s) => s.setTeamFilter);
  const openProfile = useStore((s) => s.openProfile);
  const requests = useStore((s) => s.requests);

  const outIds = useMemo(
    () => new Set(outOn(TODAY, requests, PEOPLE).map((o) => o.person.id)),
    [requests],
  );

  const q = query.trim().toLowerCase();
  const list = PEOPLE.filter(
    (p) =>
      (team === "all" || p.team === team) &&
      (q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        label(p.role).toLowerCase().includes(q)),
  );

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("directory.title")}</h1>
        <p className="fp-head__sub">{t("directory.subtitle")}</p>
      </header>

      <div className="fp-searchbox">
        <Search size={15} aria-hidden="true" />
        <input
          className="fp-input fp-fld"
          type="search"
          value={query}
          placeholder={t("directory.search")}
          aria-label={t("directory.search")}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBlockEnd: 16 }}>
        <Chip onClick={() => setTeam("all")} pressed={team === "all"}>
          {t("directory.filter.all")}
        </Chip>
        {TEAMS.map((x) => (
          <Chip key={x} onClick={() => setTeam(x)} pressed={team === x}>
            {x}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon={<UserRound size={22} aria-hidden="true" />} title={t("directory.empty")} />
      ) : (
        <div className="fp-cardgrid">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              className="fp-ptile fp-card"
              onClick={() => openProfile(p.id)}
            >
              <Avatar name={p.name} tint={p.tint} ini={p.ini} large />
              <span className="fp-ptile__name">{p.name}</span>
              <span className="fp-ptile__role">{label(p.role)}</span>
              <span className="fp-ptile__foot">
                <Chip>{p.team}</Chip>
                <Chip>{label(p.city)}</Chip>
                {outIds.has(p.id) && <Chip tone="warn">{t("chrome.status.outToday")}</Chip>}
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBlockStart: 18 }}>
        <Honest>{t("directory.honest")}</Honest>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- team calendar */

export function TeamCalendar() {
  const { t } = useI18n();
  const requests = useStore((s) => s.requests);
  const [year, month] = useStore((s) => s.calendarMonth);
  const step = useStore((s) => s.stepCalendar);
  const openProfile = useStore((s) => s.openProfile);

  const grid = monthGrid(year, month, requests, PEOPLE, HOLIDAYS);
  const anyAbsence = grid.some((c) => c.inMonth && c.absences.length > 0);
  const headers = weekdayInitials();

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("calendar.title")}</h1>
        <p className="fp-head__sub">{t("calendar.subtitle")}</p>
      </header>

      <div className="fp-monthbar">
        <button
          type="button"
          className="fp-iconbtn fp-btn"
          onClick={() => step(-1)}
          aria-label={t("calendar.prev")}
        >
          {/* The chevron points the way the month moves, which flips in RTL. */}
          <ChevronLeft size={17} aria-hidden="true" className="fp-chev" />
        </button>
        <span className="fp-monthbar__label">{monthLong(year, month)}</span>
        <button
          type="button"
          className="fp-iconbtn fp-btn"
          onClick={() => step(1)}
          aria-label={t("calendar.next")}
        >
          <ChevronRight size={17} aria-hidden="true" className="fp-chev" />
        </button>
      </div>

      <div className="fp-cal" role="grid" aria-label={monthLong(year, month)}>
        {headers.map((h, i) => (
          <div key={`${h}-${i}`} className="fp-cal__head" role="columnheader">
            {h}
          </div>
        ))}

        {grid.map((cell) => (
          <div
            key={cell.serial}
            className="fp-cal__cell"
            role="gridcell"
            data-out={cell.inMonth ? undefined : "true"}
            data-weekend={cell.weekend ? "true" : undefined}
            data-holiday={cell.holiday !== null ? "true" : undefined}
            data-today={cell.serial === TODAY ? "true" : undefined}
          >
            <span className="fp-cal__num fp-mono">{dayNumber(cell.serial)}</span>
            {cell.holiday !== null && (
              <span className="fp-cal__holiday">{label(cell.holiday.name)}</span>
            )}
            {cell.absences.map((a) => {
              const meta = LEAVE_TYPES[a.type];
              return (
                <button
                  key={`${a.person.id}-${a.type}`}
                  type="button"
                  className="fp-cal__bar"
                  data-pending={a.pending ? "true" : undefined}
                  style={{ background: meta.tintSoft, color: meta.tint }}
                  onClick={() => openProfile(a.person.id)}
                  title={`${a.person.name} · ${label(meta.name)}`}
                >
                  {a.person.ini}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!anyAbsence && <p className="fp-col__empty">{t("calendar.empty")}</p>}

      <Panel title={t("calendar.legend")} className="fp-legend-panel">
        <div className="fp-legend">
          {LEAVE_TYPE_KEYS.map((key) => (
            <span key={key} className="fp-legend__item">
              <span
                className="fp-legend__swatch"
                style={{ background: LEAVE_TYPES[key].tint }}
                aria-hidden="true"
              />
              {label(LEAVE_TYPES[key].name)}
            </span>
          ))}
          <span className="fp-legend__item">
            <span className="fp-legend__swatch fp-legend__swatch--pending" aria-hidden="true" />
            {t("calendar.legend.pending")}
          </span>
          <span className="fp-legend__item">
            <span
              className="fp-legend__swatch"
              style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}
              aria-hidden="true"
            />
            {t("calendar.legend.holiday")}
          </span>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------- onboarding */

export function Onboarding() {
  const { t } = useI18n();
  const hires = useStore((s) => s.hires);
  const hireId = useStore((s) => s.hireId);
  const openHire = useStore((s) => s.openHire);
  const toggleTask = useStore((s) => s.toggleTask);

  const hire = hires.find((h) => h.id === hireId) ?? null;

  if (hire !== null) {
    const groups = [...new Set(hire.tasks.map((task) => task.group))];
    const progress = onboardingProgress(hire.tasks);
    const doneCount = hire.tasks.filter((task) => task.done).length;

    return (
      <div className="fp-screen">
        <button type="button" className="fp-backlink" onClick={() => openHire(null)}>
          <ChevronLeft size={14} aria-hidden="true" className="fp-chev" />
          {t("onboarding.back")}
        </button>

        <header className="fp-hirehead">
          <ProgressRing value={progress} tint={hire.tint} />
          <div style={{ minWidth: 0 }}>
            <h1 className="fp-head__title">{hire.name}</h1>
            <p className="fp-head__sub">{label(hire.role)}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBlockStart: 9 }}>
              <Chip>{hire.team}</Chip>
              <Chip>
                {t(hire.starts > TODAY ? "onboarding.starts" : "onboarding.started", {
                  date: dateLong(hire.starts),
                })}
              </Chip>
              <Chip>{t("onboarding.buddy", { name: personName(hire.buddy) })}</Chip>
              <Chip tone="accent">
                {t("onboarding.progress", { done: doneCount, total: hire.tasks.length })}
              </Chip>
            </div>
          </div>
        </header>

        {progress === 1 && (
          <p className="fp-honest" style={{ marginBlockEnd: 16 }}>
            {t("onboarding.complete")}
          </p>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {groups.map((group) => (
            <Panel key={group} title={label(group)}>
              <ul className="fp-tasks">
                {hire.tasks
                  .filter((task) => task.group === group)
                  .map((task) => (
                    <li key={task.id}>
                      <label className="fp-task" data-done={task.done ? "true" : undefined}>
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleTask(hire.id, task.id)}
                        />
                        <span className="fp-task__label">{label(task.label)}</span>
                        <Chip>{label(task.due)}</Chip>
                      </label>
                    </li>
                  ))}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fp-screen">
      <header className="fp-head">
        <h1 className="fp-head__title">{t("onboarding.title")}</h1>
        <p className="fp-head__sub">{t("onboarding.subtitle")}</p>
      </header>

      {hires.length === 0 ? (
        <Empty icon={<UserRoundPlus size={22} aria-hidden="true" />} title={t("onboarding.title")} />
      ) : (
        <div className="fp-cardgrid">
          {hires.map((h) => {
            const progress = onboardingProgress(h.tasks);
            const doneCount = h.tasks.filter((task) => task.done).length;
            return (
              <button
                key={h.id}
                type="button"
                className="fp-hiretile fp-card"
                onClick={() => openHire(h.id)}
              >
                <ProgressRing value={progress} tint={h.tint} label={h.ini} />
                <span className="fp-ptile__name">{h.name}</span>
                <span className="fp-ptile__role">{label(h.role)}</span>
                <span className="fp-ptile__foot">
                  <Chip>
                    {t(h.starts > TODAY ? "onboarding.starts" : "onboarding.started", {
                      date: dateLong(h.starts),
                    })}
                  </Chip>
                  <Chip tone="accent">
                    {t("onboarding.progress", { done: doneCount, total: h.tasks.length })}
                  </Chip>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * A progress ring.
 *
 * `pathLength="100"` normalises the circumference so the dash array is a plain
 * percentage — no 2πr arithmetic, and the ring stays correct if the radius
 * ever changes.
 */
function ProgressRing({
  value,
  tint,
  label: text,
}: {
  value: number;
  tint: string;
  label?: string;
}) {
  return (
    <span className="fp-ring" role="img" aria-label={percent(value)}>
      <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle cx="22" cy="22" r="19" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="19"
          fill="none"
          stroke={tint}
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value * 100} 100`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="fp-ring__label fp-mono">{text ?? percent(value)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------- 404 */

export function NotFound() {
  const { t } = useI18n();
  const go = useStore((s) => s.go);

  return (
    <div className="fp-screen">
      <Empty
        icon={<Compass size={22} aria-hidden="true" />}
        title={t("notfound.title")}
        body={t("notfound.body")}
        action={<Button onClick={() => go("home")}>{t("notfound.action")}</Button>}
      />
    </div>
  );
}

export { Mono };
