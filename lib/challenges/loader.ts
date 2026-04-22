import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Challenge } from "../types/challenge";

let cache: { root: string; byId: Map<string, Challenge> } | null = null;

export async function loadChallenges(
  challengesRoot: string
): Promise<Challenge[]> {
  const byId = await loadIndex(challengesRoot);
  return [...byId.values()];
}

export async function loadChallengeById(
  challengesRoot: string,
  id: string
): Promise<Challenge | undefined> {
  const byId = await loadIndex(challengesRoot);
  return byId.get(id);
}

export function defaultChallengesRoot(projectRoot: string): string {
  return join(projectRoot, "challenges");
}

export function resetChallengesCache(): void {
  cache = null;
}

async function loadIndex(
  challengesRoot: string
): Promise<Map<string, Challenge>> {
  if (cache && cache.root === challengesRoot) return cache.byId;

  const byId = new Map<string, Challenge>();
  let entries: string[];
  try {
    entries = await readdir(challengesRoot);
  } catch {
    cache = { root: challengesRoot, byId };
    return byId;
  }

  for (const name of entries) {
    if (extname(name) !== ".json") continue;
    const full = join(challengesRoot, name);
    const raw = await readFile(full, "utf8");
    const parsed = JSON.parse(raw) as Challenge;
    if (!parsed.id) {
      throw new Error(`Challenge at ${full} is missing an \`id\` field`);
    }
    if (byId.has(parsed.id)) {
      throw new Error(`Duplicate challenge id "${parsed.id}" at ${full}`);
    }
    byId.set(parsed.id, parsed);
  }

  cache = { root: challengesRoot, byId };
  return byId;
}
