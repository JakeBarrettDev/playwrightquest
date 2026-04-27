"use client";

import { CSSProperties } from "react";

export type Mood =
  | "happy"
  | "happyGreen"
  | "happyLime"
  | "happyIcy"
  | "happySalmon"
  | "happyPurple"
  | "happyYellow"
  | "happyPink"
  | "happySteel"
  | "happySky"
  | "cheekyPurple"
  | "sad"
  | "sadAqua"
  | "sadBlue"
  | "sadPink"
  | "sadYellow"
  | "sadSlate"
  | "sadDeepRed"
  | "angry";

const MASK_IMG: Record<Mood, string> = {
  happy: "/masks/wink-frame-02.png",
  happyGreen: "/masks/single-happy-green.png",
  happyLime: "/masks/single-happy-lime.png",
  happyIcy: "/masks/single-happy-icy-blue.png",
  happySalmon: "/masks/single-happy-salmon.png",
  happyPurple: "/masks/single-sad-royal-purple.png",
  happyYellow: "/masks/single-happy-yellow.png",
  happyPink: "/masks/single-happy-pink.png",
  happySteel: "/masks/single-happy-steel.png",
  happySky: "/masks/single-happy-sky.png",
  cheekyPurple: "/masks/single-cheeky-purple.png",
  sad: "/masks/single-sad-orange.png",
  sadAqua: "/masks/single-exasperated-aqua.png",
  sadBlue: "/masks/single-deep-blue.png",
  sadPink: "/masks/single-sad-pink.png",
  sadYellow: "/masks/single-sad-yellow.png",
  sadSlate: "/masks/single-sad-slate.png",
  sadDeepRed: "/masks/single-sad-deep-red.png",
  angry: "/masks/single-angry-red.png",
};

// Only `happy` has a dedicated wink frame today; others fall back to the SVG eyelid overlay.
const MASK_WINK_FRAME: Partial<Record<Mood, string>> = {
  happy: "/masks/wink-frame-01.png",
};

const GLOW: Record<Mood, string> = {
  happy: "oklch(0.72 0.18 152 / 0.55)",
  happyGreen: "oklch(0.72 0.18 152 / 0.55)",
  happyLime: "oklch(0.82 0.18 130 / 0.55)",
  happyIcy: "oklch(0.80 0.15 215 / 0.55)",
  happySalmon: "oklch(0.78 0.18 25 / 0.55)",
  happyPurple: "oklch(0.70 0.18 295 / 0.55)",
  happyYellow: "oklch(0.85 0.18 90 / 0.55)",
  happyPink: "oklch(0.74 0.20 350 / 0.55)",
  happySteel: "oklch(0.65 0.08 230 / 0.50)",
  happySky: "oklch(0.78 0.16 220 / 0.55)",
  cheekyPurple: "oklch(0.55 0.20 295 / 0.55)",
  sad: "oklch(0.72 0.18 45 / 0.50)",
  sadAqua: "oklch(0.72 0.15 200 / 0.50)",
  sadBlue: "oklch(0.62 0.18 255 / 0.50)",
  sadPink: "oklch(0.74 0.18 350 / 0.50)",
  sadYellow: "oklch(0.78 0.16 80 / 0.50)",
  sadSlate: "oklch(0.55 0.04 250 / 0.45)",
  sadDeepRed: "oklch(0.50 0.20 25 / 0.55)",
  angry: "oklch(0.65 0.22 30 / 0.55)",
};

const EYELID_COLOR: Partial<Record<Mood, string>> = {
  happy: "#2e8b3d",
  happyLime: "#8db93c",
  happyIcy: "#42c4e0",
  happySalmon: "#ee7a6e",
  happyPurple: "#8a4ec9",
  sad: "#d8604b",
  sadAqua: "#3ba8aa",
  sadBlue: "#2b5fc9",
  sadPink: "#d9528c",
  angry: "#d23a2b",
};

const SINGLE_EYE = {
  left: { cx: 0.33, cy: 0.46, rx: 0.09, ry: 0.04 },
  right: { cx: 0.66, cy: 0.44, rx: 0.09, ry: 0.04 },
} as const;

type Props = {
  mood?: Mood;
  size?: number;
  tilt?: number;
  winking?: boolean;
  leftWinking?: boolean;
  hidden?: boolean;
  glow?: boolean;
  glowColor?: string;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  "aria-label"?: string;
};

export function ImgMask({
  mood = "happy",
  size = 240,
  tilt = 0,
  winking = false,
  leftWinking = false,
  hidden = false,
  glow = true,
  glowColor,
  onClick,
  style,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const baseSrc = MASK_IMG[mood];
  const winkSrc = MASK_WINK_FRAME[mood];
  const src = winking && winkSrc ? winkSrc : baseSrc;
  const interactive = !!onClick;
  const glowCol = glowColor ?? GLOW[mood];

  return (
    <div
      className={className}
      onClick={onClick}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel ?? `${mood} mask`}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        cursor: interactive ? "pointer" : "default",
        transform: `rotate(${tilt}deg) ${hidden ? "scale(0.82)" : "scale(1)"}`,
        opacity: hidden ? 0.55 : 1,
        transition:
          "transform 0.7s cubic-bezier(.2,.7,.3,1), opacity 0.5s, filter 0.3s",
        filter: glow
          ? `drop-shadow(0 22px 48px ${glowCol}) drop-shadow(0 4px 14px rgba(0,0,0,0.4))`
          : "none",
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          userSelect: "none",
          pointerEvents: "none",
          display: "block",
          transition: "opacity 0.12s",
        }}
      />
      {/* Preload wink frame so the first swap is instant */}
      {winkSrc && <img src={winkSrc} alt="" style={{ display: "none" }} />}

      {/* SVG eyelid fallback for moods without a dedicated wink raster */}
      {(winking || leftWinking) && !winkSrc && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <EyeLid side={winking ? "right" : "left"} mood={mood} />
        </svg>
      )}
    </div>
  );
}

function EyeLid({ side, mood }: { side: "left" | "right"; mood: Mood }) {
  const c = EYELID_COLOR[mood] ?? "#2e8b3d";
  const { cx, cy, rx, ry } = side === "left" ? SINGLE_EYE.left : SINGLE_EYE.right;
  const x = cx * 100;
  const y = cy * 100;
  const rX = rx * 100;
  const rY = ry * 100 * 1.6;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rX} ry={rY} fill={c} />
      <path
        d={`M ${x - rX} ${y + 0.2} Q ${x} ${y - rY * 0.9} ${x + rX} ${y + 0.2}`}
        stroke="#0f2a1a"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
