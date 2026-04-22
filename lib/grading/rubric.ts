/**
 * Rubric configuration for grading. Weights sum to 1.0 and are passed to the
 * LLM in the dynamic block of every request so the engine can cite them in
 * its score breakdown. Edits here are non-breaking — the grader reads weights
 * at request time.
 */
export interface RubricConfig {
  version: string;
  weights: {
    selector_quality: number;
    assertion_quality: number;
    acceptance_criteria_coverage: number;
    code_quality: number;
  };
  autoDeductions: string[];
}

export const DEFAULT_RUBRIC: RubricConfig = {
  version: "1.0.0",
  weights: {
    selector_quality: 0.35,
    assertion_quality: 0.25,
    acceptance_criteria_coverage: 0.25,
    code_quality: 0.15,
  },
  autoDeductions: [
    "Missing `await` on a Promise-returning Playwright call is an automatic deduction on code_quality.",
    "Any use of `page.waitForTimeout` in the submitted test is an automatic deduction on assertion_quality.",
    "Using `.first()` / `.nth(N)` to disambiguate elements that share an accessible name, instead of scoping via `.filter()`, is an automatic deduction on selector_quality.",
    "Referencing a manifest element by a locator listed in `brittle_locators` is an automatic deduction on selector_quality.",
  ],
};

export function formatRubricForPrompt(rubric: RubricConfig = DEFAULT_RUBRIC): string {
  const lines = [
    `# Active Rubric (version ${rubric.version})`,
    "",
    "## Category weights (sum to 1.0)",
    `- selector_quality: ${rubric.weights.selector_quality}`,
    `- assertion_quality: ${rubric.weights.assertion_quality}`,
    `- acceptance_criteria_coverage: ${rubric.weights.acceptance_criteria_coverage}`,
    `- code_quality: ${rubric.weights.code_quality}`,
    "",
    "## Automatic deductions",
    ...rubric.autoDeductions.map((d) => `- ${d}`),
    "",
    "The final `score` is the weighted sum of the four category scores (each 0–100), rounded to an integer.",
  ];
  return lines.join("\n");
}
