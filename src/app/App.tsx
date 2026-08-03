/**
 * The app shell.
 *
 * Routing is a plain state switch over `store.view` — no react-router. Every
 * member of the `View` union is mapped to a screen below, so no nav item or
 * sheet link can land on a route that does not exist.
 */

import { useEffect } from "react";
import type { ComponentType } from "react";

import DemoDock from "../components/DemoDock.tsx";
import {
  CancelConfirm,
  ProfileSheet,
  RejectDialog,
  ToastLayer,
} from "../components/Overlays.tsx";
import Shell from "../components/Shell.tsx";
import type { View } from "../data/types.ts";
import { setAmbient } from "../i18n/ambient.ts";
import { useI18n } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";

import {
  Directory,
  NotFound,
  Onboarding,
  TeamCalendar,
} from "../screens/Directory.tsx";
import Home from "../screens/Home.tsx";
import Request from "../screens/Request.tsx";
import { Approvals, MyRequests } from "../screens/Requests.tsx";

const SCREENS: Record<View, ComponentType> = {
  home: Home,
  request: Request,
  requests: MyRequests,
  directory: Directory,
  approvals: Approvals,
  calendar: TeamCalendar,
  onboarding: Onboarding,
  notfound: NotFound,
};

function CurrentScreen() {
  const view = useStore((s) => s.view);
  const Screen = SCREENS[view] ?? NotFound;
  return <Screen />;
}

export default function App() {
  const initTheme = useStore((s) => s.initTheme);
  const escape = useStore((s) => s.escape);

  /*
   * Publish the live locale to the module-level bridge before anything below
   * renders, so `lib/format.ts` — which the store and the engine call from
   * outside React — formats in the locale the tree is about to paint.
   */
  const { locale, t, money, number } = useI18n();
  setAmbient(locale, t, money, number);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") escape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [escape]);

  return (
    <>
      <a className="fp-sr-only" href="#main">
        {t("chrome.skipToContent")}
      </a>
      <Shell>
        <CurrentScreen />
      </Shell>
      <DemoDock />
      <ToastLayer />
      <ProfileSheet />
      <CancelConfirm />
      <RejectDialog />
    </>
  );
}
