import { retrieveCorpusChunks, defaultCorpusRoot } from "../lib/corpus/index.ts";

const root = defaultCorpusRoot(process.cwd());

const queries = [
  {
    label: "checkout state_change",
    q: {
      site: "bramble-co",
      challengeTags: ["form_submission", "state_change", "web_first_assertion"],
    },
  },
  {
    label: "bad locator stderr",
    q: {
      errorKeywords: ["TimeoutError", "locator", "visible"],
      playerCode: "await page.locator('.btn-cta-7f3k').click();",
    },
  },
  { label: "no signal fallback", q: {} },
];

for (const { label, q } of queries) {
  const hits = await retrieveCorpusChunks(root, { ...q, topK: 4 });
  console.log(`\n--- ${label} ---`);
  for (const h of hits) {
    console.log(
      `  [${h.score.toFixed(1)}] ${h.chunk.path}  (${h.matched.join(", ") || "baseline"})`
    );
  }
}
