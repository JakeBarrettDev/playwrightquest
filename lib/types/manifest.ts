export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface DOMManifestEntry {
  id: string;
  description: string;
  page?: string;
  ideal_locator: string;
  acceptable_locators: string[];
  brittle_locators: string[];
  aria_notes: string;
  intentional_traps: string[];
  challenge_hooks: string[];
  difficulty: Difficulty;
}

export interface DOMManifest {
  site: string;
  version: string;
  base_url: string;
  pages: Record<string, string>;
  elements: DOMManifestEntry[];
}
