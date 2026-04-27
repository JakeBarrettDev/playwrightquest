"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Curtain } from "./Curtain";
import { SpeechBubble } from "./SpeechBubble";
import { StageMasks } from "./StageMasks";
import { MOOD_THEMES, type Cast, type Drama, type StageMood } from "./theme";

// Hard-coded for v1 — see the design handoff for the full mood/cast/drama matrix.
// If we ever expose these as user controls, lift them to props or a context.
const PAGE_MOOD: StageMood = "Opening Night";
const PAGE_CAST: Cast = "Ensemble";
const PAGE_DRAMA: Drama = "Theatrical";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

type Bubble = { text: string; side: "left" | "right" } | null;

const ACTS = [
  {
    id: "easy",
    label: "Act I",
    sub: "Apprentice",
    desc: "Single-page flows, forgiving DOM, plenty of role-based landmarks.",
    xp: 50,
    ready: true,
    img: "/masks/single-happy-lime.png",
    href: "/acts#act-i",
  },
  {
    id: "med",
    label: "Act II",
    sub: "Understudy",
    desc: "Multi-step journeys, state transitions, the occasional red herring.",
    xp: 150,
    ready: true,
    img: "/masks/single-deep-blue.png",
    href: "/acts#act-ii",
  },
  {
    id: "hard",
    label: "Act III",
    sub: "Lead Role",
    desc: "Dynamic classes, race conditions, network intercepts, no second takes.",
    xp: 300,
    ready: false,
    img: "/masks/single-sad-royal-purple.png",
    href: "/acts#act-iii",
  },
] as const;

const RUBRIC = [
  { k: "Selector Quality", w: 35, hint: "getByRole > testid > CSS" },
  { k: "Assertion Quality", w: 25, hint: "web-first, always" },
  { k: "AC Coverage", w: 25, hint: "every Given / When / Then" },
  { k: "Code Quality", w: 15, hint: "await, structure, names" },
] as const;

const SCENES = [
  {
    n: "I",
    t: "Read the script",
    d: "A client brief plus Given/When/Then acceptance criteria. No ambiguity about what counts as done.",
  },
  {
    n: "II",
    t: "Write the test",
    d: "Monaco IDE with Playwright types pre-loaded. Autocomplete ranks getByRole before anything brittle.",
  },
  {
    n: "III",
    t: "Get graded",
    d: "The masks review selectors, assertions, coverage, and code quality — with line-level comments.",
  },
] as const;

const BADGES = [
  { l: "first-green", u: true },
  { l: "no-timeouts", u: true },
  { l: "role-based", u: true },
  { l: "archaeologist", u: false },
] as const;

