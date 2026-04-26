export interface TraceStep {
  index: number;
  action: string;
  params: Record<string, unknown>;
  locator?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  durationMs: number;
  videoTimestampMs: number;
  error?: string;
  sourceLine?: number;
}

export interface AnnotatedComment {
  stepIndex: number | null;
  type: "error" | "warning" | "suggestion" | "praise";
  message: string;
  citation?: string;
}
