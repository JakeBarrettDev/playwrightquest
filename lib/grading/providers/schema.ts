/**
 * JSON Schema for the GradingResult payload. All three providers (Anthropic
 * tool use, OpenAI json_schema, Gemini responseSchema) accept a compatible
 * subset of JSON Schema, so we keep this to types, properties, required, and
 * enum — no `$defs`, no `oneOf`, no unevaluated properties.
 */
export const GRADING_RESULT_SCHEMA = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    breakdown: {
      type: "object",
      properties: {
        selector_quality: { type: "integer", minimum: 0, maximum: 100 },
        assertion_quality: { type: "integer", minimum: 0, maximum: 100 },
        acceptance_criteria_coverage: { type: "integer", minimum: 0, maximum: 100 },
        code_quality: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: [
        "selector_quality",
        "assertion_quality",
        "acceptance_criteria_coverage",
        "code_quality",
      ],
    },
    feedback: {
      type: "object",
      properties: {
        summary: { type: "string" },
        lineComments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              line: { type: "integer", minimum: 1 },
              type: {
                type: "string",
                enum: ["error", "warning", "suggestion", "praise"],
              },
              message: { type: "string" },
              citation: { type: "string" },
            },
            required: ["line", "type", "message"],
          },
        },
        failureArchaeology: { type: "string" },
        bestPracticeNotes: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["summary", "lineComments", "bestPracticeNotes"],
    },
    hintsUsed: { type: "integer", minimum: 0 },
    xpAwarded: { type: "integer", minimum: 0 },
  },
  required: ["passed", "score", "breakdown", "feedback", "hintsUsed", "xpAwarded"],
} as const;

export const GRADING_TOOL_NAME = "emit_grading_result";
