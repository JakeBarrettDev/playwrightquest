# Locators

<!-- tags: locator, getByRole, getByLabel, getByText, getByPlaceholder, getByTestId, accessibility, aria, selector -->

Locators are the Playwright way to find elements on the page. They re-evaluate every time they are used, so they stay in sync with the DOM.

## Recommended hierarchy

Prefer locators that resemble how a user perceives the page. Playwright's built-in recommendation order:

1. `page.getByRole(role, { name })` — best for interactive elements. Uses the accessibility tree.
2. `page.getByLabel('...')` — best for form inputs with a visible `<label>`.
3. `page.getByPlaceholder('...')` — for inputs that only have placeholder text.
4. `page.getByText('...')` — for non-interactive text nodes.
5. `page.getByTestId('...')` — escape hatch when the above fail. Requires a `data-testid` attribute.
6. `page.getByAltText('...')` — for images with a meaningful `alt` attribute.
7. `page.getByTitle('...')` — for elements with a `title` attribute (tooltips, icon buttons). Less common; prefer `getByRole` with an accessible name when possible.

Avoid CSS and XPath selectors unless nothing above works. Never select by auto-generated class names or by id attributes that are dynamic.

## Examples

```ts
// Good — role + accessible name
await page.getByRole('button', { name: 'Complete Purchase' }).click();

// Good — label
await page.getByLabel('Email address').fill('test@example.com');

// Acceptable — test id
await page.getByTestId('checkout-submit').click();

// Bad — dynamic class
await page.locator('.btn-cta-7f3k').click();

// Bad — generic attribute
await page.locator('button[type="submit"]').click();
```

## Chaining and filtering

Locators compose. Use `locator.filter()` or `locator.getByRole()` to narrow from a parent region.

```ts
const productCard = page.getByRole('listitem').filter({ hasText: 'Terra Cotta Planter' });
await productCard.getByRole('button', { name: 'Add to Cart' }).click();
```

Prefer `filter({ hasText })` over indexed access (`.nth(0)`) when the DOM order can change.

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
