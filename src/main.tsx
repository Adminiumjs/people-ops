/*
 * Entry point.
 *
 * The four global stylesheets are imported here, before `App`, so the cascade
 * order is deterministic in the built bundle: tokens (custom properties) →
 * base (reset, fonts, behaviour classes) → components (shared UI) → screens
 * (view-specific rules, which therefore always win a tie).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";

import { I18nProvider } from "./i18n/index.tsx";
import { setDataSource } from "./data/source.ts";
import { clientFromEnv, loadSnapshot, snapshotSource } from "./data/adminiumSource.ts";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

/*
 * ONE condition decides demo vs connected: whether the API base URL and key are
 * present at build time. `createPublicClient` returns null when either is
 * missing, so the fallback is structural rather than a catch. The marketplace
 * demo builds set neither and behave byte-identically to before this changed.
 *
 * The dynamic `import()` of `App` is load-bearing, not stylistic: `App` reaches
 * `data/live.ts`, which reads the seam at MODULE SCOPE. A static import would
 * evaluate it during this module's own imports — before the fetch below could
 * resolve — and the app would render demo data whatever the server said. The
 * `await` has to sit between the swap and the import, so the import has to be
 * dynamic. `setDataSource` throws if that ordering is ever broken, because the
 * failure is otherwise silent and looks exactly like a working app.
 */
async function boot(): Promise<void> {
  const client = clientFromEnv();
  if (client !== null) {
    const snap = await loadSnapshot(client);
    if (snap !== null) {
      setDataSource(snapshotSource(snap));
      console.info(
        `[adminium] connected: ${String(snap.people.length)} people, ` +
          `${String(snap.requests.length)} requests, ${String(snap.hires.length)} onboarding`,
      );
    }
  }

  /*
   * REGISTRATION, and it happens HERE for two separate reasons.
   *
   * The dynamic imports are the same load-bearing ordering the paragraph above
   * describes: `state/store.ts` reaches `data/live.ts`, which reads the seam at
   * module scope, so neither may be imported statically by this file.
   *
   * And registration is where an ADD-ON'S STRINGS ARRIVE. `add-ons/registry.ts`
   * merges each add-on's eight-locale bundle into this app's at module load,
   * through a function that throws naming the add-on, the locale and the key —
   * so it has to run before the first render reads a bundle, and it must not be
   * possible to skip it the way a test can be skipped. Doing it here, rather
   * than in an effect, is what makes both true.
   *
   * In a connected deployment this list comes from the server and the bundles
   * are imported on demand. Only the SOURCE of the list changes: `createRegistry`
   * and every surface below it stay exactly as they are, which is the same seam
   * rule `DataSource` follows.
   */
  const [{ default: App }, { useStore }, { demoAddOns }] = await Promise.all([
    import("./app/App.tsx"),
    import("./state/store.ts"),
    import("./add-ons/registry.ts"),
  ]);
  useStore.getState().registerAddOns(demoAddOns());

  createRoot(container as HTMLElement).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
