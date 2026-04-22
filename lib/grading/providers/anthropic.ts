import type { GradingResult } from "../../types/grading";
import { GRADING_RESULT_SCHEMA, GRADING_TOOL_NAME } from "./schema";
import {
  ProviderError,
  type LLMProvider,
  type ProviderGradeInput,
  type ProviderGradeOutput,
  type ProviderUsage,
} from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

interface AnthropicMessagesResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly defaultModel = DEFAULT_MODEL;

  async grade(input: ProviderGradeInput): Promise<ProviderGradeOutput> {
    const model = input.model ?? DEFAULT_MODEL;

    // Two cacheable system blocks: authoritative (static across all requests)
    // and site (static per site). Dynamic goes in the user message.
    const system = [
      {
        type: "text" as const,
        text: input.authoritative,
        cache_control: { type: "ephemeral" as const },
      },
      {
        type: "text" as const,
        text: input.site,
        cache_control: { type: "ephemeral" as const },
      },
    ];

    const body = {
      model,
      max_tokens: 2048,
      system,
      messages: [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: input.dynamic }],
        },
      ],
      tools: [
        {
          name: GRADING_TOOL_NAME,
          description:
            "Emit the final GradingResult for the player's Playwright test submission.",
          input_schema: input.responseSchema,
        },
      ],
      tool_choice: { type: "tool" as const, name: GRADING_TOOL_NAME },
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await safeText(res);
      throw new ProviderError(
        "anthropic",
        res.status,
        `Anthropic API error (${res.status}): ${errText}`
      );
    }

    const data = (await res.json()) as AnthropicMessagesResponse;
    const toolUse = data.content.find(
      (b): b is { type: "tool_use"; id: string; name: string; input: unknown } =>
        b.type === "tool_use" && b.name === GRADING_TOOL_NAME
    );
    if (!toolUse) {
      throw new ProviderError(
        "anthropic",
        res.status,
        "Anthropic response did not include a GradingResult tool call"
      );
    }

    const usage: ProviderUsage = {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      cachedInputTokens:
        (data.usage.cache_read_input_tokens ?? 0) +
        (data.usage.cache_creation_input_tokens ?? 0),
    };

    return {
      model: data.model,
      result: toolUse.input as GradingResult,
      usage,
    };
  }
}

// Ensure tree-shakers and the schema import stay anchored together.
void GRADING_RESULT_SCHEMA;

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 1000);
  } catch {
    return "<unreadable>";
  }
}
