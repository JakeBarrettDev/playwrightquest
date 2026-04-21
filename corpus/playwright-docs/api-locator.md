# Locator API

<!-- tags: locator, filter, first, last, nth, chaining, and, or, has, hasText -->

A `Locator` is a lazy, re-evaluating reference to one or more elements. Methods on a locator return either another locator (for chaining) or a Promise (for actions/reads).

## Chaining locators

```ts
const row = page.getByRole('row').filter({ hasText: 'Terra Cotta Planter' });
await row.getByRole('button', { name: 'Remove' }).click();
```

Each chain re-queries from its parent, keeping the locator resilient to DOM changes outside the scoped area.

## Filtering

```ts
// Include only rows that contain specific text
const activeRows = page.getByRole('row').filter({ hasText: 'Active' });

// Exclude rows matching a child
const openTickets = tickets.filter({ hasNot: page.getByText('Closed') });

// Filter by containing a specific locator
const cardsWithButton = page.locator('.card').filter({
  has: page.getByRole('button', { name: 'Buy' }),
});
```

Prefer `filter({ hasText })` over `.nth(index)` — indexed access breaks the moment the DOM order changes.

## First / last / nth — use sparingly

```ts
// Brittle — relies on position
await page.getByRole('button').first().click();

// Better — describe WHICH button
await page.getByRole('button', { name: 'Add to Cart' }).first().click();
```

If `.first()` still feels wrong, there is probably a more specific accessible name or parent region to scope to.

## Combining with `and` / `or`

```ts
const visibleAndEnabled = locator.and(page.locator(':enabled'));
const either = page.getByRole('button', { name: 'Submit' }).or(
  page.getByRole('button', { name: 'Complete' })
);
```

## Actions vs. reads

| Method | Returns | Auto-waits |
|--------|---------|------------|
| `click()`, `fill()`, `check()` | `Promise<void>` | Yes — actionability |
| `textContent()`, `inputValue()` | `Promise<string>` | No — use web-first assertion instead |
| `isVisible()` | `Promise<boolean>` | No — prefer `expect(...).toBeVisible()` |
| `count()` | `Promise<number>` | No — prefer `expect(...).toHaveCount(n)` |

Reads that don't auto-wait are a common source of flakiness. Prefer web-first assertions for anything timing-sensitive.
