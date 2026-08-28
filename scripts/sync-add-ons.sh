#!/usr/bin/env bash
# sync-add-ons.sh — vendor the add-on client halves into this app, and prove the
# copies have not drifted from the repository they came from.
#
# THIS SCRIPT SHIPS IN THIS REPO, and that is the whole reason it exists here.
# A check that only runs on the author's laptop is not a check: `src/add-ons/`
# tells a reader to re-run the sync, and CI and a cloner both have to be able to
# do that from a clean checkout with nothing beside it.
#
# ── THE RETROFIT ORDER, WRITTEN DOWN BECAUSE IT IS NOT OBVIOUS ──────────────
#
# The add-ons monorepo has `scripts/sync-to-host.sh`, and it is a WRAPPER: it
# execs the copy that ships in the host. A host that has never been vendored
# into therefore cannot be vendored into by it — there is nothing to exec — so
# this file was written by hand, once, modelled on the copy in the sibling host
# that already had one. That is the same shape the host kit's own installer
# calls out about itself: a retrofit target has no implementation to delegate
# to, so the first run has to come from somewhere else.
#
# ── WHAT THIS APP VENDORS, AND WHY `vendor/host/` EXISTS ────────────────────
#
#   src/add-ons/vendor/host/<file>   from add-ons/packages/host/src/<file>
#   src/add-ons/vendor/<key>/<file>  from add-ons/packages/<key>/src/<file>
#
# The add-on sources import their shared contract as `@adminium/add-on-host`.
# This app has no node_modules entry for that package and never will: it is a
# static Vite SPA published standalone to the Adminiumjs org, built from a clean
# clone with no sibling checkout of anything. So the shared package is VENDORED
# TOO, once, into `vendor/host/`, and the copied files' imports are rewritten to
# reach it by relative path (see REWRITES below). The vendored tree is then
# self-contained: it compiles with nothing beside it.
#
# EXACTLY ONE COPY OF THE CONTRACT, and the host kit's vendored-copy guard
# asserts the count rather than the path. Three add-on repositories each keeping
# their own copy of `AddOn` is how that interface came to have 19 members in one
# and 18 in two others with every suite green; one copy, in one place, is the
# whole of the fix.
#
# THE MONOREPO IS THE SOURCE OF TRUTH. Edit it, then re-run `sync` here. A
# hand-edit under `vendor/` is invisible until it is a bug in two places at
# once, which is exactly what `status` is for.
#
# Every vendored file carries a header naming its source and saying it is synced
# rather than hand-edited. `status` strips that header back off, and applies the
# same import rewrite to the source, before comparing — so neither the header
# nor the rewrite is itself a source of drift.
#
# WHAT IS DELIBERATELY NOT COPIED, and none of it is an oversight:
#   *.test.ts(x)    the monorepo runs its own suites; re-running them here would
#                   assert the copy rather than the thing (and they pull in zod,
#                   which this app does not ship — 24 D7).
#   src/testing/    each package's own conformance harness and word list, same
#                   reason. The shared package's `testing/` entry point, where
#                   its zod validators live, is never vendored either.
#   slots.ts        an add-on's `FILLED_SLOTS` is read only by its own manifest
#                   suite. This app has its own `src/add-ons/slots.ts`, which is
#                   the authoritative list of what IT hosts.
#   contracts/      the shared package's implementation contracts, for the
#                   credentialled add-ons. Nothing this app vendors imports one,
#                   and copying a directory nothing reaches is how a tree grows
#                   files nobody can account for. A future add-on that needs one
#                   adds the five paths to FILES_host and re-syncs.
#   vite-env.d.ts   ambient Vite types this app already has.
#
# With no monorepo checkout present, `status` reports SOURCE-MISSING and exits 0
# — a clean clone of this app alone still builds, and its own suites still
# assert what is vendored. `sync` in that situation is an error, because there
# is nothing to sync FROM.
#
# Usage:
#   scripts/sync-add-ons.sh status   what is vendored, and whether it matches
#   scripts/sync-add-ons.sh sync     re-copy from the monorepo
#   scripts/sync-add-ons.sh list     the file list each package contributes

set -euo pipefail

HOST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONO="${ADD_ONS_DIR:-$(cd "$HOST/.." && pwd)/add-ons}"
VENDOR="$HOST/src/add-ons/vendor"

# Vendoring targets, in the order they are written. `host` FIRST: it is the
# shared contract everything else imports, and a reader of the output should see
# what everything depends on before the things that depend on it.
#
# For an add-on the target name is its manifest key AND the directory name under
# `vendor/`, so a reader who sees `vendor/<key>/` knows exactly which package to
# go and read.
TARGETS=(host holiday-calendars)

# The shared contract, vendored ONCE. `testing/` is not here and must not be.
FILES_host=(
  index.ts host.ts payloads.ts slots.ts delivery.ts
)

