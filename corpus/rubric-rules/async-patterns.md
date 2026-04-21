# Rubric: Async Patterns

<!-- tags: rubric, async, await, promise, scoring, code-quality -->

Playwright's API is almost entirely Promise-returning. Missing an `await` is almost always a bug — the call begins but the test moves on before it completes.

## Required

1. **Every action (`click`, `fill`, `check`, `press`, `goto`) must be awaited.** Missing `await` is an automatic deduction in `code_quality`.
2. **Every web-first assertion (`expect(locator).to...`) must be awaited.** Without `await`, the assertion returns a Promise that is never checked; the test appears to pass regardless of the actual state.
3. **Chained `.then()` or `.catch()` on Playwright APIs is a red flag.** Playwright's idiomatic style is `async/await`, not raw Promise chains.

## Common bugs

```ts
// Bug — action fires but test doesn't wait for it
page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByRole('heading')).toBeVisible();

// Bug — assertion never resolves
expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
// Test passes even if heading is missing!
```

## Parallel awaits are acceptable

When two independent async operations can run concurrently:

```ts
await Promise.all([
  page.waitForResponse('**/api/checkout'),
  page.getByRole('button', { name: 'Submit' }).click(),
]);
```

This pattern is correct for race-condition-free event waiting.

## Feedback phrasing

- **Missing await on action:** "Line N — `page.click()` returns a Promise. Without `await`, the test continues before the click completes, which makes downstream steps race. Add `await`."
- **Missing await on assertion:** "Line N — `expect(locator).toBeVisible()` without `await` always appears to pass. The assertion never actually runs. Add `await expect(...)`."
