"use client";

import { useEffect, useId, useState } from "react";
import type { GradingProvider } from "@/lib/types/grading";
import {
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_KEY_URLS,
  PROVIDER_LABELS,
  type ProviderSettings,
} from "@/lib/client/settings";

interface Props {
  initial: ProviderSettings | null;
  onSave: (settings: ProviderSettings) => void;
  onClose: () => void;
}

const PROVIDERS: GradingProvider[] = ["anthropic", "openai", "gemini"];

export default function ProviderSettingsDialog({
  initial,
  onSave,
  onClose,
}: Props) {
  // State is initialized from `initial` once on mount. The parent is expected
  // to conditionally render this component so each open is a fresh mount and
  // form state is reset without a setState-in-effect cascade.
  const [provider, setProvider] = useState<GradingProvider>(
    initial?.provider ?? "anthropic"
  );
  const [apiKey, setApiKey] = useState<string>(initial?.apiKey ?? "");
  const [model, setModel] = useState<string>(initial?.model ?? "");
  const [revealKey, setRevealKey] = useState(false);

  const providerId = useId();
  const keyId = useId();
  const modelId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const trimmedKey = apiKey.trim();
  const canSave = trimmedKey.length >= 10;
  const placeholderModel = PROVIDER_DEFAULT_MODELS[provider];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ provider, apiKey: trimmedKey, model: model.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-settings-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 shadow-2xl"
      >
        <h2 id="provider-settings-title" className="text-lg font-semibold">
          Grading provider &amp; API key
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          PlaywrightQuest is bring-your-own-key. Your key is sent to our server
          with each grading request and forwarded directly to the provider —
          we never persist or log it. The key is stored only in your browser{"'"}s
          localStorage.
        </p>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <label htmlFor={providerId} className="block font-medium">
              Provider
            </label>
            <select
              id={providerId}
              value={provider}
              onChange={(e) => setProvider(e.target.value as GradingProvider)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Get a key from{" "}
              <a
                href={PROVIDER_KEY_URLS[provider]}
                target="_blank"
                rel="noreferrer noopener"
                className="text-emerald-400 underline underline-offset-2"
              >
                {PROVIDER_LABELS[provider]}
              </a>
              .
            </p>
          </div>

          <div>
            <label htmlFor={keyId} className="block font-medium">
              API key
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={keyId}
                type={revealKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-…"
                className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
              />
              <button
                type="button"
                onClick={() => setRevealKey((v) => !v)}
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {revealKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={modelId} className="block font-medium">
              Model <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id={modelId}
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={placeholderModel}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Leave blank to use {placeholderModel}.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
