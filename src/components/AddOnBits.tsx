/**
 * The four small pieces the add-on surfaces are built from.
 *
 * They are here rather than in `Primitives.tsx` because every one of them says
 * something about ADD-ONS specifically, and `Primitives.tsx` is the module a
 * reader opens to find out what a chip looks like. Nothing below is more than a
 * few lines; what is long is the reasoning, and the reasoning is the reason
 * these are components at all rather than markup repeated on three screens.
 *
 * NOTHING HERE NAMES AN ADD-ON. Every string it prints either comes off the
 * add-on object it was handed or out of this app's own bundle.
 */

import type { CSSProperties, ReactNode } from "react";

import type { AddOn } from "../add-ons/vendor/host/index.ts";
import { useI18n } from "../i18n/index.tsx";
import { rgba, tileBackground } from "../lib/format.ts";
import { useStore } from "../state/store.ts";

/* ------------------------------------------------------- the monogram tile */

/**
 * Three letters on a neutral tile, drawn the same way for every add-on.
 *
 * A TILE AND NOT A LOGO (24 D12). No add-on ships a mark here and none may: a
 * redrawn logo is a redrawn logo whether it is a `<path>` or a `.png`, and a
 * shelf of twenty of them reads as twenty companies rather than as one system.
 * The letters come off `addOn.monogram`, which is the add-on's own choice.
 *
 * It reuses this app's own tile styling — the same `fp-tile` the directory
 * draws a person's initials in — so an add-on card looks like the rest of the
 * app rather than like a strip pasted into it.
 */
export function AddOnTile({ letters, size = 44 }: { letters: string; size?: number }) {
  const dark = useStore((s) => s.theme === "dark");
  const tint = "var(--accent)";
  return (
    <span
      className="fp-tile"
      style={{
        width: size,
        height: size,
        background: tileBackground(tint, dark),
        borderColor: rgba(tint, dark ? 0.3 : 0.18),
        flex: "0 0 auto",
      }}
      aria-hidden="true"
    >
      <span className="fp-tile__ini">{letters}</span>
    </span>
  );
}

/* ------------------------------------------------------ who else is involved */

/**
 * THE LINE EVERY SURFACE THAT NAMES AN ADD-ON ENDS ON (24 AC6).
 *
 * ── TWO SENTENCES, AND WHOSE EACH ONE IS ────────────────────────────────────
 *
 * `namesCompany: true`  → THIS APP'S line, out of this app's own bundle. It
 *                         names no add-on and no company, so holding it here
 *                         does not make the app know anything about which
 *                         add-ons exist (24 AC5).
 * `namesCompany: false` → THE ADD-ON'S OWN WORDS, out of its own eight-locale
 *                         bundle, through `noCompanyKeys`. This app has no
 *                         sentence of its own claiming an add-on connects to
 *                         nobody, because that is not this app's fact to
 *                         assert on somebody else's behalf.
 *
 * An ABSENT line is indistinguishable from a FORGOTTEN one, which is the whole
 * reason the second branch exists rather than simply drawing nothing. Nothing
 * is still the right answer when an add-on has supplied nothing to say: an
 * empty paragraph in a `gap` layout is a blank stripe with no words in it,
 * which reads as a bug rather than as silence.
 *
 * ── AND IT IS MOUNTED PER CARD, NOT ONCE PER PAGE ───────────────────────────
 *
 * The sibling print works learned this the expensive way: it printed one
 * not-affiliated line at the foot of a whole shelf, under add-ons that had
 * nothing to disclaim and add-ons that did, and a page-wide grep for the word
 * came back green on a page where no card said it. A footnote three sections
 * below the only card on a filtered page is not a pairing. So this goes on the
 * card and in the drawer, beside the name it is about.
 *
 * `t(key as never)` because an add-on's keys are NOT members of this app's
 * `MessageKey`: they arrive at registration, not at compile time, and the check
 * that used to be the type is now `registerAddOnMessages`, which throws naming
 * the add-on, the locale and the key.
 */
export function Affiliation({ addOn, style }: { addOn: AddOn; style?: CSSProperties }) {
  const { t } = useI18n();
  const line = addOn.namesCompany
    ? t("addon.host.notAffiliated")
    : (addOn.noCompanyKeys ?? []).map((key) => t(key as never)).join(" ");
  if (line.trim().length === 0) return null;
  return (
    <p className="fp-addon__fine" style={style}>
      {line}
    </p>
  );
}

/* ------------------------------------------------- a day an add-on supplied */

/**
 * THE MARK ON A DAY THIS APP DID NOT PUT THERE.
 *
 * ── WHY EVERY ONE OF THOSE ROWS CARRIES IT ──────────────────────────────────
 *
 * A closed day changes somebody's leave. It moves the working-day count on a
 * request, it takes a day off a balance, and it puts a name on a calendar cell
 * that nobody in the business wrote. A reader who finds a day they do not
 * recognise on their own leave form is owed the fact that it did not come out
 * of this app — otherwise the only available conclusion is that the app is
 * wrong, and the one place they could go and check is a drawer they have no
 * reason to open.
 *
 * So the chip appears everywhere such a day appears: the holidays panel on
 * Home, the skipped-day list on the request form, and the team calendar's day
 * cell.
 *
 * ── AND WHY IT NAMES NOTHING ────────────────────────────────────────────────
 *
 * It prints this app's own four words and not the add-on's name, not its
 * monogram and not its key. Printing the name would put an add-on's identity on
 * three ordinary screens, and 24 AC6 would then require the not-affiliated line
 * on all three — a paragraph of small print under a calendar cell, which is
 * worse for the reader than the chip is good. The name is one press away, on
 * the add-ons screen, which is where somebody who wants to know goes.
 */
export function FromAddOn({ title }: { title?: string }) {
  const { t } = useI18n();
  return (
    <span className="fp-addon-flag" title={title ?? t("addon.host.provided.title")}>
      {t("addon.host.provided")}
    </span>
  );
}

/* -------------------------------------------------------- seeded, and said so */

/**
 * The caption over an add-on's seeded activity list (24 D11).
 *
 * The lines under it look exactly like a real integration's audit trail —
 * timestamps, an action, a relative date — and a reviewer could screenshot them
 * and read them as one. They are seeded, so it says so, ABOVE them: a caption
 * underneath is read after the damage.
 */
export function SeededNote({ children }: { children: ReactNode }) {
  return <p className="fp-addon__seeded">{children}</p>;
}
