// theaterHomeV2.jsx — Direction A refined.
// Curtain becomes a full framing device; masks are now image-based (user assets);
// layout is more theatrical — proscenium arch, spotlit masks, playbill feel.

// Three expressive tweaks that reshape the page:
//   · mood  — Opening Night / Dress Rehearsal / Matinee (color temp + lighting)
//   · cast  — Duo / Ensemble / Solo (who's on stage)
//   · drama — Calm / Lively / Theatrical (motion intensity)
const MOOD_THEMES = {
  'Opening Night': {
    stageA: 'oklch(0.22 0.03 155)',
    stageB: 'oklch(0.13 0.015 160)',
    stageC: 'oklch(0.09 0.01 160)',
    accent: 'oklch(0.82 0.16 152)',
    accentMid: 'oklch(0.72 0.14 152)',
    accentDeep: 'oklch(0.60 0.16 152)',
    footlight: 'oklch(0.95 0.10 85 / 0.22)',
    curtainFilter: 'none',
    kicker: 'ACT I · SCENE 1',
  },
  'Dress Rehearsal': {
    stageA: 'oklch(0.22 0.02 250)',
    stageB: 'oklch(0.13 0.012 245)',
    stageC: 'oklch(0.09 0.008 240)',
    accent: 'oklch(0.82 0.12 230)',
    accentMid: 'oklch(0.70 0.13 230)',
    accentDeep: 'oklch(0.56 0.14 230)',
    footlight: 'oklch(0.90 0.08 230 / 0.22)',
    curtainFilter: 'hue-rotate(-60deg) saturate(0.75) brightness(0.9)',
    kicker: 'ACT I · SCENE 1 · TECH',
  },
  'Matinee': {
    stageA: 'oklch(0.32 0.06 55)',
    stageB: 'oklch(0.20 0.04 55)',
    stageC: 'oklch(0.13 0.025 55)',
    accent: 'oklch(0.85 0.14 65)',
    accentMid: 'oklch(0.74 0.15 55)',
    accentDeep: 'oklch(0.62 0.16 50)',
    footlight: 'oklch(0.95 0.14 70 / 0.32)',
    curtainFilter: 'hue-rotate(-15deg) saturate(1.1) brightness(1.05)',
    kicker: 'MATINEE · ACT I',
  },
};

const DRAMA_PRESETS = {
  Calm:        { idle: false, blink: false, float: 0, sway: false },
  Lively:      { idle: true,  blink: true,  float: 12, sway: false },
  Theatrical:  { idle: true,  blink: true,  float: 22, sway: true },
};

// Ensemble cast — twelve supporting masks each carrying a real Playwright tip.
// Click any to speed up its orbit and pop the tip in a speech bubble.
const ENSEMBLE_CAST = [
  // Inner ring (fast, clockwise) — 6 members
  { mood: 'happyLime',    ring: 'inner', size: 92,  baseAngle:   0, dir:  1, tip: 'getByRole survives refactors. CSS selectors don\u2019t.' },
  { mood: 'sadAqua',      ring: 'inner', size: 88,  baseAngle:  60, dir:  1, tip: 'await expect(locator).toBeVisible() \u2014 web-first, never timeout.' },
  { mood: 'happyIcy',     ring: 'inner', size: 90,  baseAngle: 120, dir:  1, tip: 'page.route() lets you mock the network without leaving Playwright.' },
  { mood: 'happyYellow',  ring: 'inner', size: 88,  baseAngle: 180, dir:  1, tip: 'Use trace.viewer to time-travel through your test \u2014 actions, network, console, all there.' },
  { mood: 'cheekyPurple', ring: 'inner', size: 90,  baseAngle: 240, dir:  1, tip: 'page.pause() drops you into the inspector mid-test. Try it once, you\u2019ll never go back.' },
  { mood: 'sadSlate',     ring: 'inner', size: 86,  baseAngle: 300, dir:  1, tip: 'Flaky tests usually mean missing waits. Lean on web-first assertions, not setTimeout.' },
  // Outer ring (slow, counter-clockwise) — 6 members
  { mood: 'sadPink',      ring: 'outer', size: 80,  baseAngle:   0, dir: -1, tip: 'test.step() turns a test into a readable trace.' },
  { mood: 'happySalmon',  ring: 'outer', size: 84,  baseAngle:  60, dir: -1, tip: 'Fixtures > beforeEach. Composable, typed, parallel-safe.' },
  { mood: 'sadBlue',      ring: 'outer', size: 82,  baseAngle: 120, dir: -1, tip: 'A trace.zip is worth a thousand console.logs.' },
  { mood: 'happyPink',    ring: 'outer', size: 80,  baseAngle: 180, dir: -1, tip: 'codegen writes your first draft. You\u2019re still the playwright.' },
  { mood: 'happySteel',   ring: 'outer', size: 82,  baseAngle: 240, dir: -1, tip: 'page.locator() is lazy \u2014 it doesn\u2019t query the DOM until you call .click() or expect.' },
  { mood: 'sadDeepRed',   ring: 'outer', size: 80,  baseAngle: 300, dir: -1, tip: 'expect(locator).toHaveText() retries. expect(locator.textContent()).toBe() does not.' },
];