# Reachable from the add-on's client entry point, and nothing else. Kept as an
# explicit list rather than a glob so that adding a file to a package is a
# decision here too — a new module appearing in this app's bundle without
# anybody naming it is how a server half ends up in a browser.
FILES_holiday_calendars=(
  add-on-facts.ts
  index.ts calendar.ts civil.ts daysets.ts
  i18n/strings.ts i18n/t.ts
  ui/SettingsPanel.tsx ui/atoms.tsx
)

# Modules that must never be reachable from the browser half (24 D15), and the
# server ENTRY POINTS a manifest's `provides[].server` names.
#
# THIS ADD-ON HAS NONE OF THEM — it declares `connect: { kind: "none" }`, holds
# no credential and calls nothing — and the list is here anyway, because the
# next add-on this app vendors may not be so simple and a check added after the
# fact is a check written by somebody who already knows the answer.
FORBIDDEN=(carrier.ts http.ts server.ts server/artwork-source.ts)

die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }

var() { printf '%s' "${1//-/_}"; }
files_of() { local v; v="FILES_$(var "$1")[@]"; printf '%s\n' "${!v}"; }
pkg_of() { printf 'packages/%s' "$1"; }
src_of() { printf '%s/packages/%s/src' "$MONO" "$1"; }

[ -d "$HOST/src" ] || die "run this from inside the people-ops checkout"

SOURCE_MISSING=0
[ -d "$MONO/packages/host/src" ] || SOURCE_MISSING=1

require_source() {
  [ "$SOURCE_MISSING" -eq 0 ] && return 0
  printf 'add-ons monorepo not found at:\n  %s\n' "$MONO" >&2
  die "clone it beside this repo as ../add-ons, or set ADD_ONS_DIR to where it lives"
}

# ---------------------------------------------------------------------------
# REWRITES
#
# The add-on sources import the shared contract by package name. This app has no
# node_modules for that package, so the vendored copies import the VENDORED
# contract by relative path instead. The depth is computed from the file's own
# position: `index.ts` is one level under `vendor/<key>/`, `ui/x.tsx` is two.
#
# THIS IS THE ONLY EDIT THE VENDORING MAKES to a file's bytes, and `status`
# applies exactly the same edit to the source before comparing, so the rewrite
# is not itself a source of drift. `vendor/host/` needs none of it — the shared
# package's own files already reach each other relatively — and gets it anyway,
# harmlessly, so there is one code path rather than two.
# ---------------------------------------------------------------------------
rewrite() { # $1 = path within src/  → filter stdin
  local depth up
  depth=$(awk -F/ '{print NF-1}' <<<"$1")
  up=""
  for ((i = 0; i < depth; i++)); do up="../$up"; done
  # Both quote styles, spelled out. A capture-and-put-back `sed -E` with a \1
  # backreference in the PATTERN is the obvious way to write this and it is
  # wrong: BSD ERE has no backreferences, so on macOS it matches nothing and
  # every specifier is copied through untouched — silently, because `status`
  # applies the same rewrite to the source and the two therefore still agree
  # while the build fails. `unresolved_in` below is what catches that, and it
  # stays.
  sed \
    -e "s|\"@adminium/add-on-host/contracts\"|\"${up}../host/contracts/index.ts\"|g" \
    -e "s|'@adminium/add-on-host/contracts'|'${up}../host/contracts/index.ts'|g" \
    -e "s|\"@adminium/add-on-host\"|\"${up}../host/index.ts\"|g" \
    -e "s|'@adminium/add-on-host'|'${up}../host/index.ts'|g"
}

