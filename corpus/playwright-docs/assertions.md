# Assertions

<!-- tags: assertion, expect, toBeVisible, toHaveText, toHaveValue, toHaveURL, toHaveCount, web-first-assertion -->

Playwright assertions come in two flavors: **web-first** (async, auto-retrying) and **generic** (sync, one-shot).

## Web-first assertions — preferred

These retry until the expected condition is met or the timeout elapses. They are awaited and operate on a `Locator`, `Page`, or `APIResponse`.

| Assertion | Use for |
|-----------|---------|
| `toBeVisible()` | Element is visible and has non-empty layout |
| `toBeHidden()` | Element is hidden or removed |
| `toHaveText(text)` | Element's text equals (or matches regex) |
| `toContainText(text)` | Element's text includes substring |
| `toHaveValue(value)` | Input's current value |
| `toHaveCount(n)` | Locator matches exactly N elements |
| `toBeEnabled()` / `toBeDisabled()` | Form control state |
| `toHaveURL(url)` | Page's current URL |
| `toHaveTitle(title)` | Document title |

```ts
await expect(page.getByRole('alert')).toHaveText('Order confirmed');
await expect(page).toHaveURL(/\/checkout\/success/);
await expect(page.getByRole('listitem')).toHaveCount(3);
```

## Generic assertions — fallback

`expect(value).toBe(...)`, `toEqual`, `toBeTruthy`, etc. These do **not** retry. Use them only on already-resolved values (strings, numbers, JSON).

```ts
const responseJson = await response.json();
expect(responseJson.status).toBe('ok');
```

## Common mistake: awaiting the wrong thing

```ts
// Bad — evaluates textContent once, no retry
expect(await page.getByRole('heading').textContent()).toBe('Hello');

// Good — retries until the heading's text equals 'Hello'
await expect(page.getByRole('heading')).toHaveText('Hello');
```

## Asserting on state transitions

If a button text changes between states (e.g. `Submit` → `Processing...` → disappears), assert on the final state, not the transient one.

```ts
await page.getByRole('button', { name: 'Complete Purchase' }).click();
await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
```
