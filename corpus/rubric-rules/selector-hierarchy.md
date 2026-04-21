# Rubric: Selector Hierarchy

<!-- tags: rubric, selector, locator, getByRole, brittle, scoring -->

Score player locators against this ranked hierarchy. Higher in the list = higher score.

## Ranked preference

| Tier | Locator | Example | Score |
|------|---------|---------|-------|
| 1 | `getByRole` with accessible name | `page.getByRole('button', { name: 'Submit' })` | 1.0 (ideal) |
| 2 | `getByLabel` | `page.getByLabel('Email')` | 1.0 (ideal for inputs) |
| 3 | `getByText` (non-interactive) / `getByPlaceholder` | `page.getByText('Welcome back')` | 0.9 |
| 4 | `getByTestId` | `page.getByTestId('checkout-submit')` | 0.7 (acceptable) |
| 5 | Semantic CSS (`button[aria-label="..."]`) | — | 0.4 |
| 6 | Generic CSS (`.btn`, `#submit`) | `page.locator('#submit-order')` | 0.2 (brittle) |
| 7 | Dynamic-looking class or id | `page.locator('.btn-cta-7f3k')` | 0.0 (brittle, will rot) |
| 8 | XPath | — | 0.1 (last resort) |

## Rules

1. **Compare the player's locator to the DOM manifest's `ideal_locator`, `acceptable_locators`, and `brittle_locators` fields.** Award the score matching the tier the player landed in.
2. **Dynamic classes are an automatic brittle flag.** A class like `.btn-cta-7f3k` (random hex suffix) will break on every deploy. Call this out explicitly in feedback.
3. **Positional access (`.first()`, `.nth(3)`) without scoping is a warning, not an auto-deduction.** It works today but will break the moment the grid re-orders.
4. **`data-testid` is acceptable, not ideal.** It doesn't reflect what a user sees. When a semantic role or label exists, prefer it.

## Feedback phrasing

- **Ideal used:** "Great — `getByRole` with an accessible name is the most resilient locator here. It mirrors how a screen reader identifies the element."
- **Acceptable used:** "`getByTestId` works, but this button has a clear accessible name ('Complete Purchase'). `getByRole('button', { name: 'Complete Purchase' })` is more durable and self-documenting."
- **Brittle used, test passed:** "This passes today, but `.btn-cta-7f3k` is a hash-suffixed class that will change. Swap to `getByRole('button', { name: '...' })` to survive the next deploy."
- **Brittle used, test failed:** "The selector didn't match because the class name regenerates on every page load. This is the intentional trap — the fix is to locate by role and accessible name instead."
