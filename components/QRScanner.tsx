"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  /** Called with the decoded text (typically a /scan/<uuid> URL). */
  onDecode: (decoded: string) => void;
  /** Called when html5-qrcode init/permission fails. */
  onError?: (err: unknown) => void;
}

type Html5QrcodeInstance = {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
    onFailure: () => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

/**
 * Live QR scanner that AUTO-STARTS the camera (no per-student tap), so a
 * rep can scan student after student hands-free. Uses html5-qrcode's
 * lower-level `Html5Qrcode` (started programmatically) rather than the
 * button-driven `Html5QrcodeScanner`. After the first permission grant
 * the browser remembers it, so every subsequent mount starts instantly.
 * If auto-start is blocked (e.g. iOS needs a user gesture), we fall back
 * to a single "Tap to start camera" button — never worse than before.
 */
export function QRScanner({ onDecode, onError }: Props) {
  const containerId = "iaes-qr-reader";
  const instanceRef = useRef<Html5QrcodeInstance | null>(null);
  const stoppedRef = useRef(false);
  const onDecodeRef = useRef(onDecode);
  const [needsTap, setNeedsTap] = useState(false);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const start = useCallback(async () => {
    setStarting(true);
    setNeedsTap(false);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!instanceRef.current) {
        instanceRef.current = new Html5Qrcode(
          containerId
        ) as unknown as Html5QrcodeInstance;
      }
      const inst = instanceRef.current;
      stoppedRef.current = false;
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          if (stoppedRef.current) return;
          stoppedRef.current = true;
          inst
            .stop()
            .then(() => inst.clear())
            .catch(() => {});
          onDecodeRef.current(decoded);
        },
        () => {
          /* per-frame scan misses are noise; ignore */
        }
      );
    } catch (e) {
      // Permission denied, or the browser needs a user gesture first.
      setNeedsTap(true);
      onError?.(e);
    } finally {
      setStarting(false);
    }
  }, [onError]);

  useEffect(() => {
    start();
    return () => {
      const inst = instanceRef.current;
      if (inst) {
        inst
          .stop()
          .then(() => inst.clear())
          .catch(() => {});
      }
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div id={containerId} className="w-full overflow-hidden rounded-lg" />
      {needsTap && (
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className="mt-3 w-full rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-60"
        >
          {starting ? "Starting…" : "Tap to start camera"}
        </button>
      )}
    </div>
  );
}
