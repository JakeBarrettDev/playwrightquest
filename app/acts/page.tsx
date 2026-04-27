import Link from "next/link";
import { defaultChallengesRoot, loadChallenges } from "@/lib/challenges";
import type { Challenge } from "@/lib/types/challenge";

const SITE_META: Record<string, { label: string; href: string; description: string }> = {
  "bramble-co": {
    label: "Bramble & Co.",
    href: "/sites/bramble-co/",
    description: "E-commerce storefront — product grid, cart, checkout",
  },
  thornfield: {
    label: "Thornfield & Associates",
    href: "/sites/thornfield/",
    description: "Professional services firm — navigation, contact form, modal dialogs",
  },
};

const ACTS: Array<{
  id: "act-i" | "act-ii" | "act-iii";
  label: string;
  sub: string;
  difficulty: Challenge["difficulty"];
  xp: number;
  blurb: string;
}> = [
  {
    id: "act-i",
    label: "Act I",
    sub: "Apprentice",
    difficulty: "beginner",
    xp: 50,
    blurb: "Single-page flows, forgiving DOM, plenty of role-based landmarks.",
  },
  {
    id: "act-ii",
    label: "Act II",
    sub: "Understudy",
    difficulty: "intermediate",
    xp: 150,
    blurb: "Multi-step journeys, state transitions, the occasional red herring.",
  },
  {
    id: "act-iii",
    label: "Act III",
    sub: "Lead Role",
    difficulty: "advanced",
    xp: 300,
    blurb: "Dynamic classes, race conditions, network intercepts, no second takes.",
  },
];

export default async function ActsPage() {
  const challenges = await loadChallenges(defaultChallengesRoot(process.cwd()));
  const byDifficulty = new Map<Challenge["difficulty"], Challenge[]>();
  for (const c of challenges) {
    const list = byDifficulty.get(c.difficulty) ?? [];
    list.push(c);
    byDifficulty.set(c.difficulty, list);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 p-8 font-sans">
      <header>
        <Link
          href="/"
          className="text-sm text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400"
        >
          ← Back to the lobby
        </Link>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Act selection</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pick your difficulty. Each scene has a client brief and Given/When/Then
          acceptance criteria — the AI grader scores you on selectors, assertions,
          AC coverage, and code quality.
        </p>
      </header>

      {ACTS.map((act) => {
        const group = byDifficulty.get(act.difficulty) ?? [];
        return (
          <section
            key={act.id}
            id={act.id}
            className="scroll-mt-12 rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  {act.difficulty} · +{act.xp} XP per scene
                </div>
                <h2 className="mt-1 font-serif text-3xl">
                  {act.label} <span className="italic text-zinc-500">— {act.sub}</span>
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {act.blurb}
                </p>
              </div>
              <span className="text-sm text-zinc-500">
                {group.length} {group.length === 1 ? "scene" : "scenes"}
              </span>
            </div>

            {group.length === 0 ? (
              <p className="mt-6 text-sm italic text-zinc-500">
                No scenes authored at this difficulty yet.
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {group.map((c) => {
                  const meta = SITE_META[c.site];
                  return (
                    <li
                      key={c.id}
                      className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-baseline gap-3">
                        <Link
                          href={`/ide?challenge=${encodeURIComponent(c.id)}`}
                          className="text-lg font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
                        >
                          {c.title}
                        </Link>
                        <span className="text-xs text-zinc-500">
                          {meta?.label ?? c.site}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {c.xpReward} XP
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {c.clientBrief}
                      </p>
                      {c.acceptanceCriteria.length > 0 && (
                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                            Acceptance criteria ({c.acceptanceCriteria.length})
                          </summary>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
                            {c.acceptanceCriteria.map((ac, i) => (
                              <li key={i}>{ac}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Fictitious sites</h2>
        <ul className="mt-3 space-y-2">
          {Object.entries(SITE_META).map(([id, meta]) => (
            <li key={id}>
              <a
                href={meta.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
              >
                {meta.label}
              </a>
              <span className="ml-2 text-sm text-zinc-500">{meta.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-zinc-500">
        Grading is bring-your-own-key (Anthropic, OpenAI, or Gemini). Set your key
        from inside the IDE.
      </p>
    </main>
  );
}
