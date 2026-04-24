import { useState, useCallback } from "react";
import type { AnnotatedComment } from "@/lib/trace/types";

interface OpenOptions {
  runId: string;
  annotatedComments: AnnotatedComment[];
  stepThrough?: boolean;
}

interface TracePlayerState {
  isOpen: boolean;
  runId: string | null;
  annotatedComments: AnnotatedComment[];
  stepThrough: boolean;
}

const CLOSED: TracePlayerState = {
  isOpen: false,
  runId: null,
  annotatedComments: [],
  stepThrough: false,
};

export function useTracePlayer() {
  const [state, setState] = useState<TracePlayerState>(CLOSED);

  const open = useCallback((opts: OpenOptions) => {
    setState({
      isOpen: true,
      runId: opts.runId,
      annotatedComments: opts.annotatedComments,
      stepThrough: opts.stepThrough ?? false,
    });
  }, []);

  const close = useCallback(() => setState(CLOSED), []);

  return { open, close, ...state };
}
