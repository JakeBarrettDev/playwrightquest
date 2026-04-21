export type CorpusCategory =
  | "playwright-docs"
  | "rubric-rules"
  | "challenge-notes";

export interface CorpusChunk {
  /** Path relative to the corpus root, e.g. "playwright-docs/locators.md". */
  path: string;
  category: CorpusCategory;
  /** Basename without extension, e.g. "locators". */
  slug: string;
  /** The first H1 in the file, or the slug if none found. */
  title: string;
  /** Tokens collected from the `<!-- tags: ... -->` comment plus filename tokens. */
  tags: string[];
  /** Full markdown content of the file. */
  body: string;
}

export interface RetrieveQuery {
  /** Tags associated with the active challenge (from manifest entry `challenge_hooks`, `intentional_traps`, etc.). */
  challengeTags?: string[];
  /** Tokens pulled from the Playwright error output, stderr, or test failure. */
  errorKeywords?: string[];
  /** The player's test code — used to surface chunks that match patterns they already wrote. */
  playerCode?: string;
  /** Optional site identifier to boost matching challenge-notes files. */
  site?: string;
  /** How many chunks to return. Default 6. */
  topK?: number;
}

export interface ScoredChunk {
  chunk: CorpusChunk;
  score: number;
  matched: string[];
}
