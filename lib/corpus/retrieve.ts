import { join } from "node:path";
import { loadCorpus } from "./loader";
import type { CorpusChunk, RetrieveQuery, ScoredChunk } from "./types";

const DEFAULT_TOP_K = 6;

const SCORE = {
  tagExact: 3,
  tagSubstring: 1.5,
  errorKeywordInBody: 1,
  errorKeywordInTitle: 1.5,
  playerCodeHit: 0.5,
  siteMatch: 4,
  categoryBaseline: {
    "playwright-docs": 0.2,
    "rubric-rules": 0.4,
    "challenge-notes": 0.1,
  } as const,
} as const;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "or",
  "is",
  "it",
  "at",
  "by",
  "as",
  "be",
  "this",
  "that",
  "was",
  "with",
  "error",
  "test",
  "tests",
]);

export async function retrieveCorpusChunks(
  corpusRoot: string,
  query: RetrieveQuery
): Promise<ScoredChunk[]> {
  const all = await loadCorpus(corpusRoot);
  const topK = query.topK ?? DEFAULT_TOP_K;

  const challengeTags = (query.challengeTags ?? []).map(normalize);
  const errorKeywords = (query.errorKeywords ?? []).map(normalize);
  const playerTokens = query.playerCode ? extractCodeTokens(query.playerCode) : [];
  const site = query.site ? normalize(query.site) : undefined;

  const scored: ScoredChunk[] = all.map((chunk) => scoreChunk(chunk, {
    challengeTags,
    errorKeywords,
    playerTokens,
    site,
  }));

  // Keep only chunks with non-zero signal; if nothing matched, fall back to category baselines.
  const hit = scored.filter((s) => s.score > 0);
  const pool = hit.length > 0 ? hit : scored.map((s) => ({
    ...s,
    score: SCORE.categoryBaseline[s.chunk.category] ?? 0,
  }));

  pool.sort((a, b) => b.score - a.score || a.chunk.path.localeCompare(b.chunk.path));
  return pool.slice(0, topK);
}

/**
 * Convenience: return the retrieved chunks flattened into the `string[]` shape
 * that GradingContextPackage.corpusChunks expects. Each string is a markdown
 * block prefixed with the chunk's path so Claude can cite it.
 */
export async function retrieveCorpusTexts(
  corpusRoot: string,
  query: RetrieveQuery
): Promise<string[]> {
  const scored = await retrieveCorpusChunks(corpusRoot, query);
  return scored.map(
    ({ chunk }) => `<!-- source: ${chunk.path} -->\n${chunk.body.trim()}`
  );
}

/** Default corpus root resolution for server-side callers. */
export function defaultCorpusRoot(projectRoot: string): string {
  return join(projectRoot, "corpus");
}

interface ScoreContext {
  challengeTags: string[];
  errorKeywords: string[];
  playerTokens: string[];
  site: string | undefined;
}

function scoreChunk(chunk: CorpusChunk, ctx: ScoreContext): ScoredChunk {
  let score = 0;
  const matched: string[] = [];

  const chunkTags = chunk.tags.map(normalize);
  const bodyLower = chunk.body.toLowerCase();
  const titleLower = chunk.title.toLowerCase();

  for (const tag of ctx.challengeTags) {
    if (!tag) continue;
    if (chunkTags.includes(tag)) {
      score += SCORE.tagExact;
      matched.push(`tag:${tag}`);
      continue;
    }
    const partial = chunkTags.find(
      (t) =>
        t.length >= 4 &&
        tag.length >= 4 &&
        (t.includes(tag) || tag.includes(t))
    );
    if (partial) {
      score += SCORE.tagSubstring;
      matched.push(`tag~${tag}:${partial}`);
    }
  }

  for (const kw of ctx.errorKeywords) {
    if (!kw || STOP_WORDS.has(kw)) continue;
    if (titleLower.includes(kw)) {
      score += SCORE.errorKeywordInTitle;
      matched.push(`title:${kw}`);
    } else if (bodyLower.includes(kw)) {
      score += SCORE.errorKeywordInBody;
      matched.push(`body:${kw}`);
    }
  }

  for (const token of ctx.playerTokens) {
    if (bodyLower.includes(token)) {
      score += SCORE.playerCodeHit;
      matched.push(`code:${token}`);
    }
  }

  if (
    ctx.site &&
    chunk.category === "challenge-notes" &&
    chunk.slug.toLowerCase().includes(ctx.site)
  ) {
    score += SCORE.siteMatch;
    matched.push(`site:${ctx.site}`);
  }

  return { chunk, score, matched };
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Pull Playwright-ish tokens out of player code. Looks for `getByX`, `toX`,
 * and common API method names so chunks that discuss those APIs float up.
 */
function extractCodeTokens(code: string): string[] {
  const tokens = new Set<string>();
  const lower = code.toLowerCase();

  const patterns = [
    /\bgetby\w+/g,
    /\bto[a-z]\w+/g, // toBeVisible, toHaveText, etc.
    /\bwaitfor\w*/g,
    /\blocator\b/g,
    /\bexpect\b/g,
    /\bfill\b/g,
    /\bclick\b/g,
    /\bgoto\b/g,
    /\bselectoption\b/g,
  ];

  for (const re of patterns) {
    const matches = lower.matchAll(re);
    for (const m of matches) tokens.add(m[0]);
  }

  return [...tokens];
}
