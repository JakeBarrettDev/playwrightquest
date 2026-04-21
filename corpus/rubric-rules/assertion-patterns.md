# Rubric: Assertion Patterns

<!-- tags: rubric, assertion, expect, web-first-assertion, waitForTimeout, scoring -->

Web-first assertions (those on `Locator`/`Page`/`APIResponse` that auto-retry) are the backbone of resilient Playwright tests. Manual waits are flaky; generic assertions don't retry.

## Scoring

| Pattern | Score |
|---------|-------|
| Web-first assertion after action (`await expect(locator).toBeVisible()`) | 1.0 |
| Web-first assertion on a read value (`await expect(locator).toHaveText(...)`) | 1.0 |
| Generic assertion on a pre-resolved value (`expect(jsonBody.status).toBe('ok')`) | 0.9 |
| `page.waitForTimeout` + any assertion | 0.5 |
| Read via `textContent()`/`inputValue()` then `expect(...).toBe(...)` | 0.4 |
| No assertion at all | 0.0 |

## Required

1. **Every test must contain at least one assertion.** A test without `expect()` is not a test.
2. **At least one assertion should be web-first.** Pure generic-assertion tests are a smell unless the test is entirely about API/JSON responses.
3. **Never use `page.waitForTimeout` as a substitute for an assertion.** If a test has `waitForTimeout`, the correct replacement is almost always a `toBeVisible` or `toHaveText` on the element that signals "the state I was waiting for has arrived."

## Acceptance-criteria coverage

For each BDD `Then` statement in the challenge's acceptance criteria, the test should have at least one assertion that meaningfully verifies it. Count coverage as:

```
covered_criteria / total_criteria
```

Assertions that merely check the page is still loaded (e.g. `toHaveURL` on the same URL) do not count toward coverage.

## Feedback phrasing

- **No assertion:** "This test performs actions but never asserts the outcome. Add `await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();` to verify the state the test set up."
- **waitForTimeout present:** "Line N uses `page.waitForTimeout(2000)`. Fixed sleeps make tests slow and flaky. Replace with `await expect(locator).toBeVisible()` on the element that signals completion."
- **textContent compared with expect:** "`expect(await locator.textContent()).toBe(...)` evaluates once and does not retry. Swap to `await expect(locator).toHaveText(...)` so the assertion auto-waits."
