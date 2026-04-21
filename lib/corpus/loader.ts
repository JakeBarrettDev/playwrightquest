import { readdir, readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import type { CorpusCategory, CorpusChunk } from "./types";

const CATEGORIES: CorpusCategory[] = [
  "playwright-docs",
  "rubric-rules",
  "challenge-notes",
];

const TAG_LINE = /<!--\s*tags:\s*(.+?)\s*-->/i;
const H1 = /^#\s+(.+?)\s*$/m;

let cache: { root: string; chunks: CorpusChunk[] } | null = null;

export async function loadCorpus(corpusRoot: string): Promise<CorpusChunk[]> {
  if (cache && cache.root === corpusRoot) return cache.chunks;

  const chunks: CorpusChunk[] = [];
  for (const category of CATEGORIES) {
    const dir = join(corpusRoot, category);
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (extname(name) !== ".md") continue;
      const full = join(dir, name);
      const body = await readFile(full, "utf8");
      chunks.push(parseChunk(category, `${category}/${name}`, body));
    }
  }

  cache = { root: corpusRoot, chunks };
  return chunks;
}

/** Testing hook — clears the module-scope cache. */
export function resetCorpusCache(): void {
  cache = null;
}

function parseChunk(
  category: CorpusCategory,
  relativePath: string,
  body: string
): CorpusChunk {
  const slug = basename(relativePath, ".md");
  const titleMatch = body.match(H1);
  const title = titleMatch?.[1]?.trim() ?? slug;

  const tagMatch = body.match(TAG_LINE);
  const explicitTags = tagMatch
    ? tagMatch[1]
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const filenameTags = slug
    .split(/[-_]/g)
    .map((t) => t.toLowerCase())
    .filter(Boolean);

  const tags = Array.from(new Set([...explicitTags, ...filenameTags]));

  return { path: relativePath, category, slug, title, tags, body };
}
