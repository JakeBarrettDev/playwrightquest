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
