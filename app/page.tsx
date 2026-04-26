import Link from "next/link";
import { defaultChallengesRoot, loadChallenges } from "@/lib/challenges";
import type { Challenge } from "@/lib/types/challenge";

const SITE_META: Record<string, { label: string; href: string; description: string }> = {
  "bramble-co": {
    label: "Bramble & Co.",
    href: "/sites/bramble-co/",
    description: "E-commerce storefront — product grid, cart, checkout",
  },
  "thornfield": {
    label: "Thornfield & Associates",
    href: "/sites/thornfield/",
    description: "Professional services firm — navigation, contact form, modal dialogs",
  },
};

const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];

function difficultyBadge(d: string) {
  const colours: Record<string, string> = {
    beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    advanced: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return colours[d] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default async function Home() {
  const challenges = await loadChallenges(defaultChallengesRoot(process.cwd()));

  // Group by site, then sort within each group by difficulty order.
  const bySite = new Map<string, Challenge[]>();
  for (const c of challenges) {
    if (!bySite.has(c.site)) bySite.set(c.site, []);
    bySite.get(c.site)!.push(c);
  }
  for (const [, group] of bySite) {
    group.sort(
      (a, b) =>
        DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)
    );
  }

  const siteOrder = [...bySite.keys()].sort();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8 font-sans">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">PlaywrightQuest</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A game for learning Playwright end-to-end testing. Write tests against
          purpose-built sites and get graded on how well you wrote them.
        </p>
      </header>

      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Challenges</h2>
        {challenges.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No challenges authored yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {siteOrder.map((site) => {
              const group = bySite.get(site)!;
              const meta = SITE_META[site];
              return (
                <div key={site}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {meta?.label ?? site}
                  </h3>
                  <ul className="space-y-2">
                    {group.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/ide?challenge=${encodeURIComponent(c.id)}`}
                                className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
                              >
                                {c.title}
                              </Link>
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${difficultyBadge(c.difficulty)}`}
                              >
                                {c.difficulty}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {c.xpReward} XP
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                              {c.clientBrief}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
        Grading is bring-your-own-key (Anthropic, OpenAI, or Gemini). Set your
        key from inside the IDE.
      </p>
    </main>
  );
}
