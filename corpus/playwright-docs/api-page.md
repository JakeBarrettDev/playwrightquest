# Page API

<!-- tags: page, goto, click, fill, waitForURL, waitForLoadState, navigation, action -->

The `Page` object is the primary interface for a browser tab. Most tests start with `page.goto(url)` and use locator-based actions from there.

## Navigation

```ts
await page.goto('/sites/bramble-co/');
await page.goto('/checkout.html');
```

`baseURL` from `playwright.config.ts` is prepended for relative paths.

## Waiting for navigation

Most navigation is handled automatically. When an action triggers navigation, Playwright waits for it to settle.

```ts
await page.getByRole('link', { name: 'Cart' }).click();
// page.waitForURL is usually unnecessary — the next action will auto-wait
await expect(page).toHaveURL(/\/cart\.html/);
```

Use `page.waitForURL('**/success')` only when you explicitly need to block before doing something timing-sensitive.

## Form inputs (shortcuts)

Prefer the locator action methods — they find the element and act in one step.

```ts
await page.getByLabel('Email address').fill('test@example.com');
await page.getByRole('checkbox', { name: 'Subscribe' }).check();
await page.getByRole('combobox', { name: 'Country' }).selectOption('US');
```

## Reading state

```ts
const url = page.url();
const title = await page.title();
const html = await page.content(); // rarely needed — prefer locator-level reads
```

## Evaluate — last resort

`page.evaluate(() => ...)` runs JS in the browser context. Use only when no locator or Playwright API exists for what you need. It breaks the accessibility-first model.
