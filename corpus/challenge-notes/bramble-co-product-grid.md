# Challenge Notes: Bramble & Co. — Product Grid

<!-- tags: bramble-co, product-grid, dynamic_class, add-to-cart, filter, challenge -->

Notes specific to the product grid and category filter on the Bramble & Co. home page.

## Layout

The home page renders six products in a responsive grid. Each product card is a `<li role="listitem">` containing:

- Product image (`<img alt="...">`)
- Product name (`<h3>`)
- Price (`<span data-testid="price">`)
- Add-to-Cart button with a hash-suffixed class

## Intentional traps

1. **`dynamic_class` on Add-to-Cart buttons**
   Each button starts with `.btn-dynamic` and a hash class is applied at page load: e.g. `class="btn-dynamic btn-cta-7f3k"`. The hash regenerates on every reload.
   - Brittle: `page.locator('.btn-cta-7f3k')` — works once, breaks immediately.
   - Brittle: `page.locator('.btn-dynamic').first()` — position-dependent, no description of which product.
   - Ideal: `page.getByRole('button', { name: 'Add Terra Cotta Planter to cart' })` — buttons use `aria-label` tied to the product name.

2. **Filter interaction is stateful**
   The "Planters" / "Tools" / "Seeds" filters are `<input type="checkbox">` with `<label>`. Checking a box hides product cards whose `data-category` does not match. Prefer `getByLabel('Planters')` over `getByRole('checkbox')` alone.

## Accessible names

| Element | Locator |
|---------|---------|
| Page heading | `page.getByRole('heading', { name: /Bramble/ })` |
| Category filter | `page.getByLabel('Planters')` / `'Tools'` / `'Seeds'` |
| Product card | `page.getByRole('listitem').filter({ hasText: 'Terra Cotta Planter' })` |
| Add-to-cart | `page.getByRole('button', { name: 'Add <product> to cart' })` |
| Cart nav link | `page.getByRole('link', { name: /Cart \(\d+\)/ })` |

## Coverage guidance

A test that adds a product to the cart should assert:
- The cart badge increments (`getByTestId('cart-count')` contains the expected number).
- The cart page shows the added product row (navigate and assert).

Asserting *only* on the badge misses that the cart persistence layer is wired correctly.
