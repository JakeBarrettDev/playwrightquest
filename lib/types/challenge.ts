import type { Difficulty } from "./manifest";

export interface Challenge {
  id: string;
  title: string;
  site: string;
  difficulty: Difficulty;
  clientBrief: string;
  acceptanceCriteria: string[];
  /** Ids referencing entries in the site's DOMManifest.elements[]. */
  manifestElements: string[];
  /** Hint tags used by corpus retrieval. Typically mirrors manifest challenge_hooks. */
  tags: string[];
  suggestedPlaywrightAPIs: string[];
  /** Scaffolded starting code displayed in the IDE when the challenge loads. */
  startingCode: string;
  xpReward: number;
  hintPenalty: number;
}
