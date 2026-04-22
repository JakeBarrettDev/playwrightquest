import Link from "next/link";
import { defaultChallengesRoot, loadChallenges } from "@/lib/challenges";

export default async function Home() {
  const challenges = await loadChallenges(defaultChallengesRoot(process.cwd()));

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
          <p className="mt-2 text-sm text-zinc-500">
            No challenges authored yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {challenges.map((c) => (
              <li
                key={c.id}
                className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/ide?challenge=${encodeURIComponent(c.id)}`}
                      className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
                    >
                      {c.title}
                    </Link>
                    <div className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
                      {c.site} · {c.difficulty} · {c.xpReward} XP
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {c.clientBrief}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Fictitious sites</h2>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href="/sites/bramble-co/"
              className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
            >
              Bramble &amp; Co.
            </Link>
            <span className="ml-2 text-sm text-zinc-500">
              E-commerce storefront — product grid, cart, checkout
            </span>
          </li>
        </ul>
      </section>

      <p className="text-sm text-zinc-500">
        Grading is bring-your-own-key (Anthropic, OpenAI, or Gemini). Set your
        key from inside the IDE.
      </p>
    </main>
  );
}
