# Playwright Best Practices

<!-- tags: best-practice, web-first-assertion, auto-wait, waitForTimeout, resilience, user-visible -->

## Test user-visible behavior

Your tests should resemble how a real user interacts with your app. Don't test implementation details like CSS class names, internal state, or the DOM structure.

## Use web-first assertions

Web-first assertions (those that start with `toBe...`, `toHave...`) automatically wait until the expected condition is met. They eliminate flakiness from timing.

```ts
// Good — auto-waiting assertion
await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();

// Bad — manual wait before a stale assertion
await page.waitForTimeout(2000);
expect(await page.getByRole('heading').textContent()).toBe('Order Confirmed');
```

## Never use `page.waitForTimeout` in real tests

`page.waitForTimeout(ms)` introduces arbitrary sleeps that either make tests slow or flaky — or both. It is for debugging only. Replace with an assertion or `waitFor` on a specific condition.

## Let locators auto-wait

Playwright actions (`click`, `fill`, `check`, `press`) have built-in actionability checks. You don't need to `waitFor` before a click.

```ts
// Good — click waits for the button to be actionable
await page.getByRole('button', { name: 'Submit' }).click();

// Redundant — wait is unnecessary
await page.getByRole('button', { name: 'Submit' }).waitFor();
await page.getByRole('button', { name: 'Submit' }).click();
```

## Keep tests atomic and independent

Each test should set up and tear down its own state. Don't rely on test order or shared state between tests.

## Prefer descriptive test names

`test('guest can complete checkout with a single item')` beats `test('checkout works')`. The name appears in failure output and helps future-you triage.
