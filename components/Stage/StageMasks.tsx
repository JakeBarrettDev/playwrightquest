"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ImgMask, type Mood } from "./ImgMask";
import { DRAMA_PRESETS, type Drama, type Cast } from "./theme";

type EnsembleMember = {
  mood: Mood;
  ring: "inner" | "outer";
  size: number;
  baseAngle: number;
  dir: 1 | -1;
  tip: string;
};

const ENSEMBLE_CAST: EnsembleMember[] = [
  // Inner ring — clockwise, faster
  { mood: "happyLime", ring: "inner", size: 92, baseAngle: 0, dir: 1, tip: "getByRole survives refactors. CSS selectors don’t." },
  { mood: "sadAqua", ring: "inner", size: 88, baseAngle: 60, dir: 1, tip: "await expect(locator).toBeVisible() — web-first, never timeout." },
  { mood: "happyIcy", ring: "inner", size: 90, baseAngle: 120, dir: 1, tip: "page.route() lets you mock the network without leaving Playwright." },
  { mood: "happyYellow", ring: "inner", size: 88, baseAngle: 180, dir: 1, tip: "Use trace.viewer to time-travel through your test — actions, network, console, all there." },
  { mood: "cheekyPurple", ring: "inner", size: 90, baseAngle: 240, dir: 1, tip: "page.pause() drops you into the inspector mid-test. Try it once, you’ll never go back." },
  { mood: "sadSlate", ring: "inner", size: 86, baseAngle: 300, dir: 1, tip: "Flaky tests usually mean missing waits. Lean on web-first assertions, not setTimeout." },
  // Outer ring — counter-clockwise, slower
  { mood: "sadPink", ring: "outer", size: 80, baseAngle: 0, dir: -1, tip: "test.step() turns a test into a readable trace." },
  { mood: "happySalmon", ring: "outer", size: 84, baseAngle: 60, dir: -1, tip: "Fixtures > beforeEach. Composable, typed, parallel-safe." },
  { mood: "sadBlue", ring: "outer", size: 82, baseAngle: 120, dir: -1, tip: "A trace.zip is worth a thousand console.logs." },
  { mood: "happyPink", ring: "outer", size: 80, baseAngle: 180, dir: -1, tip: "codegen writes your first draft. You’re still the playwright." },
  { mood: "happySteel", ring: "outer", size: 82, baseAngle: 240, dir: -1, tip: "page.locator() is lazy — it doesn’t query the DOM until you call .click() or expect." },
  { mood: "sadDeepRed", ring: "outer", size: 80, baseAngle: 300, dir: -1, tip: "expect(locator).toHaveText() retries. expect(locator.textContent()).toBe() does not." },
];

type Props = {
  onHappyClick?: () => void;
  onSadClick?: () => void;
  onEnsembleTip?: (tip: string, idx: number, position: { x: number; y: number }) => void;
  hidingMode?: boolean;
  cast?: Cast;
  drama?: Drama;
};

