import type { GradingResult } from "../../types/grading";
import {
  ProviderError,
  type LLMProvider,
  type ProviderGradeInput,
  type ProviderGradeOutput,
  type ProviderUsage,
} from "./types";

const DEFAULT_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }>; role?: string };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  modelVersion?: string;
  error?: { code: number; message: string; status: string };
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  readonly defaultModel = DEFAULT_MODEL;

  async grade(input: ProviderGradeInput): Promise<ProviderGradeOutput> {
    const model = input.model ?? DEFAULT_MODEL;
    const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

    // Gemini supports responseMimeType + responseSchema for forced JSON output.
    // Explicit context caching uses a separate endpoint — skipped at v1.
    // Authoritative + site live in the systemInstruction so they remain stable
    // across requests (implicit caching), dynamic is the user turn.
    const body = {
      systemInstruction: {
        role: "system",
        parts: [{ text: `${input.authoritative}\n\n---\n\n${input.site}` }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.dynamic }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: stripAnnotations(input.responseSchema),
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (!res.ok || data.error) {
      const msg = data.error?.message ?? (await safeText(res));
      throw new ProviderError(
        "gemini",
        res.status,
        `Gemini API error (${res.status}): ${msg}`
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ProviderError(
        "gemini",
        res.status,
        "Gemini response did not include any text content"
      );
    }

    let parsed: GradingResult;
    try {
      parsed = JSON.parse(text) as GradingResult;
    } catch (err) {
      throw new ProviderError(
        "gemini",
        res.status,
        `Gemini returned unparseable JSON: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const usage: ProviderUsage = {
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
      cachedInputTokens: data.usageMetadata?.cachedContentTokenCount,
    };

    return {
      model: data.modelVersion ?? model,
      result: parsed,
      usage,
    };
  }
}

/**
 * Gemini's responseSchema does not accept `minimum`/`maximum`/`additionalProperties`.
 * Strip unsupported keywords while keeping type/properties/required/enum/items.
 */
function stripAnnotations(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(stripAnnotations);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === "minimum" || k === "maximum" || k === "additionalProperties") continue;
      out[k] = stripAnnotations(v);
    }
    return out;
  }
  return schema;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 1000);
  } catch {
    return "<unreadable>";
  }
}
