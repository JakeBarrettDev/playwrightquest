import type { GradingResult } from "../../types/grading";
import { GRADING_TOOL_NAME } from "./schema";
import {
  ProviderError,
  type LLMProvider,
  type ProviderGradeInput,
  type ProviderGradeOutput,
  type ProviderUsage,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-2024-08-06";
const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  readonly defaultModel = DEFAULT_MODEL;

  async grade(input: ProviderGradeInput): Promise<ProviderGradeOutput> {
    const model = input.model ?? DEFAULT_MODEL;

    // OpenAI caches automatically on stable prefixes. Keep authoritative +
    // site at the front of the system message; dynamic content lives in the
    // user message so it does not bust the prefix.
    const systemContent = `${input.authoritative}\n\n---\n\n${input.site}`;

    const body = {
      model,
      temperature: 0,
      messages: [
        { role: "system" as const, content: systemContent },
        { role: "user" as const, content: input.dynamic },
      ],
      tools: [
        {
          type: "function" as const,
          function: {
            name: GRADING_TOOL_NAME,
            description:
              "Emit the final GradingResult for the player's Playwright test submission.",
            parameters: input.responseSchema,
          },
        },
      ],
      tool_choice: {
        type: "function" as const,
        function: { name: GRADING_TOOL_NAME },
      },
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await safeText(res);
      throw new ProviderError(
        "openai",
        res.status,
        `OpenAI API error (${res.status}): ${errText}`
      );
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const toolCall = data.choices[0]?.message?.tool_calls?.find(
      (t) => t.function?.name === GRADING_TOOL_NAME
    );
    if (!toolCall) {
      throw new ProviderError(
        "openai",
        res.status,
        "OpenAI response did not include a GradingResult tool call"
      );
    }

    let parsed: GradingResult;
    try {
      parsed = JSON.parse(toolCall.function.arguments) as GradingResult;
    } catch (err) {
      throw new ProviderError(
        "openai",
        res.status,
        `OpenAI returned unparseable tool arguments: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const usage: ProviderUsage = {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      cachedInputTokens: data.usage.prompt_tokens_details?.cached_tokens,
    };

    return { model: data.model, result: parsed, usage };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 1000);
  } catch {
    return "<unreadable>";
  }
}