function StageMasks({ onHappyClick, onSadClick, onEnsembleTip, hidingMode, cast = 'Duo', drama = 'Lively' }) {
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });
  const [wink, setWink] = React.useState(false);
  const [, forceTick] = React.useReducer((x) => x + 1, 0);
  const [boost, setBoost] = React.useState({}); // { idx: untilSeconds }
  const [activeIdx, setActiveIdx] = React.useState(null);
  const ref = React.useRef(null);
  // Per-mask integrated angle (deg). Persists across renders so speed
  // changes don't teleport — they only affect future deltas.
  const anglesRef = React.useRef(ENSEMBLE_CAST.map((c) => c.baseAngle));
  const orbitTRef = React.useRef(0);

  React.useEffect(() => {
    const onMove = (e) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setMouse({
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 0.85))),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 0.85))),
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Continuous orbit clock — drives ensemble masks via integrated angles.
  React.useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp dt for tab-blur safety
      last = now;
      orbitTRef.current += dt;
      const t = orbitTRef.current;
      ENSEMBLE_CAST.forEach((c, i) => {
        const baseSpeed = c.ring === 'inner' ? 14 : 10;
        const isBoosted = (boost[i] || 0) > t;
        const speed = isBoosted ? baseSpeed * 3.2 : baseSpeed;
        anglesRef.current[i] += c.dir * speed * dt;
      });
      forceTick();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [boost]);

  React.useEffect(() => {
    if (!DRAMA_PRESETS[drama].blink) return;
    let t;
    const loop = () => {
      t = setTimeout(() => { setWink(true); setTimeout(() => setWink(false), 340); loop(); },
                     4200 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [drama]);

  const handleHappy = () => { setWink(true); setTimeout(() => setWink(false), 380); onHappyClick?.(); };
  const dp = DRAMA_PRESETS[drama] || DRAMA_PRESETS.Lively;
  const floatAnim = dp.idle ? `pq-float-happy 6s ease-in-out infinite` : 'none';
  const floatAnimSad = dp.idle ? `pq-float-sad 7s ease-in-out infinite` : 'none';
  const showSad = cast !== 'Solo';
  const showEnsemble = cast === 'Ensemble';

  return (
    <div ref={ref} style={{
      position: 'relative', width: 620, height: 520,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Spotlight pool */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 55% at 50% 55%, oklch(0.95 0.08 85 / 0.22), transparent 70%)',
        pointerEvents: 'none', filter: 'blur(6px)',
      }} />
      {/* Stage floor shadow */}
      <div style={{
        position: 'absolute', bottom: 40, left: '25%', right: '25%', height: 28,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)',
        filter: 'blur(6px)', pointerEvents: 'none',
      }} />

      {/* Ensemble — orbiting supporting cast */}
      {showEnsemble && ENSEMBLE_CAST.map((c, i) => {
        // Two rings of 6 masks each. Inner is tighter and orbits clockwise;
        // outer is wider and counter-clockwise so they appear to weave past.
        const rx = c.ring === 'inner' ? 285 : 360;
        const ry = c.ring === 'inner' ? 170 : 220;
        const isBoosted = (boost[i] || 0) > orbitTRef.current;
        const angDeg = anglesRef.current[i];
        const ang = (angDeg * Math.PI) / 180;
        const x = Math.cos(ang) * rx;
        const y = Math.sin(ang) * ry;
        const tilt = (i % 2 ? -1 : 1) * (8 + (i % 5));
        const isActive = activeIdx === i;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: `translate(calc(-50% + ${x + mouse.x * 4}px), calc(-50% + ${y + mouse.y * 3}px))`,
            transition: 'filter 0.3s, opacity 0.3s',
            zIndex: c.ring === 'inner' ? 2 : 1,
            opacity: isActive ? 1 : 0.78,
            filter: isActive ? 'drop-shadow(0 0 18px oklch(0.85 0.12 85 / 0.7))' : 'none',
          }}>
            <ImgMask
              mood={c.mood} size={c.size} tilt={tilt}
              glow={isBoosted}
              onClick={() => {
                setBoost((b) => ({ ...b, [i]: orbitTRef.current + 2.5 }));
                setActiveIdx(i);
                onEnsembleTip?.(c.tip, i, { x, y });
                setTimeout(() => setActiveIdx((cur) => (cur === i ? null : cur)), 2400);
              }}
              aria-label={`Supporting cast ${i + 1} \u2014 click for a Playwright tip`}
            />
          </div>
        );
      })}

      {/* Sad mask — stage left */}
      {showSad && (
        <div style={{
          position: 'absolute',
          left: hidingMode ? '38%' : '6%',
          top: '18%',
          transform: `translate(${mouse.x * -14}px, ${mouse.y * 10}px)`,
          transition: 'left 0.75s cubic-bezier(.2,.7,.3,1), top 0.75s cubic-bezier(.2,.7,.3,1), transform 0.28s',
          animation: floatAnimSad,
          zIndex: hidingMode ? 1 : 2,
        }}>
          <ImgMask
            mood="sad" size={260} tilt={-14}
            hidden={hidingMode}
            onClick={onSadClick}
            aria-label="Melancholy mask — click to make it hide"
          />
        </div>
      )}

      {/* Happy mask — stage right (or center when Solo) */}
      <div style={{
        position: 'absolute',
        right: cast === 'Solo' ? '50%' : '4%',
        top: '8%',
        marginRight: cast === 'Solo' ? -210 : 0,
        transform: `translate(${mouse.x * 10}px, ${mouse.y * 8}px)`,
        transition: 'transform 0.22s',
        animation: floatAnim,
        zIndex: 3,
      }}>
        <ImgMask
          mood="happy" size={cast === 'Solo' ? 420 : 340} tilt={8}
          winking={wink}
          onClick={handleHappy}
          aria-label="Joyful mask — click to wink"
        />
      </div>
    </div>
  );
}

