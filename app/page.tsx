import Link from "next/link";

export default function Home() {
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

      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">IDE preview</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Monaco editor with Playwright types and ranked autocomplete. Not
          yet wired to the execution sandbox.
        </p>
        <Link
          href="/ide"
          className="mt-3 inline-block text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-400"
        >
          Open IDE →
        </Link>
      </section>

      <p className="text-sm text-zinc-500">
        Execution sandbox, challenges, and grading land in upcoming chunks.
      </p>
    </main>
  );
}
