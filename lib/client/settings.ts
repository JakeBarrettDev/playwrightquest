import type { GradingProvider } from "../types/grading";

export interface ProviderSettings {
  provider: GradingProvider;
  apiKey: string;
  /** Empty string means "use the provider's default model". */
  model: string;
}

const STORAGE_KEY = "pq:grading-settings:v1";

let cachedRaw: string | null | undefined = undefined;
let cachedSettings: ProviderSettings | null = null;
const listeners = new Set<() => void>();

function parseRaw(raw: string | null): ProviderSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    if (
      parsed.provider !== "anthropic" &&
      parsed.provider !== "openai" &&
      parsed.provider !== "gemini"
    ) {
      return null;
    }
    if (typeof parsed.apiKey !== "string" || parsed.apiKey.length < 10) {
      return null;
    }
    return {
      provider: parsed.provider,
      apiKey: parsed.apiKey,
      model: typeof parsed.model === "string" ? parsed.model : "",
    };
  } catch {
    return null;
  }
}

export const PROVIDER_LABELS: Record<GradingProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

export const PROVIDER_DEFAULT_MODELS: Record<GradingProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-2024-08-06",
  gemini: "gemini-2.0-flash",
};

export const PROVIDER_KEY_URLS: Record<GradingProvider, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  gemini: "https://aistudio.google.com/apikey",
};

/**
 * Read the current settings. Memoized against the raw localStorage string so
 * `useSyncExternalStore` sees a stable snapshot identity until something
 * actually changes.
 */
export function getSettingsSnapshot(): ProviderSettings | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;
  cachedSettings = parseRaw(raw);
  return cachedSettings;
}

export function getSettingsServerSnapshot(): ProviderSettings | null {
  return null;
}

export function subscribeSettings(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(callback);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", storageHandler);
  };
}

export function saveSettings(settings: ProviderSettings): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(settings);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSettings = settings;
  for (const l of listeners) l();
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedSettings = null;
  for (const l of listeners) l();
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
