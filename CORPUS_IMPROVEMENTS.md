# Corpus Improvements — Grader Quality Pass

## Goal

Fill three specific gaps in the corpus that will cause the AI grader to either miss common
player patterns or fail to explain frequent beginner errors. No structural changes — these
are targeted additions to existing files only.

Read each existing file before editing it. Append or insert; do not remove existing content
unless it is factually wrong (note any such case with a comment).

---

## 1. `corpus/playwright-docs/assertions.md`

### What to add

Append a new section after the existing "Asserting on state transitions" section:

```markdown
## Additional web-first assertions

These are part of the same auto-retrying family as `toBeVisible` and `toHaveText`.
Include them in the corpus so the grader can cite them when players use or misuse them.

| Assertion | Use for |
|-----------|---------|
| `toHaveAttribute(name, value)` | Check an element attribute (href, src, aria-*, data-*) |
| `toBeChecked()` | Checkbox or radio is in checked state |
| `toBeInViewport()` | Element is visible within the viewport (not just in the DOM) |
| `toHaveClass(className)` | Element has a specific CSS class |
| `toHaveCount(n)` | Locator resolves to exactly N elements |

```ts
// Attribute assertion — very common for links and data attributes
await expect(page.getByRole('link', { name: 'View Cart' })).toHaveAttribute('href', '/cart.html');

// Checked state
await expect(page.getByLabel('Subscribe to newsletter')).toBeChecked();

// Viewport visibility — stricter than toBeVisible
await expect(page.getByRole('button', { name: 'Complete Purchase' })).toBeInViewport();
```

## Soft assertions — continue on failure

`expect.soft()` marks a failure without stopping the test. The test continues running and
all soft failures are reported at the end.

```ts
await expect.soft(page.getByRole('heading')).toHaveText('Order Confirmed');
await expect.soft(page).toHaveURL(/\/success/);
// Test continues even if the first assertion failed
```

Use soft assertions when you want to collect multiple failure signals in one run rather
than stopping at the first. Overuse is a smell — if every assertion is soft, nothing is
truly required.
```

---

## 2. `corpus/playwright-docs/locators.md`

### What to add

**2a.** Add `getByAltText` and `getByTitle` to the recommended hierarchy list, after
`getByTestId`:

```markdown
6. `page.getByAltText('...')` — for images with a meaningful `alt` attribute.
7. `page.getByTitle('...')` — for elements with a `title` attribute (tooltips, icon
   buttons). Less common; prefer `getByRole` with an accessible name when possible.
```

**2b.** Append a new "Strict mode and multiple matches" section at the end of the file:

```markdown
## Strict mode — locators must be unique

By default, Playwright's locator actions (click, fill, etc.) operate in **strict mode**:
if the locator resolves to more than one element, Playwright throws immediately rather
than silently acting on the first match.

```
Error: strict mode violation: getByRole('button') resolved to 4 elements:
  1) <button>Add to Cart</button>
  2) <button>Remove</button>
  ...
```

**What this means:** the locator is too broad. It matches multiple elements on the page.

**How to fix it:**

```ts
// Too broad — matches every button on the page
await page.getByRole('button').click();

// Scoped — specifies which button
await page.getByRole('button', { name: 'Add Terra Cotta Planter to cart' }).click();

// Or scope to a parent region first
const card = page.getByRole('listitem').filter({ hasText: 'Terra Cotta Planter' });
await card.getByRole('button', { name: 'Add to Cart' }).click();
```

Strict mode violations are one of the most common beginner errors. They are the locator
telling you it needs more specificity — not a bug in Playwright.
```

---

## 3. `corpus/playwright-docs/test-structure.md`  *(currently in rubric-rules — path may be `corpus/rubric-rules/test-structure.md`)*

> Note: confirm the actual path is `corpus/rubric-rules/test-structure.md` before editing.

### What to add

Append a new section after the existing "Don't" list:

```markdown
## Grouping with `test.describe`

`test.describe` groups related tests under a shared label. The label appears in output
and reports, making failures easier to triage.

```ts
test.describe('Bramble checkout — happy path', () => {
  test('guest can complete checkout with one item', async ({ page }) => { ... });
  test('order confirmation heading is visible after submit', async ({ page }) => { ... });
});
```

Nested `describe` blocks are valid for complex suites. Flat single-test files don't need
`describe` — don't add it for its own sake.

## Setup with `test.beforeEach`

`test.beforeEach` runs before every test in the current file or `describe` block. Use it
to navigate to a starting URL or set up shared preconditions.

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/sites/bramble-co/');
});

test('can filter by category', async ({ page }) => {
  // page is already on the home page
  await page.getByLabel('Planters').check();
  ...
});
```

**Scoring note:** `beforeEach` for navigation setup is a positive signal — it shows the
player knows how to avoid repeating `goto` in every test. It does not replace the need
for each test to be independently meaningful.

`afterEach` / `afterAll` for teardown are valid but less common in UI tests since each
test gets a fresh browser context by default.
```

---

## 4. `corpus/rubric-rules/assertion-patterns.md`

### What to add

Add a clarifying note to the existing scoring table. After the `page.waitForTimeout` row,
insert:

```markdown
| `locator.waitFor({ state: 'hidden' })` before asserting absence | 0.8 | Legitimate for waiting on disappearing spinners/overlays — not the same as waitForTimeout |
```

And append this note at the end of the file:

```markdown
## `locator.waitFor` vs. `waitForTimeout` — an important distinction

`page.waitForTimeout(ms)` is an unconditional sleep. It is always wrong in production
tests.

`locator.waitFor({ state: 'hidden' })` waits for a *specific condition* — the element
reaching a particular state. This is legitimate when you need to wait for a loading
spinner or overlay to disappear before asserting on content beneath it.

```ts
// Legitimate — wait for the loading overlay to disappear
await page.getByTestId('loading-spinner').waitFor({ state: 'hidden' });
await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
```

Do not penalise this pattern. Do penalise `waitForTimeout` regardless of context.
```

---

## Acceptance criteria

- [ ] All four files are edited; no existing content removed unless factually wrong
- [ ] `getByAltText` and `getByTitle` appear in the locators hierarchy
- [ ] Strict mode violation error is documented with example fix
- [ ] `toHaveAttribute`, `toBeChecked`, `expect.soft()` appear in assertions
- [ ] `test.describe` and `beforeEach` appear in test-structure
- [ ] `locator.waitFor({ state: 'hidden' })` is distinguished from `waitForTimeout`
- [ ] All code examples use the Bramble & Co. site context where a concrete example helps
