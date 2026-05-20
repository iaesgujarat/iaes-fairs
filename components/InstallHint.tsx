"use client";

import { useEffect, useState } from "react";

// v17 Phase 1 — small, dismissable "Add to Home Screen" hint.
// Surfaced ONLY on the highest-value-for-install pages (/scan and
// /pass/[id]) — never globally, to avoid a double prompt with the
// browser's native one. Behaviour:
//
//   - Android / Chrome / desktop: shows after `beforeinstallprompt`
//     fires; clicking Install triggers the native prompt.
//   - iOS Safari: shows a static "Share → Add to Home Screen" hint
//     (iOS has no programmatic install API).
//   - If the user dismisses it, the choice persists in localStorage.
//   - If the app is already installed (display-mode: standalone),
//     the hint never appears.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "iaes-pwa-hint-dismissed";

export function InstallHint() {
  const [prompt, setPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed → never show.
    if (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return;
    }
    // Previously dismissed → respect.
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore (Safari private mode etc.) */
    }

    const ua = navigator.userAgent || "";
    const ios =
      /iphone|ipad|ipod/i.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (ios) {
      setIsIOS(true);
      setHidden(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") dismiss();
    else setHidden(true);
  }

  if (hidden) return null;

  // ── iOS: static instruction ────────────────────────────────────
  if (isIOS) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-lg">
        <span className="flex-shrink-0 text-2xl" aria-hidden>
          📱
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-navy">
            Add to Home Screen
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Tap the Share button, then &ldquo;Add to Home Screen&rdquo;
            for the fastest access.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 px-1 text-lg leading-none text-gray-400"
          aria-label="Dismiss"
          type="button"
        >
          ×
        </button>
      </div>
    );
  }

  // ── Android / Chrome / desktop: programmatic prompt available ──
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-lg">
      <span className="flex-shrink-0 text-2xl" aria-hidden>
        📱
      </span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-navy">
          Install IAES Fairs
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Add to your home screen for instant access at the fair.
        </p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <button
          onClick={dismiss}
          className="px-2 py-1 text-xs text-gray-400"
          type="button"
        >
          Later
        </button>
        <button
          onClick={install}
          className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90"
          type="button"
        >
          Install
        </button>
      </div>
    </div>
  );
}
