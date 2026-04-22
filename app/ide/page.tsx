import PlaywrightIDE from "@/components/IDE/PlaywrightIDE";
import { defaultChallengesRoot, loadChallenges } from "@/lib/challenges";
import { notFound } from "next/navigation";

interface SearchParams {
  challenge?: string;
}

export default async function IDEPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { challenge: requestedId } = await searchParams;
  const challenges = await loadChallenges(defaultChallengesRoot(process.cwd()));
  if (challenges.length === 0) notFound();

  const challenge = requestedId
    ? challenges.find((c) => c.id === requestedId)
    : challenges[0];
  if (!challenge) notFound();

  return (
    <main className="flex h-screen flex-col">
      <PlaywrightIDE challenge={challenge} />
    </main>
  );
}