export function TheaterHome() {
  const theme = MOOD_THEMES[PAGE_MOOD];
  const [bubble, setBubble] = useState<Bubble>(null);
  const [hiding, setHiding] = useState(false);
  const [konami, setKonami] = useState(false);
  const [ki, setKi] = useState(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const want = KONAMI_SEQUENCE[ki];
      if (e.key === want) {
        const n = ki + 1;
        if (n === KONAMI_SEQUENCE.length) {
          setKonami(true);
          setKi(0);
          setTimeout(() => setKonami(false), 5500);
        } else {
          setKi(n);
        }
      } else {
        setKi(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ki]);

  useEffect(() => {
    return () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const showBubble = (b: Bubble, ms: number) => {
    setBubble(b);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  };

  const onHappy = () => {
    showBubble({ text: '"Green is web-first. Well played."', side: "right" }, 2400);
  };
  const onSad = () => {
    setHiding(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHiding(false), 2400);
    showBubble({ text: '"Brittle selectors make me nervous..."', side: "left" }, 2400);
  };
  const onEnsembleTip = (tip: string, idx: number) => {
    showBubble({ text: `"${tip}"`, side: idx % 2 ? "left" : "right" }, 3200);
  };

  return (
    <div
      data-screen-label="01 Homepage — Playful Theater"
      style={{
        width: 1440,
        margin: "0 auto",
        minHeight: 2000,
        position: "relative",
        background: `radial-gradient(ellipse 120% 80% at 50% 20%, ${theme.stageA} 0%, ${theme.stageB} 60%, ${theme.stageC} 100%)`,
        color: "oklch(0.95 0.02 80)",
        fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
        overflow: "hidden",
        transition: "background 0.6s ease",
      }}
    >
      <Curtain theme={theme} drama={PAGE_DRAMA} />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/masks/Duo-original.png"
            alt=""
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 10px oklch(0.70 0.18 152 / 0.5))",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: 26,
              letterSpacing: "-0.01em",
            }}
          >
            Playwright{" "}
            <em style={{ fontStyle: "italic", color: theme.accent }}>
              Stagecraft
            </em>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 30,
            fontSize: 14,
            color: "oklch(0.78 0.02 80)",
          }}
        >
          <Link href="/acts" style={{ color: "inherit", textDecoration: "none" }}>
            Challenges
          </Link>
          <span style={{ cursor: "pointer" }}>Playbill</span>
          <span style={{ cursor: "pointer" }}>Docs</span>
          <span style={{ cursor: "pointer" }}>Sign in</span>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          gap: 20,
          padding: "40px 160px 40px 120px",
          minHeight: 720,
        }}
      >
        <div style={{ paddingTop: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 99,
              background: "oklch(0.28 0.06 155 / 0.5)",
              border: `1px solid ${theme.accentDeep}`,
              color: theme.accent,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: theme.accent,
                boxShadow: `0 0 10px ${theme.accent}`,
              }}
            />
            {theme.kicker}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: 104,
              lineHeight: 0.96,
              letterSpacing: "-0.025em",
              margin: "20px 0 0",
              fontWeight: 400,
              textWrap: "balance",
            }}
          >
            Learn Playwright
            <br />
            <em style={{ color: theme.accent }}>like a playwright.</em>
          </h1>
          <p
            style={{
              marginTop: 24,
              fontSize: 19,
              lineHeight: 1.55,
              maxWidth: 500,
              color: "oklch(0.82 0.02 80)",
              textWrap: "pretty",
            }}
          >
            Fictitious websites become your stage. Acceptance criteria become
            your script. Write real Playwright tests — a thoughtful AI grades
            not just whether they pass, but{" "}
            <em>how well they were written.</em>
          </p>
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 32,
              alignItems: "center",
            }}
          >
            <Link href="/acts" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "16px 26px",
                  fontSize: 16,
                  background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentDeep})`,
                  color: "oklch(0.12 0.04 160)",
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: `0 12px 40px ${theme.accentDeep} , inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
              >
                Raise the curtain <span style={{ fontSize: 18 }}>→</span>
              </button>
            </Link>
            <button
              style={{
                padding: "16px 22px",
                fontSize: 15,
                background: "transparent",
                color: "oklch(0.88 0.02 80)",
                border: "1px solid oklch(0.35 0.02 160)",
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Watch 90s overview
            </button>
          </div>
          <div
            style={{
              marginTop: 38,
              display: "flex",
              gap: 26,
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "oklch(0.60 0.02 80)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <span>· Monaco IDE</span>
            <span>· Real Playwright runtime</span>
            <span>· BYO LLM key</span>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <StageMasks
            onHappyClick={onHappy}
            onSadClick={onSad}
            onEnsembleTip={onEnsembleTip}
            hidingMode={hiding}
            cast={PAGE_CAST}
            drama={PAGE_DRAMA}
          />
          {/* Bubble overlay sits OUTSIDE the stage's flex flow so mounting
              the bubble cannot reflow the masks. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 25,
            }}
          >
            {bubble && (
              <SpeechBubble
                show
                text={bubble.text}
                x={
                  bubble.side === "right"
                    ? "calc(50% + 80px)"
                    : "calc(50% - 320px)"
                }
                y={bubble.side === "right" ? 60 : 360}
              />
            )}
          </div>
          {konami && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              {/* Radial bloom behind the text */}
              <div
                style={{
                  position: "absolute",
                  width: 520,
                  height: 520,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, oklch(0.72 0.22 152 / 0.55) 0%, oklch(0.65 0.20 152 / 0.25) 35%, transparent 70%)",
                  filter: "blur(8px)",
                  animation: "pq-encore-bloom 0.7s cubic-bezier(.2,.8,.3,1) forwards",
                }}
              />
              <div
                style={{
                  position: "relative",
                  fontFamily: "var(--font-instrument-serif), serif",
                  fontSize: 72,
                  fontStyle: "italic",
                  color: "oklch(0.92 0.18 152)",
                  animation:
                    "pq-encore-in 0.55s cubic-bezier(.2,.7,.3,1.4) both, pq-encore-pulse 1.6s ease-in-out 0.55s infinite",
                  whiteSpace: "nowrap",
                }}
              >
                ✦ Encore! ✦
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Difficulty / Acts */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "60px 120px 40px",
        }}
      >
        <SectionHeader kicker="Choose your act" title="Three difficulty tiers" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 22,
            marginTop: 34,
          }}
        >
          {ACTS.map((d) => {
            const card = (
              <div
                style={{
                  position: "relative",
                  background:
                    "linear-gradient(180deg, oklch(0.20 0.02 160 / 0.85), oklch(0.14 0.015 160 / 0.92))",
                  border: "1px solid oklch(0.30 0.03 160)",
                  borderRadius: 18,
                  padding: 28,
                  minHeight: 300,
                  overflow: "hidden",
                  backdropFilter: "blur(6px)",
                  cursor: d.ready ? "pointer" : "default",
                  height: "100%",
                }}
              >
                <img
                  src={d.img}
                  alt=""
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 92,
                    height: 92,
                    objectFit: "contain",
                    filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))",
                    opacity: d.ready ? 1 : 0.7,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    color: d.ready ? "oklch(0.76 0.16 152)" : "oklch(0.56 0.02 80)",
                    textTransform: "uppercase",
                  }}
                >
                  {d.ready ? "Now playing" : "Coming soon"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-instrument-serif), serif",
                    fontSize: 48,
                    lineHeight: 1,
                    marginTop: 12,
                    color: "oklch(0.96 0.02 80)",
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "oklch(0.74 0.02 80)",
                    marginTop: 4,
                    fontStyle: "italic",
                  }}
                >
                  {d.sub}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: "oklch(0.80 0.02 80)",
                    lineHeight: 1.55,
                    marginTop: 20,
                    maxWidth: 320,
                    textWrap: "pretty",
                  }}
                >
                  {d.desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginTop: 26,
                    paddingTop: 18,
                    borderTop: "1px dashed oklch(0.36 0.02 160)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 12,
                      color: "oklch(0.72 0.12 152)",
                    }}
                  >
                    +{d.xp} XP per scene
                  </span>
                  <span style={{ fontSize: 13, color: "oklch(0.72 0.02 80)" }}>
                    {d.ready ? "Enter →" : "—"}
                  </span>
                </div>
              </div>
            );
            return d.ready ? (
              <Link
                key={d.id}
                href={d.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {card}
              </Link>
            ) : (
              <div key={d.id}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "70px 120px",
        }}
      >
        <SectionHeader
          kicker="The performance"
          title="Three scenes, every challenge"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 0,
            marginTop: 40,
          }}
        >
          {SCENES.map((s, i) => (
            <div
              key={s.n}
              style={{
                padding: "0 28px",
                borderLeft: i > 0 ? "1px solid oklch(0.30 0.02 160)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-instrument-serif), serif",
                  fontSize: 128,
                  lineHeight: 1,
                  color: "oklch(0.32 0.05 155)",
                  marginBottom: 8,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-instrument-serif), serif",
                  fontSize: 30,
                  marginBottom: 12,
                }}
              >
                {s.t}
              </div>
              <p
                style={{
                  fontSize: 15,
                  color: "oklch(0.76 0.02 80)",
                  lineHeight: 1.55,
                  textWrap: "pretty",
                }}
              >
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Rubric + Playbill */}
      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "50px 120px 90px",
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: 36,
        }}
      >
        <div>
          <SectionHeader kicker="The rubric" title="How the masks judge you" />
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {RUBRIC.map((r) => (
              <div
                key={r.k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 58px",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-instrument-serif), serif",
                      fontSize: 22,
                    }}
                  >
                    {r.k}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 11,
                      color: "oklch(0.62 0.02 80)",
                    }}
                  >
                    {r.hint}
                  </div>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 99,
                    background: "oklch(0.24 0.02 160)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${r.w * 2.5}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, oklch(0.60 0.16 152), oklch(0.82 0.15 152))",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 13,
                    color: "oklch(0.82 0.02 80)",
                    textAlign: "right",
                  }}
                >
                  {r.w}%
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background:
              "linear-gradient(180deg, oklch(0.22 0.05 155 / 0.7), oklch(0.14 0.02 160 / 0.9))",
            border: "1px solid oklch(0.32 0.04 155)",
            borderRadius: 20,
            padding: 32,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            src="/masks/single-happy-green.png"
            alt=""
            style={{
              position: "absolute",
              right: -26,
              bottom: -20,
              width: 200,
              height: 200,
              objectFit: "contain",
              opacity: 0.5,
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "oklch(0.74 0.14 152)",
              textTransform: "uppercase",
            }}
          >
            your playbill
          </div>
          <div
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 66,
              lineHeight: 1,
              margin: "10px 0 4px",
            }}
          >
            Level 3
          </div>
          <div style={{ fontSize: 14, color: "oklch(0.76 0.02 80)" }}>
            Understudy in Training
          </div>
          <div
            style={{
              marginTop: 24,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              color: "oklch(0.72 0.02 80)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>420 XP</span>
            <span>/ 750 XP to Act II</span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 99,
              background: "oklch(0.24 0.02 160)",
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "56%",
                height: "100%",
                background:
                  "linear-gradient(90deg, oklch(0.62 0.16 152), oklch(0.82 0.15 152))",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              position: "relative",
              zIndex: 1,
            }}
          >
            {BADGES.map((b) => (
              <span
                key={b.l}
                style={{
                  padding: "6px 12px",
                  borderRadius: 99,
                  background: b.u ? "oklch(0.22 0.04 160)" : "oklch(0.18 0.01 160)",
                  border: "1px solid oklch(0.40 0.04 155)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  color: b.u ? "oklch(0.82 0.12 152)" : "oklch(0.55 0.02 80)",
                }}
              >
                {b.u ? "✦ " : "🔒 "}
                {b.l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 2,
          padding: "28px 120px 36px",
          borderTop: "1px solid oklch(0.24 0.02 160)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 12,
          color: "oklch(0.58 0.02 80)",
        }}
      >
        <span>Free &amp; open. Bring your own LLM key.</span>
        <span style={{ opacity: 0.7 }}>
          Hint — try ↑↑↓↓←→←→BA on the homepage.
        </span>
      </footer>
    </div>
  );
}

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "oklch(0.74 0.14 152)",
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: "var(--font-instrument-serif), Georgia, serif",
          fontSize: 60,
          letterSpacing: "-0.01em",
          marginTop: 10,
          color: "oklch(0.96 0.02 80)",
        }}
      >
        {title}
      </div>
    </div>
  );
}
