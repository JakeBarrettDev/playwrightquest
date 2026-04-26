import AdmZip from "adm-zip";
import type { TraceStep } from "./types";

interface RawBefore {
  type: "before";
  callId: string;
  startTime: number;
  apiName?: string;
  params?: Record<string, unknown>;
  frames?: Array<{ file?: string; line?: number; column?: number; function?: string }>;
}

interface RawInput {
  type: "input";
  callId: string;
  targetBoundingBox?: { x: number; y: number; width: number; height: number };
}

interface RawAfter {
  type: "after";
  callId: string;
  endTime: number;
  error?: { message?: string } | null;
  attachments?: Array<{ name?: string; sha1?: string; contentType?: string }>;
}

type RawEvent = RawBefore | RawInput | RawAfter | { type: string; [k: string]: unknown };

export function parseTraceZip(zipPath: string): TraceStep[] {
  const zip = new AdmZip(zipPath);

  // Find the main trace events file — may be "trace.trace" or under a subdirectory.
  const traceEntry =
    zip.getEntry("trace.trace") ??
    zip.getEntries().find(
      (e) => !e.isDirectory && e.entryName.endsWith(".trace") && !e.entryName.includes("network")
    );

  if (!traceEntry) return [];

  const raw = traceEntry.getData().toString("utf8");
  const events: RawEvent[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as RawEvent);
    } catch {
      // skip malformed lines
    }
  }

  // Index events by callId.
  const beforeMap = new Map<string, RawBefore>();
  const inputMap = new Map<string, RawInput>();
  const afterMap = new Map<string, RawAfter>();

  for (const ev of events) {
    if (ev.type === "before") beforeMap.set((ev as RawBefore).callId, ev as RawBefore);
    else if (ev.type === "input") inputMap.set((ev as RawInput).callId, ev as RawInput);
    else if (ev.type === "after") afterMap.set((ev as RawAfter).callId, ev as RawAfter);
  }

  // Build steps with rawStartTime for timestamp computation.
  type StepWithRaw = TraceStep & { rawStartTime: number };
  const rawSteps: StepWithRaw[] = [];
  let index = 0;

  for (const [callId, before] of beforeMap) {
    const apiName = before.apiName ?? "";
    // Skip internal framework calls and only expose user-visible actions.
    if (!apiName || apiName.startsWith("_") || apiName === "browser.newContext" || apiName === "browser.newPage") continue;

    const after = afterMap.get(callId);
    const input = inputMap.get(callId);

    const rawStartTime = before.startTime ?? 0;
    const endTime = after?.endTime ?? rawStartTime;
    const durationMs = Math.max(0, endTime - rawStartTime);

    const sourceLine = before.frames?.find(
      (f) => f.file?.endsWith("player.spec.ts")
    )?.line;

    const locator = extractLocator(apiName, before.params);

    rawSteps.push({
      index: index++,
      action: apiName,
      params: before.params ?? {},
      locator,
      boundingBox: input?.targetBoundingBox,
      durationMs,
      videoTimestampMs: 0, // filled in below
      error: after?.error?.message ?? undefined,
      sourceLine,
      rawStartTime,
    });
  }

  // Compute videoTimestampMs relative to the first action's start.
  const originTime = rawSteps.length > 0
    ? Math.min(...rawSteps.map((s) => s.rawStartTime))
    : 0;

  const steps: TraceStep[] = rawSteps.map(({ rawStartTime, ...step }) => ({
    ...step,
    videoTimestampMs: rawStartTime - originTime + step.durationMs / 2,
  }));

  return steps;
}

export function getResourceFromZip(zipPath: string, sha: string): Buffer | null {
  const zip = new AdmZip(zipPath);
  // Resources are stored as resources/<sha>.png or similar.
  const entry =
    zip.getEntry(`resources/${sha}.png`) ??
    zip.getEntry(`resources/${sha}`) ??
    zip.getEntries().find((e) => e.entryName.includes(sha));
  if (!entry) return null;
  return entry.getData();
}

function extractLocator(
  apiName: string,
  params: Record<string, unknown> | undefined
): string | undefined {
  if (!params) return undefined;
  // Playwright stores the locator selector under params.selector for locator-based calls.
  if (typeof params.selector === "string") return params.selector;
  // For page.getBy* calls the expression may be reconstructed from the apiName + arg.
  if (typeof params.expression === "string") return params.expression;
  return undefined;
}
