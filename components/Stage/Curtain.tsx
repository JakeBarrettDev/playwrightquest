"use client";

import { DRAMA_PRESETS, type Drama, type MoodTheme } from "./theme";

type Props = {
  theme: MoodTheme;
  drama: Drama;
};

export function Curtain({ theme, drama }: Props) {
  const dp = DRAMA_PRESETS[drama];
  const curtainFilter = theme.curtainFilter || "none";
  return (
    <>
      {/* Curtain PNG — already has clean transparency, the stage gradient
          shows through the cut-out center where the actors perform. The 2px
          negative inset hides any residual fringe at source-image edges. */}
      <img
        src="/masks/curtain-frame.png"
        alt=""
        style={{
          position: "absolute",
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          width: "calc(100% + 4px)",
          height: "calc(100% + 4px)",
          objectFit: "fill",
          pointerEvents: "none",
          filter: `${curtainFilter} drop-shadow(0 0 60px rgba(0,0,0,0.55))`,
          animation: dp.sway ? "pq-curtain-sway 9s ease-in-out infinite" : "none",
          transformOrigin: "50% 0%",
          transition: "filter 0.6s ease",
        }}
      />

      {/* Footlight glow from above */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 240,
          background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${theme.footlight}, transparent 70%)`,
          pointerEvents: "none",
          transition: "background 0.6s ease",
        }}
      />
    </>
  );
}
