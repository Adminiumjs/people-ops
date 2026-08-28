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

  const { default: App } = await import("./app/App.tsx");
  createRoot(container as HTMLElement).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
