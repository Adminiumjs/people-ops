import { Segmented } from "./Primitives.tsx";
/**
 * The internal-tool chrome: a compact sidebar, a topbar with a people search
 * and a user chip, and — under 900px — a hamburger plus a slide-in nav sheet.
 *
 * The nav SET changes with persona: an employee sees Home, Request leave, My
 * requests and Directory; HR additionally sees Approvals (with a pending
 * count), Team calendar and Onboarding. One shell, two nav lists.
 */

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  House,
  Inbox,
  Menu,
  Search,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";

import { PEOPLE } from "../data/live.ts";
import type { Persona, View } from "../data/types.ts";
import { useI18n } from "../i18n/index.tsx";
import { label } from "../lib/format.ts";
import { pendingQueue } from "../lib/leave.ts";
import { currentUser, personName, useStore } from "../state/store.ts";
import { Avatar } from "./Primitives.tsx";

type NavKey =
  | "chrome.nav.home"
  | "chrome.nav.request"
  | "chrome.nav.requests"
  | "chrome.nav.directory"
  | "chrome.nav.approvals"
  | "chrome.nav.calendar"
  | "chrome.nav.onboarding";

interface NavEntry {
  view: View;
  labelKey: NavKey;
  icon: typeof House;
  badge?: number;
}

function useNav(): NavEntry[] {
  const persona = useStore((s) => s.persona);
  const requests = useStore((s) => s.requests);

  return useMemo(() => {
    const employee: NavEntry[] = [
      { view: "home", labelKey: "chrome.nav.home", icon: House },
      { view: "request", labelKey: "chrome.nav.request", icon: CalendarPlus },
      { view: "requests", labelKey: "chrome.nav.requests", icon: ClipboardList },
      { view: "directory", labelKey: "chrome.nav.directory", icon: Users },
    ];

    if (persona !== "hr") return employee;

    const waiting = pendingQueue(requests).length;
    return [
      ...employee,
      {
        view: "approvals",
        labelKey: "chrome.nav.approvals",
        icon: Inbox,
        badge: waiting || undefined,
      },
      { view: "calendar", labelKey: "chrome.nav.calendar", icon: CalendarDays },
      { view: "onboarding", labelKey: "chrome.nav.onboarding", icon: UserRoundPlus },
    ];
  }, [persona, requests]);
}

function NavList({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);
  const nav = useNav();

  return (
    <nav className="fp-sidebar__nav" aria-label={t("chrome.brand.sub")}>
      {nav.map((entry) => {
        const Icon = entry.icon;
        return (
          <button
            key={entry.view}
            type="button"
            className="fp-navitem"
            aria-current={view === entry.view ? "page" : undefined}
            onClick={() => {
              go(entry.view);
              onPick?.();
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {t(entry.labelKey)}
            {entry.badge !== undefined && (
              <span className="fp-navitem__badge fp-mono">{entry.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <div className="fp-sidebar__brand">
      <span className="fp-sidebar__mark" aria-hidden="true">
        <Users size={18} />
      </span>
      <span>
        <span className="fp-sidebar__name">{t("chrome.brand")}</span>
        <span className="fp-sidebar__sub" style={{ display: "block" }}>
          {t("chrome.brand.sub")}
        </span>
      </span>
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <div className="fp-sidebar__foot">
      {t("chrome.footer.copy")}
      <span className="fp-sidebar__chip fp-mono">{t("chrome.footer.chip")}</span>
    </div>
  );
}

/** A filter over the twenty-four people already in memory — there is no server. */
function PeopleSearch() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const openProfile = useStore((s) => s.openProfile);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (q.length < 2) return null;
    return PEOPLE.filter(
      (p) => p.name.toLowerCase().includes(q) || label(p.role).toLowerCase().includes(q),
    ).slice(0, 6);
  }, [q]);

  return (
    <div className="fp-topbar__search">
      <Search size={15} aria-hidden="true" />
      <input
        className="fp-topbar__input fp-fld"
        type="search"
        value={query}
        placeholder={t("chrome.search.placeholder")}
        aria-label={t("chrome.search.label")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
      />

      {open && hits !== null && (
        <div className="fp-searchpop fp-scroll">
          {hits.length === 0 ? (
            <p className="fp-searchpop__empty">{t("chrome.search.empty", { query })}</p>
          ) : (
            hits.map((p) => (
              <button
                key={p.id}
                type="button"
                className="fp-searchpop__row"
                onMouseDown={() => {
                  openProfile(p.id);
                  setQuery("");
                }}
              >
                <Avatar name={p.name} tint={p.tint} ini={p.ini} />
                {p.name}
                <span className="fp-searchpop__meta">{label(p.role)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * WHICH SIDE OF THE BUSINESS YOU ARE LOOKING AT.
 *
 * Both personas here are STAFF. Until this existed the only way to move between
 * them was the demo dock's segment — so outside a demo build the app had no
 * switcher at all, and half of it was unreachable. That was invisible while the
 * dock shipped in every build; making the dock demo-only is what exposed it.
 *
 * It is a LENS, not a permission. A hosted surface sits behind the operator's
 * session and RBAC, so everyone who can reach this page is already authorised
 * for the data underneath; flipping the view changes what is shown, never what
 * may be fetched. Anything that must actually be withheld belongs in a role,
 * not in a segmented control.
 *
 * The `chrome.dock.*` keys are reused deliberately: they carry the right words
 * in all eight locales, and renaming them would be 8 × 3 repos of churn for an
 * internal identifier no reader ever sees.
 */
function PersonaSwitch() {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  return (
    <div className="fp-sidebar__persona">
      <Segmented<Persona>
        full
        ariaLabel={t("chrome.dock.persona")}
        value={persona}
        onChange={setPersona}
        options={[
          { value: "employee", label: t("chrome.dock.employee") },
          { value: "hr", label: t("chrome.dock.hr") },
        ]}
      />
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const navOpen = useStore((s) => s.navOpen);
  const setNavOpen = useStore((s) => s.setNavOpen);

  const meId = currentUser(persona);
  const me = PEOPLE.find((p) => p.id === meId);

  return (
    <div className="fp-app">
      <aside className="fp-sidebar">
        <Brand />
        <PersonaSwitch />
        <NavList />
        <Footer />
      </aside>

      {navOpen && (
        <>
          <button
            type="button"
            className="fp-scrim"
            aria-label={t("chrome.menu.close")}
            onClick={() => setNavOpen(false)}
          />
          <div className="fp-sheet" role="dialog" aria-modal="true" aria-label={t("chrome.brand")}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Brand />
              <button
                type="button"
                className="fp-iconbtn fp-btn"
                style={{ marginInlineStart: "auto", marginInlineEnd: 12 }}
                onClick={() => setNavOpen(false)}
                aria-label={t("chrome.menu.close")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <NavList onPick={() => setNavOpen(false)} />
            <Footer />
          </div>
        </>
      )}

      <div className="fp-main">
        <header className="fp-topbar">
          <button
            type="button"
            className="fp-iconbtn fp-btn fp-narrow-only"
            onClick={() => setNavOpen(true)}
            aria-label={t("chrome.menu.open")}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <PeopleSearch />
          <div className="fp-topbar__spacer" />

          <span className="fp-userchip">
            {me !== undefined && <Avatar name={me.name} tint={me.tint} ini={me.ini} />}
            <span className="fp-wide-only">{personName(meId)}</span>
          </span>
        </header>

        <main className="fp-content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
