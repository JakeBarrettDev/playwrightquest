"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface SitePreviewHandle {
  reload: () => void;
  navigate: (path: string) => void;
}

interface Props {
  site: string;
}

function siteRoot(site: string) {
  return `/sites/${site}/`;
}

function normalizePath(site: string, raw: string): string {
  const root = siteRoot(site);
  if (!raw) return root;
  if (raw.startsWith("http")) {
    try {
      const u = new URL(raw);
      return u.pathname + u.search + u.hash;
    } catch {
      return root;
    }
  }
  return raw.startsWith("/") ? raw : root + raw;
}

const SitePreview = forwardRef<SitePreviewHandle, Props>(function SitePreview(
  { site },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupPollRef = useRef<number | null>(null);

  // `src` is the URL we *assign* to the iframe. `currentPath` tracks where
  // the iframe actually is after in-iframe navigation (link clicks, form
  // submits). Kept separate so the URL bar reflects reality, not intent.
  const [src, setSrc] = useState<string>(siteRoot(site));
  const [currentPath, setCurrentPath] = useState<string>(siteRoot(site));
  const [urlInput, setUrlInput] = useState<string>(siteRoot(site));
  const [poppedOut, setPoppedOut] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "slow">(
    "loading"
  );

  const slowTimerRef = useRef<number | null>(null);
  const armSlowTimer = useCallback(() => {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    slowTimerRef.current = window.setTimeout(() => {
      setLoadState((s) => (s === "loading" ? "slow" : s));
    }, 4_000);
  }, []);

  const beginLoad = useCallback(
    (nextSrc: string) => {
      setSrc(nextSrc);
      setLoadState("loading");
      armSlowTimer();
    },
    [armSlowTimer]
  );

  useImperativeHandle(ref, () => ({
    reload: () => {
      if (poppedOut && popupRef.current && !popupRef.current.closed) {
        popupRef.current.location.reload();
        return;
      }
      const iframe = iframeRef.current;
      if (iframe) {
        setLoadState("loading");
        armSlowTimer();
        // Force a reload even if the URL didn't change; toggling src via
        // cache-busting param is the most reliable cross-browser approach.
        const bust = `?_pq=${Date.now()}`;
        const base = currentPath.split("?")[0];
        iframe.src = base + bust;
      }
    },
    navigate: (path: string) => {
      const next = normalizePath(site, path);
      beginLoad(next);
      setCurrentPath(next);
      setUrlInput(next);
      if (poppedOut && popupRef.current && !popupRef.current.closed) {
        popupRef.current.location.href = next;
      }
    },
  }));

  const handleIframeLoad = useCallback(() => {
    setLoadState("loaded");
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      // Same-origin iframe — reading location is permitted.
      const path =
        iframe.contentWindow?.location.pathname ?? siteRoot(site);
      const search = iframe.contentWindow?.location.search ?? "";
      const full = path + search;
      setCurrentPath(full);
      setUrlInput(full);
    } catch {
      // Swallow: if the iframe ever ends up cross-origin we just keep the
      // last-known path.
    }
  }, [site]);

  // Arm the slow-load warning timer for the initial iframe load. Subsequent
  // loads arm their own timer via `beginLoad` when src changes, or the
  // `reload` imperative handle. The effect body intentionally doesn't call
  // setState — it only schedules a timeout (whose callback may).
  useEffect(() => {
    armSlowTimer();
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    };
  }, [armSlowTimer]);

  const submitUrl = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const next = normalizePath(site, urlInput.trim());
      beginLoad(next);
      setCurrentPath(next);
      if (poppedOut && popupRef.current && !popupRef.current.closed) {
        popupRef.current.location.href = next;
      }
    },
    [site, urlInput, poppedOut, beginLoad]
  );

  const popOut = useCallback(() => {
    const target = normalizePath(site, currentPath);
    const w = window.open(
      target,
      "pq-site-preview",
      "popup,width=1280,height=860"
    );
    if (!w) {
      alert(
        "Browser blocked the popup. Allow popups for this site and try again."
      );
      return;
    }
    popupRef.current = w;
    setPoppedOut(true);

    // Poll for close — the `unload` event fires on internal navigation too,
    // so the only reliable way to detect the user closing the window is a
    // `closed` check.
    popupPollRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        if (popupPollRef.current) {
          window.clearInterval(popupPollRef.current);
          popupPollRef.current = null;
        }
        popupRef.current = null;
        setPoppedOut(false);
      }
    }, 500);
  }, [currentPath, site]);

  const bringBack = useCallback(() => {
    try {
      popupRef.current?.close();
    } catch {
      // Some browsers refuse; the poll-timer will still flip state when the
      // user closes it manually.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (popupPollRef.current) window.clearInterval(popupPollRef.current);
      if (popupRef.current && !popupRef.current.closed) {
        try {
          popupRef.current.close();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-200">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-2 py-1.5">
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.back()}
          title="Back"
          aria-label="Back"
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.forward()}
          title="Forward"
          aria-label="Forward"
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              iframeRef.current?.contentWindow?.location.reload();
            } catch {
              // Fall back to a cache-busted src reassign if the reload ever
              // gets blocked (same-origin should always succeed).
              const iframe = iframeRef.current;
              if (iframe) {
                const base = currentPath.split("?")[0];
                iframe.src = `${base}?_pq=${Date.now()}`;
              }
            }
          }}
          title="Reload"
          aria-label="Reload"
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ↻
        </button>

        <form onSubmit={submitUrl} className="flex min-w-0 flex-1 items-center">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            spellCheck={false}
            className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-emerald-600 focus:outline-none"
          />
        </form>

        <button
          type="button"
          onClick={() => {
            const next = siteRoot(site);
            beginLoad(next);
            setCurrentPath(next);
            setUrlInput(next);
          }}
          title="Home"
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          Home
        </button>
        <button
          type="button"
          onClick={poppedOut ? bringBack : popOut}
          title={
            poppedOut
              ? "Close popout and return preview to this panel"
              : "Open preview in a separate window (F12 for DevTools)"
          }
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          {poppedOut ? "⇱ Bring back" : "⇲ Pop out"}
        </button>
        <a
          href={currentPath}
          target="_blank"
          rel="noreferrer noopener"
          title="Open in new tab"
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ↗
        </a>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {poppedOut ? (
          <PoppedOutPlaceholder onBringBack={bringBack} />
        ) : (
          <>
            <iframe
              ref={iframeRef}
              src={src}
              onLoad={handleIframeLoad}
              title="Fictitious site preview"
              className="h-full w-full border-0"
              // Same-origin — no sandbox attr. We want the preview to behave
              // exactly like the real site (storage, JS, forms) so tests the
              // player writes hit identical DOM.
            />
            {loadState === "slow" && (
              <SlowLoadOverlay
                url={src}
                onRetry={() => {
                  setLoadState("loading");
                  try {
                    iframeRef.current?.contentWindow?.location.reload();
                  } catch {
                    const iframe = iframeRef.current;
                    if (iframe) {
                      const base = src.split("?")[0];
                      iframe.src = `${base}?_pq=${Date.now()}`;
                    }
                  }
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-500">
        Popout window supports <kbd className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">F12</kbd> DevTools · Same origin as Playwright base URL
      </div>
    </div>
  );
});

function SlowLoadOverlay({
  url,
  onRetry,
}: {
  url: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 p-6 text-center text-sm text-zinc-200">
      <div className="text-2xl">⏳</div>
      <div className="font-semibold">
        Preview is taking a while to load
      </div>
      <div className="max-w-sm text-xs text-zinc-400">
        The iframe has been waiting for{" "}
        <code className="font-mono text-zinc-300">{url}</code>. If you just
        updated <code className="font-mono text-zinc-300">next.config.ts</code>{" "}
        or restarted the dev server, your browser may be holding a cached
        redirect. A hard refresh (<kbd className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">Ctrl</kbd>
        +<kbd className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">Shift</kbd>
        +<kbd className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">R</kbd>)
        of the outer IDE page usually clears it.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs hover:bg-zinc-800"
        >
          Retry
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs hover:bg-zinc-800"
        >
          Open in new tab
        </a>
      </div>
    </div>
  );
}

function PoppedOutPlaceholder({ onBringBack }: { onBringBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
      <div className="text-3xl">⇲</div>
      <div className="font-semibold text-zinc-200">
        Preview is open in a separate window
      </div>
      <div className="max-w-xs text-xs text-zinc-500">
        Drag it to a second monitor, or press <kbd className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">F12</kbd> inside that window to open DevTools and hunt for selectors.
      </div>
      <button
        type="button"
        onClick={onBringBack}
        className="mt-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800"
      >
        Close popout and return inline
      </button>
    </div>
  );
}

export default SitePreview;
