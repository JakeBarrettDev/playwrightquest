"use client";

import type { Challenge } from "@/lib/types/challenge";

interface Props {
  challenge: Challenge;
}

export default function ChallengePanel({ challenge }: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 text-zinc-200">
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          <span>Challenge</span>
          <DifficultyBadge difficulty={challenge.difficulty} />
          <span className="ml-auto text-emerald-400">
            {challenge.xpReward} XP
          </span>
        </div>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">
          {challenge.title}
        </h2>
      </header>

      <section className="space-y-5 px-4 py-4 text-sm leading-relaxed">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Client brief
          </h3>
          <p className="text-zinc-300">{challenge.clientBrief}</p>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Acceptance criteria
          </h3>
          <ol className="space-y-2">
            {challenge.acceptanceCriteria.map((c, i) => (
              <li
                key={i}
                className="rounded border border-zinc-800 bg-zinc-900 p-2 text-zinc-300"
              >
                <span className="mr-2 font-mono text-xs text-emerald-400">
                  AC{i + 1}
                </span>
                {c}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Suggested APIs
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {challenge.suggestedPlaywrightAPIs.map((api) => (
              <li
                key={api}
                className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300"
              >
                {api}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          Site:{" "}
          <a
            href={`/sites/${challenge.site}/`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-emerald-400 underline underline-offset-2"
          >
            /sites/{challenge.site}/
          </a>
        </div>
      </section>
    </aside>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Challenge["difficulty"] }) {
  const styles: Record<Challenge["difficulty"], string> = {
    beginner: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
    intermediate: "bg-amber-900/50 text-amber-300 border-amber-800",
    advanced: "bg-rose-900/50 text-rose-300 border-rose-800",
  };
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}
