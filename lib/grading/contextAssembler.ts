import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { DOMManifest, DOMManifestEntry } from "../types/manifest";
import type { GradingContextPackage } from "../types/grading";
import type { ExecutionResult } from "../execution";
import { defaultCorpusRoot, retrieveCorpusTexts } from "../corpus";
import { loadChallengeById, defaultChallengesRoot } from "../challenges";

export interface AssembleInput {
  projectRoot: string;
  challengeId: string;
  playerCode: string;
  executionResult: ExecutionResult;
}

export async function assembleGradingContext(
  input: AssembleInput
): Promise<GradingContextPackage> {
  const { projectRoot, challengeId, playerCode, executionResult } = input;

  const challenge = await loadChallengeById(
    defaultChallengesRoot(projectRoot),
    challengeId
  );
  if (!challenge) {
    throw new Error(`Unknown challenge id: ${challengeId}`);
  }

  const [graderInstructions, playwrightDocs, rubricRules, manifest] =
    await Promise.all([
      readFile(join(projectRoot, "corpus", "grader-instructions.md"), "utf8"),
      concatCorpusDir(join(projectRoot, "corpus", "playwright-docs")),
      concatCorpusDir(join(projectRoot, "corpus", "rubric-rules")),
      loadManifest(projectRoot, challenge.site),
    ]);

  const manifestIndex = new Map(manifest.elements.map((e) => [e.id, e]));
  const manifestEntries: DOMManifestEntry[] = [];
  for (const id of challenge.manifestElements) {
    const entry = manifestIndex.get(id);
    if (!entry) {
      throw new Error(
        `Challenge "${challenge.id}" references unknown manifest id "${id}" in site "${challenge.site}"`
      );
    }
    manifestEntries.push(entry);
  }

  const challengeNotes = await readChallengeNotes(projectRoot, challenge.site);

  const retrievedCorpus = await retrieveCorpusTexts(
    defaultCorpusRoot(projectRoot),
    {
      challengeTags: challenge.tags,
      errorKeywords: extractErrorKeywords(executionResult),
      playerCode,
      site: challenge.site,
      topK: 8,
    }
  );

  return {
    authoritative: {
      graderInstructions,
      playwrightDocs,
      rubricRules,
    },
    site: {
      id: challenge.site,
      baseUrl: manifest.base_url,
      manifestEntries,
      challengeNotes,
    },
    dynamic: {
      challenge,
      playerCode,
      executionResult,
      retrievedCorpus,
    },
  };
}

async function concatCorpusDir(dir: string): Promise<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return "";
  }
  const md = entries.filter((e) => extname(e) === ".md").sort();
  const chunks: string[] = [];
  for (const name of md) {
    const body = await readFile(join(dir, name), "utf8");
    const rel = `${dir.split(/[\\/]/).slice(-1)[0]}/${name}`;
    chunks.push(`<!-- source: ${rel} -->\n${body.trim()}`);
  }
  return chunks.join("\n\n---\n\n");
}

async function loadManifest(
  projectRoot: string,
  site: string
): Promise<DOMManifest> {
  const path = join(projectRoot, "sites", site, "manifest.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as DOMManifest;
}

async function readChallengeNotes(
  projectRoot: string,
  site: string
): Promise<string[]> {
  const dir = join(projectRoot, "corpus", "challenge-notes");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const siteMatch = entries
    .filter((e) => extname(e) === ".md" && e.toLowerCase().includes(site.toLowerCase()))
    .sort();
  const out: string[] = [];
  for (const name of siteMatch) {
    const body = await readFile(join(dir, name), "utf8");
    out.push(`<!-- source: challenge-notes/${name} -->\n${body.trim()}`);
  }
  return out;
}

function extractErrorKeywords(result: ExecutionResult): string[] {
  if (result.passed) return [];
  const source = [result.errorMessage ?? "", result.stderr ?? "", result.stdout ?? ""]
    .join(" ")
    .slice(0, 4000);
  const tokens = source
    .toLowerCase()
    .match(/\b[a-z][a-z0-9_.-]{2,}\b/g);
  if (!tokens) return [];
  const uniq = Array.from(new Set(tokens));
  return uniq.slice(0, 40);
}

/**
 * Renders the package into the three strings a provider adapter needs:
 * one authoritative block (cacheable across all requests), one site block
 * (cacheable per site), one dynamic block (per request).
 */
export function renderContextBlocks(pkg: GradingContextPackage): {
  authoritative: string;
  site: string;
  dynamic: string;
} {
  const authoritative = [
    pkg.authoritative.graderInstructions.trim(),
    "",
    "# Playwright Documentation (authoritative)",
    "",
    pkg.authoritative.playwrightDocs.trim(),
    "",
    "# Rubric Rules (authoritative)",
    "",
    pkg.authoritative.rubricRules.trim(),
  ].join("\n");

  const manifestJson = JSON.stringify(pkg.site.manifestEntries, null, 2);
  const site = [
    `# Site context: ${pkg.site.id}`,
    `Base URL: ${pkg.site.baseUrl}`,
    "",
    "## DOM manifest entries relevant to this challenge",
    "```json",
    manifestJson,
    "```",
    "",
    "## Challenge notes (site-specific guidance)",
    pkg.site.challengeNotes.length
      ? pkg.site.challengeNotes.join("\n\n")
      : "_No site-specific challenge notes._",
  ].join("\n");

  const challenge = pkg.dynamic.challenge;
  const exec = pkg.dynamic.executionResult;
  const execSnippet = {
    passed: exec.passed,
    exitCode: exec.exitCode,
    durationMs: exec.durationMs,
    errorMessage: exec.errorMessage,
    stdout: truncate(exec.stdout, 4000),
    stderr: truncate(exec.stderr, 4000),
  };

  const dynamic = [
    "# Grading request",
    "",
    "## Challenge",
    `- id: ${challenge.id}`,
    `- title: ${challenge.title}`,
    `- difficulty: ${challenge.difficulty}`,
    `- xpReward: ${challenge.xpReward}`,
    `- hintPenalty: ${challenge.hintPenalty}`,
    "",
    "### Client brief",
    challenge.clientBrief,
    "",
    "### Acceptance criteria",
    ...challenge.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
    "",
    "### Suggested Playwright APIs",
    challenge.suggestedPlaywrightAPIs.join(", "),
    "",
    "## Player submission",
    "```ts",
    pkg.dynamic.playerCode,
    "```",
    "",
    "## Execution result",
    "```json",
    JSON.stringify(execSnippet, null, 2),
    "```",
    "",
    "## Retrieved corpus chunks (ranked by relevance)",
    pkg.dynamic.retrievedCorpus.length
      ? pkg.dynamic.retrievedCorpus.join("\n\n---\n\n")
      : "_No additional chunks retrieved._",
    "",
    "## Task",
    "Grade this submission against the rubric and return the GradingResult JSON.",
  ].join("\n");

  return { authoritative, site, dynamic };
}

function truncate(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s;
}
