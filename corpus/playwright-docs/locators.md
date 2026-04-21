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
