import { NextResponse } from "next/server";
import { loadChallengeById, defaultChallengesRoot } from "@/lib/challenges";
import type { GradingProvider } from "@/lib/types/grading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PROVIDERS: GradingProvider[] = ["anthropic", "openai", "gemini"];

interface HintRequest {
  provider: GradingProvider;
  apiKey: string;
  model?: string;
  challengeId: string;
  playerCode: string;
  hintsUsed: number;
}

export async function POST(req: Request) {
  let body: Partial<HintRequest>;
  try {
    body = (await req.json()) as Partial<HintRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: "`provider` must be one of: anthropic, openai, gemini" }, { status: 400 });
  }
  if (typeof body.apiKey !== "string" || body.apiKey.length < 10) {
    return NextResponse.json({ error: "`apiKey` is required" }, { status: 400 });
  }
  if (typeof body.challengeId !== "string" || !body.challengeId) {
    return NextResponse.json({ error: "`challengeId` is required" }, { status: 400 });
  }
  if (typeof body.playerCode !== "string") {
    return NextResponse.json({ error: "`playerCode` is required" }, { status: 400 });
  }

  const challenge = await loadChallengeById(
    defaultChallengesRoot(process.cwd()),
    body.challengeId
  );
  if (!challenge) {
    return NextResponse.json({ error: `Unknown challenge: ${body.challengeId}` }, { status: 400 });
  }

  const hintsUsed = typeof body.hintsUsed === "number" ? body.hintsUsed : 0;

  const systemPrompt = `You are a Playwright testing instructor. When a player requests a hint, you give a single short hint (2–3 sentences maximum) that:
- Points them toward the right Playwright API or concept without revealing the exact solution
- References a specific concept or doc section they should look at (e.g., "see getByRole in the locators docs")
- Never writes the code for them
- Is encouraging and educational in tone

Return plain text only — no JSON, no markdown fences, no list items. One paragraph.`;

  const userMessage = `Challenge: ${challenge.title}
Brief: ${challenge.clientBrief}
Acceptance criteria:
${challenge.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}
Suggested APIs: ${challenge.suggestedPlaywrightAPIs.join(", ")}

Player's current code (hint #${hintsUsed + 1} requested):
\`\`\`typescript
${body.playerCode}
\`\`\`

Give one non-spoiling hint to help the player move forward.`;

  try {
    const hint = await fetchHint(body.provider, body.apiKey, body.model, systemPrompt, userMessage);
    return NextResponse.json({ hint });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function fetchHint(
  provider: GradingProvider,
  apiKey: string,
  model: string | undefined,
  system: string,
  user: string
): Promise<string> {
  switch (provider) {
    case "anthropic":
      return fetchAnthropicHint(apiKey, model ?? "claude-haiku-4-5-20251001", system, user);
    case "openai":
      return fetchOpenAIHint(apiKey, model ?? "gpt-4o-mini", system, user);
    case "gemini":
      return fetchGeminiHint(apiKey, model ?? "gemini-2.0-flash", system, user);
  }
}

async function fetchAnthropicHint(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic returned no text content");
  return textBlock.text.trim();
}

async function fetchOpenAIHint(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return content.trim();
}

async function fetchGeminiHint(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 256 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const text = data.candidates[0]?.content?.parts[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text.trim();
}
