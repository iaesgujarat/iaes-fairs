"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Called with the decoded text (typically a /scan/<uuid> URL). */
  onDecode: (decoded: string) => void;
  /** Called when html5-qrcode init/permission fails. */
  onError?: (err: unknown) => void;
}

/**
 * Wraps html5-qrcode's `Html5QrcodeScanner` inside a single mountable
 * React component. The library is imported dynamically so it never
 * ships server-side.
 */
export function QRScanner({ onDecode, onError }: Props) {
  const containerId = "iaes-qr-reader";
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!active) return;
        const scanner = new Html5QrcodeScanner(
          containerId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scannerRef.current = scanner as unknown as { clear: () => Promise<void> };

        scanner.render(
          (decoded: string) => {
            try {
              scanner.clear();
            } catch {
              /* ignore */
            }
            onDecode(decoded);
          },
          () => {
            // per-frame scan failures are noise; ignore
          }
        );
      } catch (e) {
        onError?.(e);
      }
    })();

    return () => {
      active = false;
      scannerRef.current?.clear().catch(() => {});
    };
  }, [onDecode, onError]);

  return <div id={containerId} className="w-full" />;
}
