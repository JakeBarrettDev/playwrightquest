// Page-level palette/mood (distinct from a mask's emotional `Mood` in ImgMask)
export type StageMood = "Opening Night" | "Dress Rehearsal" | "Matinee";
export type Cast = "Solo" | "Duo" | "Ensemble";
export type Drama = "Calm" | "Lively" | "Theatrical";

export type MoodTheme = {
  stageA: string;
  stageB: string;
  stageC: string;
  accent: string;
  accentMid: string;
  accentDeep: string;
  footlight: string;
  curtainFilter: string;
  kicker: string;
};

export const MOOD_THEMES: Record<StageMood, MoodTheme> = {
  "Opening Night": {
    stageA: "oklch(0.22 0.03 155)",
    stageB: "oklch(0.13 0.015 160)",
    stageC: "oklch(0.09 0.01 160)",
    accent: "oklch(0.82 0.16 152)",
    accentMid: "oklch(0.72 0.14 152)",
    accentDeep: "oklch(0.60 0.16 152)",
    footlight: "oklch(0.95 0.10 85 / 0.22)",
    curtainFilter: "none",
    kicker: "ACT I · SCENE 1",
  },
  "Dress Rehearsal": {
    stageA: "oklch(0.22 0.02 250)",
    stageB: "oklch(0.13 0.012 245)",
    stageC: "oklch(0.09 0.008 240)",
    accent: "oklch(0.82 0.12 230)",
    accentMid: "oklch(0.70 0.13 230)",
    accentDeep: "oklch(0.56 0.14 230)",
    footlight: "oklch(0.90 0.08 230 / 0.22)",
    curtainFilter: "hue-rotate(-60deg) saturate(0.75) brightness(0.9)",
    kicker: "ACT I · SCENE 1 · TECH",
  },
  Matinee: {
    stageA: "oklch(0.32 0.06 55)",
    stageB: "oklch(0.20 0.04 55)",
    stageC: "oklch(0.13 0.025 55)",
    accent: "oklch(0.85 0.14 65)",
    accentMid: "oklch(0.74 0.15 55)",
    accentDeep: "oklch(0.62 0.16 50)",
    footlight: "oklch(0.95 0.14 70 / 0.32)",
    curtainFilter: "hue-rotate(-15deg) saturate(1.1) brightness(1.05)",
    kicker: "MATINEE · ACT I",
  },
};

export type DramaPreset = {
  idle: boolean;
  blink: boolean;
  float: number;
  sway: boolean;
};

export const DRAMA_PRESETS: Record<Drama, DramaPreset> = {
  Calm: { idle: false, blink: false, float: 0, sway: false },
  Lively: { idle: true, blink: true, float: 12, sway: false },
  Theatrical: { idle: true, blink: true, float: 22, sway: true },
};