# The header every vendored file wears. Five lines, then the file verbatim.
# `status` cuts exactly these lines back off, so editing the wording here is a
# one-line change followed by a sync, never a drift report.
header() { # $1 = target, $2 = path within src/, $3 = comment opener, $4 = closing sentence
  cat <<EOF
$3
 * VENDORED from add-ons/$(pkg_of "$1")/src/$2 — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run \`sync-add-ons.sh sync\`.
 * $4
 */
EOF
}

# Every bare `@adminium/…` specifier left in a vendored file, one per line.
# There is no node_modules here that could resolve one: a survivor means the
# rewrite did not fire, and the vendored tree stops being self-contained. This
# looks only at what a bundler would follow — an `import`/`export … from` or a
# dynamic `import(…)` — so the prose that NAMES the package (several of these
# files explain that they are copies of it) is not a false positive.
unresolved_in() { # $1 = file
  grep -nE "(from|import)[[:space:]]*\(?[[:space:]]*['\"]@adminium/" "$1" || true
}

note_of() { # $1 = target → the header's third line
  if [ "$1" = host ]; then
    printf '%s' 'The ONE shared contract; every vendored add-on imports it by relative path.'
  else
    printf 'The add-on key is `%s`; its manifest, tests and README live in the monorepo.' "$1"
  fi
}

HEADER_LINES=5

# ---------------------------------------------------------------------------

cmd_list() {
  for key in "${TARGETS[@]}"; do
    local n
    n=$(files_of "$key" | wc -l | tr -d ' ')
    printf '%-18s %-30s %s files\n' "$key" "$(pkg_of "$key")" "$n"
    files_of "$key" | sed 's/^/    /'
  done
}

# ---------------------------------------------------------------------------

cmd_sync() {
  require_source
  local total=0
  for key in "${TARGETS[@]}"; do
    local src dest note left n=0
    src="$(src_of "$key")"
    dest="$VENDOR/$key"
    note="$(note_of "$key")"
    rm -rf "$dest"
    mkdir -p "$dest"
    while IFS= read -r rel; do
      [ -f "$src/$rel" ] || die "$(pkg_of "$key"): $rel is in the file list but not in the package"
      mkdir -p "$dest/$(dirname "$rel")"
      { header "$key" "$rel" "/*" "$note"; rewrite "$rel" < "$src/$rel"; } > "$dest/$rel"
      # Refuse to leave behind a copy this app cannot resolve. Checked at the
      # moment of writing, so the message names the file that was being written.
      left="$(unresolved_in "$dest/$rel")"
      [ -z "$left" ] || die "$key/$rel still imports the shared package by name:
$left
the import rewrite did not fire — see REWRITES in this script"
      n=$((n + 1))
    done < <(files_of "$key")
    printf '%-18s %-30s %s files\n' "$key" "$(pkg_of "$key")" "$n"
    total=$((total + n))
  done
  ok "vendored $total files into src/add-ons/vendor"
  echo "now run, in $HOST:  npx tsc -b && npx vitest run && npx vite build"
}

# ---------------------------------------------------------------------------

cmd_status() {
  local drift=0
  printf '%-18s %-30s %-8s %s\n' TARGET PACKAGE FILES STATE
  for key in "${TARGETS[@]}"; do
    local src dest state=ok n=0 want
    src="$(src_of "$key")"
    dest="$VENDOR/$key"
    want=$(files_of "$key" | wc -l | tr -d ' ')

    if [ ! -d "$dest" ]; then
      state="MISSING"; drift=1
    else
      while IFS= read -r rel; do
        if [ ! -f "$dest/$rel" ]; then
          state="MISSING $rel"; drift=1; continue
        fi
        n=$((n + 1))
        # A specifier no bundler here can resolve. Checked directly rather than
        # left to the byte comparison below, which cannot see it: the same
        # rewrite is applied to both sides, so a rewrite that fires on NEITHER
        # produces two files that agree perfectly and a build that fails.
        [ -z "$(unresolved_in "$dest/$rel")" ] || { state="UNRESOLVED $rel"; drift=1; }
        if [ "$SOURCE_MISSING" -eq 0 ] &&
           ! tail -n "+$((HEADER_LINES + 1))" "$dest/$rel" |
             cmp -s - <(rewrite "$rel" < "$src/$rel"); then
          state="DRIFT $rel"; drift=1
        fi
      done < <(files_of "$key")

      # Anything under vendor/<target>/ that the list does not name is either a
      # stale file from an older sync or something nobody decided to ship.
      while IFS= read -r extra; do
        files_of "$key" | grep -qxF "$extra" || { state="EXTRA $extra"; drift=1; }
      done < <(cd "$dest" && find . -type f | sed 's|^\./||' | sort)

      if [ "$key" != host ]; then
        # 24 D15: the server half must not be reachable from a browser bundle.
        for f in "${FORBIDDEN[@]}"; do
          [ -e "$dest/$f" ] && { state="SECRET-LEAK $f"; drift=1; }
        done
      fi

      [ "$SOURCE_MISSING" -eq 1 ] && [ "$state" = ok ] && state="SOURCE-MISSING (not compared)"
    fi
    printf '%-18s %-30s %-8s %s\n' "$key" "$(pkg_of "$key")" "$n/$want" "$state"
  done

  # A directory under vendor/ that is not a target at all.
  if [ -d "$VENDOR" ]; then
    while IFS= read -r dir; do
      printf '%s\n' "${TARGETS[@]}" | grep -qxF "$dir" ||
        { warn "UNKNOWN $dir/ under vendor/ — nothing syncs it"; drift=1; }
    done < <(cd "$VENDOR" && find . -mindepth 1 -maxdepth 1 -type d | sed 's|^\./||' | sort)
  fi

  echo
  if [ "$drift" -ne 0 ]; then
    die "drift found — run: scripts/sync-add-ons.sh sync"
  fi
  if [ "$SOURCE_MISSING" -eq 1 ]; then
    warn "vendored files are complete; the add-ons monorepo is absent, so nothing was compared"
    printf '  %s\n' "$MONO"
    exit 0
  fi
  ok "the vendored copies match the monorepo"
}

case "${1:-status}" in
  status) cmd_status ;;
  sync)   cmd_sync ;;
  list)   cmd_list ;;
  *) die "usage: sync-add-ons.sh [status|sync|list]" ;;
esac
