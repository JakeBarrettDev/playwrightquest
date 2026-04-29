import type { GradingResult, LineComment } from "@/lib/types/grading";
import type { TraceStep } from "@/lib/trace/types";
import type { MaskExpression, MaskLine } from "@/components/TutorMask";

export interface PostMortemScript {
  lines: MaskLine[];
  finalGrade: string;
  finalScore: number;
  finalExpression: MaskExpression;
}

export function buildPostMortemScript(
  result: GradingResult,
  actions: TraceStep[],
): PostMortemScript {
  const score = clampScore(result.score);
  const grade = scoreToGrade(score);
  const finalExpression: MaskExpression = score >= 70 ? "delighted" : "concerned";

  const lines: MaskLine[] = [];

  lines.push({
    text: openingText(result.passed, score),
    expression: openingExpression(result.passed, score),
  });

  for (const line of perCommentLines(result.feedback.lineComments, actions)) {
    lines.push(line);
  }

  lines.push({
    text: closingText(score),
    expression: closingExpression(score),
  });

  lines.push({
    text: `Your score: ${score}/100 — Grade: ${grade}`,
    expression: finalExpression,
  });

  return {
    lines,
    finalGrade: grade,
    finalScore: score,
    finalExpression,
  };
}

function openingText(passed: boolean, score: number): string {
  if (passed && score >= 90) return "A flawless performance. Let's walk through it.";
  if (passed && score >= 70) return "The curtain falls. A solid run — let's examine the craft.";
  if (passed) return "You passed. But passing and performing are different things.";
  return "The performance did not land. Let's find out why.";
}

function openingExpression(passed: boolean, score: number): MaskExpression {
  if (passed && score >= 90) return "delighted";
  if (passed && score >= 70) return "pleased";
  if (passed) return "neutral";
  return "concerned";
}

function closingText(score: number): string {
  if (score >= 90) return "A masterclass. The stage is yours.";
  if (score >= 70) return "Good work. The craft improves with every run.";
  if (score >= 50) return "The fundamentals are there. Study the brittle moments.";
  return "Back to rehearsal. The locators are fighting you — let them guide you instead.";
}

function closingExpression(score: number): MaskExpression {
  if (score >= 90) return "delighted";
  if (score >= 70) return "pleased";
  if (score >= 50) return "neutral";
  return "concerned";
}

function perCommentLines(
  comments: LineComment[],
  actions: TraceStep[],
): MaskLine[] {
  const sorted = [...comments].sort((a, b) => a.line - b.line);
  return sorted.map((c) => {
    const traceStepIndex = findTraceStepForLine(c.line, actions);
    return {
      text: `Line ${c.line} — ${c.message}`,
      expression: commentExpression(c.type),
      traceStepIndex,
    };
  });
}

function commentExpression(type: LineComment["type"]): MaskExpression {
  switch (type) {
    case "praise":
      return "pleased";
    case "error":
    case "warning":
      return "concerned";
    case "suggestion":
      return "neutral";
  }
}

function findTraceStepForLine(
  lineNumber: number,
  actions: TraceStep[],
): number | undefined {
  // Multiple trace steps may share a sourceLine (e.g., locator chain on one
  // line). Prefer a failing step on that line, otherwise take the first.
  let firstMatch = -1;
  for (let i = 0; i < actions.length; i += 1) {
    if (actions[i].sourceLine === lineNumber) {
      if (actions[i].error) return i;
      if (firstMatch === -1) firstMatch = i;
    }
  }
  return firstMatch === -1 ? undefined : firstMatch;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}