export function StageMasks({
  onHappyClick,
  onSadClick,
  onEnsembleTip,
  hidingMode = false,
  cast = "Duo",
  drama = "Lively",
}: Props) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [wink, setWink] = useState(false);
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const [boost, setBoost] = useState<Record<number, number>>({});
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  // Per-mask integrated angle (degrees). Persists across renders so speed
  // changes only affect future deltas, not the whole elapsed history.
  const anglesRef = useRef<number[]>(ENSEMBLE_CAST.map((c) => c.baseAngle));
  const orbitTRef = useRef(0);

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setMouse({
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 0.85))),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 0.85))),
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Continuous orbit clock — drives ensemble masks via integrated angles.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      orbitTRef.current += dt;
      const t = orbitTRef.current;
      ENSEMBLE_CAST.forEach((c, i) => {
        const baseSpeed = c.ring === "inner" ? 14 : 10;
        const isBoosted = (boost[i] ?? 0) > t;
        const speed = isBoosted ? baseSpeed * 3.2 : baseSpeed;
        anglesRef.current[i] += c.dir * speed * dt;
      });
      forceTick();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [boost]);

  // Scheduled blink
  useEffect(() => {
    if (!DRAMA_PRESETS[drama].blink) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setWink(true);
        setTimeout(() => setWink(false), 340);
        loop();
      }, 4200 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [drama]);

  const handleHappy = () => {
    setWink(true);
    setTimeout(() => setWink(false), 380);
    onHappyClick?.();
  };

  const dp = DRAMA_PRESETS[drama];
  const floatAnim = dp.idle ? "pq-float-happy 6s ease-in-out infinite" : "none";
  const floatAnimSad = dp.idle ? "pq-float-sad 7s ease-in-out infinite" : "none";
  const showSad = cast !== "Solo";
  const showEnsemble = cast === "Ensemble";

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: 620,
        height: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Spotlight pool */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 55% at 50% 55%, oklch(0.95 0.08 85 / 0.22), transparent 70%)",
          pointerEvents: "none",
          filter: "blur(6px)",
        }}
      />
      {/* Stage floor shadow */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "25%",
          right: "25%",
          height: 28,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)",
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />

      {/* Ensemble — orbiting supporting cast */}
      {showEnsemble &&
        ENSEMBLE_CAST.map((c, i) => {
          const rx = c.ring === "inner" ? 285 : 360;
          const ry = c.ring === "inner" ? 170 : 220;
          const isBoosted = (boost[i] ?? 0) > orbitTRef.current;
          const angDeg = anglesRef.current[i];
          const ang = (angDeg * Math.PI) / 180;
          const x = Math.cos(ang) * rx;
          const y = Math.sin(ang) * ry;
          const tilt = (i % 2 ? -1 : 1) * (8 + (i % 5));
          const isActive = activeIdx === i;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x + mouse.x * 6}px), calc(-50% + ${y + mouse.y * 5}px))`,
                transition: "filter 0.3s, opacity 0.3s",
                zIndex: c.ring === "inner" ? 2 : 1,
                opacity: isActive ? 1 : 0.92,
                filter: isActive
                  ? "drop-shadow(0 0 18px oklch(0.85 0.12 85 / 0.7))"
                  : "none",
              }}
            >
              <ImgMask
                mood={c.mood}
                size={c.size}
                tilt={tilt}
                glow={isBoosted}
                onClick={() => {
                  setBoost((b) => ({ ...b, [i]: orbitTRef.current + 2.5 }));
                  setActiveIdx(i);
                  onEnsembleTip?.(c.tip, i, { x, y });
                  setTimeout(
                    () => setActiveIdx((cur) => (cur === i ? null : cur)),
                    2400,
                  );
                }}
                aria-label={`Supporting cast ${i + 1} — click for a Playwright tip`}
              />
            </div>
          );
        })}

      {/* Sad mask — stage left */}
      {showSad && (
        <div
          style={{
            position: "absolute",
            left: hidingMode ? "38%" : "6%",
            top: "18%",
            transform: `translate(${mouse.x * -21}px, ${mouse.y * 15}px)`,
            transition:
              "left 0.75s cubic-bezier(.2,.7,.3,1), top 0.75s cubic-bezier(.2,.7,.3,1), transform 0.28s",
            animation: floatAnimSad,
            zIndex: hidingMode ? 1 : 2,
          }}
        >
          <ImgMask
            mood="sad"
            size={260}
            tilt={-14}
            hidden={hidingMode}
            onClick={onSadClick}
            aria-label="Melancholy mask — click to make it hide"
          />
        </div>
      )}

      {/* Happy mask — stage right (or center when Solo) */}
      <div
        style={{
          position: "absolute",
          right: cast === "Solo" ? "50%" : "4%",
          top: "8%",
          marginRight: cast === "Solo" ? -210 : 0,
          transform: `translate(${mouse.x * 15}px, ${mouse.y * 12}px)`,
          transition: "transform 0.22s",
          animation: floatAnim,
          zIndex: 3,
        }}
      >
        <ImgMask
          mood="happy"
          size={cast === "Solo" ? 420 : 340}
          tilt={8}
          winking={wink}
          onClick={handleHappy}
          aria-label="Joyful mask — click to wink"
        />
      </div>
    </div>
  );
}