function SpeechBubble2({ show, text, x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      background: 'oklch(0.96 0.03 80)', color: 'oklch(0.22 0.02 160)',
      padding: '11px 16px', borderRadius: 14, fontSize: 13,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      maxWidth: 260,
      boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.95)',
      transition: 'opacity 0.18s, transform 0.18s',
      pointerEvents: 'none', zIndex: 20,
    }}>
      {text}
      <div style={{
        position: 'absolute', left: 28, bottom: -7, width: 14, height: 14,
        background: 'oklch(0.96 0.03 80)', transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

// Curtain — single user-provided PNG spread across the whole page.
// The PNG already contains both drapes + scalloped valance with a transparent
// center, so we just stretch it to fill the artboard. A tiny negative inset
// hides any residual white fringe at the very edge of the source image.
function Curtain({ theme, drama }) {
  const dp = DRAMA_PRESETS[drama] || DRAMA_PRESETS.Lively;
  const curtainFilter = theme?.curtainFilter || 'none';
  return (
    <>
      {/* Curtain PNG now has clean transparency — no backdrop plate needed.
          The stage background gradient shows cleanly through the cut-out
          center where the actors perform. */}
      <img src="masks/curtain-frame.png?v3" alt="" style={{
        position: 'absolute',
        top: -2, left: -2, right: -2, bottom: -2, // 2px bleed past edges
        width: 'calc(100% + 4px)', height: 'calc(100% + 4px)',
        objectFit: 'fill',
        pointerEvents: 'none',
        filter: `${curtainFilter} drop-shadow(0 0 60px rgba(0,0,0,0.55))`,
        animation: dp.sway ? 'pq-curtain-sway 9s ease-in-out infinite' : 'none',
        transformOrigin: '50% 0%',
        transition: 'filter 0.6s ease',
      }} />

      {/* Footlight glow from above */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 240,
        background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${theme?.footlight || 'oklch(0.95 0.10 85 / 0.22)'}, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />
    </>
  );
}

function TheaterHomeV2({ mood = 'Opening Night', cast = 'Duo', drama = 'Lively' } = {}) {
  const theme = MOOD_THEMES[mood] || MOOD_THEMES['Opening Night'];
  const [bubble, setBubble] = React.useState(null);
  const [hiding, setHiding] = React.useState(false);
  const [konami, setKonami] = React.useState(false);
  const [ki, setKi] = React.useState(0);
  const seq = React.useRef(['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']);

  React.useEffect(() => {
    const onKey = (e) => {
      const want = seq.current[ki];
      if (e.key === want) {
        const n = ki + 1;
        if (n === seq.current.length) { setKonami(true); setKi(0); setTimeout(() => setKonami(false), 5500); }
        else setKi(n);
      } else setKi(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ki]);

  const onHappy = () => {
    setBubble({ text: '"Green is web-first. Well played."', side: 'right' });
    clearTimeout(window.__pq_b); window.__pq_b = setTimeout(() => setBubble(null), 2400);
  };
  const onSad = () => {
    setHiding(true);
    setBubble({ text: '"Brittle selectors make me nervous..."', side: 'left' });
    clearTimeout(window.__pq_h); window.__pq_h = setTimeout(() => setHiding(false), 2400);
    clearTimeout(window.__pq_b); window.__pq_b = setTimeout(() => setBubble(null), 2400);
  };

  const acts = [
    { id: 'easy',   label: 'Act I',   sub: 'Apprentice',  desc: 'Single-page flows, forgiving DOM, plenty of role-based landmarks.', xp: 50,  ready: true,  img: 'masks/single-happy-lime.png' },
    { id: 'med',    label: 'Act II',  sub: 'Understudy',  desc: 'Multi-step journeys, state transitions, the occasional red herring.', xp: 150, ready: true,  img: 'masks/single-deep-blue.png' },
    { id: 'hard',   label: 'Act III', sub: 'Lead Role',   desc: 'Dynamic classes, race conditions, network intercepts, no second takes.', xp: 300, ready: false, img: 'masks/single-sad-royal-purple.png' },
  ];

  const rubric = [
    { k: 'Selector Quality',  w: 35, hint: 'getByRole > testid > CSS' },
    { k: 'Assertion Quality', w: 25, hint: 'web-first, always' },
    { k: 'AC Coverage',       w: 25, hint: 'every Given / When / Then' },
    { k: 'Code Quality',      w: 15, hint: 'await, structure, names' },
  ];

  return (
    <div data-screen-label="01 Homepage — Playful Theater"
      style={{
        width: 1440, minHeight: 2000, position: 'relative',
        background: `radial-gradient(ellipse 120% 80% at 50% 20%, ${theme.stageA} 0%, ${theme.stageB} 60%, ${theme.stageC} 100%)`,
        color: 'oklch(0.95 0.02 80)',
        fontFamily: '"Geist", "Inter", system-ui, sans-serif',
        overflow: 'hidden',
        transition: 'background 0.6s ease',
      }}
    >
      <Curtain theme={theme} drama={drama} />

      {/* Nav — sits on top of curtain */}
      <nav style={{
        position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '26px 56px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="masks/Duo-original.png" style={{ width: 44, height: 44, objectFit: 'contain',
            filter: 'drop-shadow(0 4px 10px oklch(0.70 0.18 152 / 0.5))' }} alt="" />
          <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 26, letterSpacing: '-0.01em' }}>
            Playwright <em style={{ fontStyle: 'italic', color: theme.accent }}>Stagecraft</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 30, fontSize: 14, color: 'oklch(0.78 0.02 80)' }}>
          <span style={{cursor:'pointer'}}>Challenges</span>
          <span style={{cursor:'pointer'}}>Playbill</span>
          <span style={{cursor:'pointer'}}>Docs</span>
          <span style={{cursor:'pointer'}}>Sign in</span>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative', zIndex: 2,
        display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 20,
        padding: '40px 160px 40px 120px',
        minHeight: 720,
      }}>
        <div style={{ paddingTop: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 99,
            background: 'oklch(0.28 0.06 155 / 0.5)',
            border: `1px solid ${theme.accentDeep}`,
            color: theme.accent,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.14em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }} />
            {theme.kicker}
          </div>
          <h1 style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 104, lineHeight: 0.96, letterSpacing: '-0.025em',
            margin: '20px 0 0', fontWeight: 400, textWrap: 'balance',
          }}>
            Learn Playwright
            <br />
            <em style={{ color: theme.accent }}>like a playwright.</em>
          </h1>
          <p style={{
            marginTop: 24, fontSize: 19, lineHeight: 1.55, maxWidth: 500,
            color: 'oklch(0.82 0.02 80)', textWrap: 'pretty',
          }}>
            Fictitious websites become your stage. Acceptance criteria become
            your script. Write real Playwright tests — a thoughtful AI grades
            not just whether they pass, but <em>how well they were written.</em>
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 32, alignItems: 'center' }}>
            <button style={{
              padding: '16px 26px', fontSize: 16,
              background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentDeep})`,
              color: 'oklch(0.12 0.04 160)',
              border: `1px solid ${theme.accent}`,
              borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              boxShadow: `0 12px 40px ${theme.accentDeep} , inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}>
              Raise the curtain <span style={{ fontSize: 18 }}>→</span>
            </button>
            <button style={{
              padding: '16px 22px', fontSize: 15, background: 'transparent',
              color: 'oklch(0.88 0.02 80)', border: '1px solid oklch(0.35 0.02 160)',
              borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>Watch 90s overview</button>
          </div>
          <div style={{
            marginTop: 38, display: 'flex', gap: 26, fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            color: 'oklch(0.60 0.02 80)', letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            <span>· Monaco IDE</span>
            <span>· Real Playwright runtime</span>
            <span>· BYO LLM key</span>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <StageMasks onHappyClick={onHappy} onSadClick={onSad} onEnsembleTip={(tip, i) => {
            setBubble({ text: '"' + tip + '"', side: i % 2 ? 'left' : 'right' });
            clearTimeout(window.__pq_b); window.__pq_b = setTimeout(() => setBubble(null), 3200);
          }} hidingMode={hiding} cast={cast} drama={drama} />
          {/* Speech-bubble overlay — absolute & inset:0 so adding/removing
              the bubble can never reflow the masks. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
            {bubble && (
              <SpeechBubble2
                show={!!bubble} text={bubble.text}
                x={bubble.side === 'right' ? 'calc(50% + 80px)' : 'calc(50% - 320px)'}
                y={bubble.side === 'right' ? 60 : 360}
              />
            )}
          </div>
          {konami && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Instrument Serif", serif', fontSize: 54, color: 'oklch(0.82 0.18 152)',
              textShadow: '0 0 40px oklch(0.72 0.20 152 / 0.9)',
              pointerEvents: 'none', zIndex: 10,
            }}>
              ✦ Encore! ✦
            </div>
          )}
        </div>
      </section>

      {/* Difficulty / Acts */}
      <section style={{ position: 'relative', zIndex: 2, padding: '60px 120px 40px' }}>
        <SectionHeader2 kicker="Choose your act" title="Three difficulty tiers" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, marginTop: 34 }}>
          {acts.map((d) => (
            <div key={d.id} style={{
              position: 'relative',
              background: 'linear-gradient(180deg, oklch(0.20 0.02 160 / 0.85), oklch(0.14 0.015 160 / 0.92))',
              border: '1px solid oklch(0.30 0.03 160)',
              borderRadius: 18, padding: 28,
              minHeight: 300, overflow: 'hidden',
              backdropFilter: 'blur(6px)',
            }}>
              <img src={d.img} alt="" style={{
                position: 'absolute', top: 12, right: 12, width: 92, height: 92,
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))',
                opacity: d.ready ? 1 : 0.7,
              }} />
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.16em',
                color: d.ready ? 'oklch(0.76 0.16 152)' : 'oklch(0.56 0.02 80)', textTransform: 'uppercase' }}>
                {d.ready ? 'Now playing' : 'Coming soon'}
              </div>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontSize: 48, lineHeight: 1, marginTop: 12,
                color: 'oklch(0.96 0.02 80)',
              }}>
                {d.label}
              </div>
              <div style={{ fontSize: 13.5, color: 'oklch(0.74 0.02 80)', marginTop: 4, fontStyle: 'italic' }}>
                {d.sub}
              </div>
              <p style={{ fontSize: 14, color: 'oklch(0.80 0.02 80)', lineHeight: 1.55, marginTop: 20, maxWidth: 320, textWrap: 'pretty' }}>
                {d.desc}
              </p>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                marginTop: 26, paddingTop: 18, borderTop: '1px dashed oklch(0.36 0.02 160)',
              }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'oklch(0.72 0.12 152)' }}>
                  +{d.xp} XP per scene
                </span>
                <span style={{ fontSize: 13, color: 'oklch(0.72 0.02 80)' }}>
                  {d.ready ? 'Enter →' : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: 'relative', zIndex: 2, padding: '70px 120px' }}>
        <SectionHeader2 kicker="The performance" title="Three scenes, every challenge" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, marginTop: 40 }}>
          {[
            { n: 'I',   t: 'Read the script', d: 'A client brief plus Given/When/Then acceptance criteria. No ambiguity about what counts as done.' },
            { n: 'II',  t: 'Write the test',  d: 'Monaco IDE with Playwright types pre-loaded. Autocomplete ranks getByRole before anything brittle.' },
            { n: 'III', t: 'Get graded',      d: 'The masks review selectors, assertions, coverage, and code quality — with line-level comments.' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0 28px', borderLeft: i > 0 ? '1px solid oklch(0.30 0.02 160)' : 'none' }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontSize: 128, lineHeight: 1,
                color: 'oklch(0.32 0.05 155)', marginBottom: 8,
              }}>{s.n}</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 30, marginBottom: 12 }}>{s.t}</div>
              <p style={{ fontSize: 15, color: 'oklch(0.76 0.02 80)', lineHeight: 1.55, textWrap: 'pretty' }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rubric + Playbill */}
      <section style={{ position: 'relative', zIndex: 2, padding: '50px 120px 90px',
        display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 36 }}>
        <div>
          <SectionHeader2 kicker="The rubric" title="How the masks judge you" />
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rubric.map((r) => (
              <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 58px', alignItems: 'center', gap: 18 }}>
                <div>
                  <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>{r.k}</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'oklch(0.62 0.02 80)' }}>{r.hint}</div>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'oklch(0.24 0.02 160)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${r.w * 2.5}%`, height: '100%',
                    background: 'linear-gradient(90deg, oklch(0.60 0.16 152), oklch(0.82 0.15 152))',
                  }} />
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: 'oklch(0.82 0.02 80)', textAlign: 'right' }}>{r.w}%</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(180deg, oklch(0.22 0.05 155 / 0.7), oklch(0.14 0.02 160 / 0.9))',
          border: '1px solid oklch(0.32 0.04 155)',
          borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden',
        }}>
          <img src="masks/single-happy-green.png" alt="" style={{
            position: 'absolute', right: -26, bottom: -20, width: 200, height: 200, objectFit: 'contain', opacity: 0.5,
          }} />
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.16em', color: 'oklch(0.74 0.14 152)', textTransform: 'uppercase' }}>
            your playbill
          </div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 66, lineHeight: 1, margin: '10px 0 4px' }}>
            Level 3
          </div>
          <div style={{ fontSize: 14, color: 'oklch(0.76 0.02 80)' }}>Understudy in Training</div>
          <div style={{ marginTop: 24, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'oklch(0.72 0.02 80)', display: 'flex', justifyContent: 'space-between' }}>
            <span>420 XP</span><span>/ 750 XP to Act II</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: 'oklch(0.24 0.02 160)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: '56%', height: '100%', background: 'linear-gradient(90deg, oklch(0.62 0.16 152), oklch(0.82 0.15 152))' }} />
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 1 }}>
            {[
              { l: 'first-green', u: true },
              { l: 'no-timeouts', u: true },
              { l: 'role-based',  u: true },
              { l: 'archaeologist', u: false },
            ].map((b) => (
              <span key={b.l} style={{
                padding: '6px 12px', borderRadius: 99,
                background: b.u ? 'oklch(0.22 0.04 160)' : 'oklch(0.18 0.01 160)',
                border: '1px solid oklch(0.40 0.04 155)',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                color: b.u ? 'oklch(0.82 0.12 152)' : 'oklch(0.55 0.02 80)',
              }}>
                {b.u ? '✦ ' : '🔒 '}{b.l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer style={{
        position: 'relative', zIndex: 2,
        padding: '28px 120px 36px', borderTop: '1px solid oklch(0.24 0.02 160)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'oklch(0.58 0.02 80)',
      }}>
        <span>Free &amp; open. Bring your own LLM key.</span>
        <span style={{ opacity: 0.7 }}>Hint — try ↑↑↓↓←→←→BA on the homepage.</span>
      </footer>

      <style>{`
        @keyframes pq-float-happy {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(0.6deg); }
        }
        @keyframes pq-float-sad {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(10px) rotate(-0.4deg); }
        }
        @keyframes pq-curtain-sway {
          0%, 100% { transform: skewX(0deg) translateX(0); }
          50%      { transform: skewX(0.4deg) translateX(2px); }
        }
      `}</style>
    </div>
  );
}

function SectionHeader2({ kicker, title }) {
  return (
    <div>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.18em',
        color: 'oklch(0.74 0.14 152)', textTransform: 'uppercase',
      }}>{kicker}</div>
      <div style={{
        fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 60,
        letterSpacing: '-0.01em', marginTop: 10, color: 'oklch(0.96 0.02 80)',
      }}>{title}</div>
    </div>
  );
}

Object.assign(window, { TheaterHomeV2, StageMasks, SpeechBubble2, Curtain, SectionHeader2 });
