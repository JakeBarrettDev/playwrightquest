# Challenge Notes: Bramble & Co. — Checkout

<!-- tags: bramble-co, checkout, form_submission, state_change, dynamic_class, missing_label, web_first_assertion, challenge -->

Notes specific to the checkout flow on the Bramble & Co. sample site. Use these to ground feedback on this challenge's intentional traps.

## Site overview

- `/sites/bramble-co/index.html` — shop grid with six products. Each product card has a **dynamic class** trap: the Add-to-Cart button carries `.btn-cta-${randomHex}` applied at page load.
- `/sites/bramble-co/cart.html` — cart page, reads from `localStorage['bramble_cart']`.
- `/sites/bramble-co/checkout.html` — billing form + submit button.

## Intentional traps on this challenge

1. **`state_change` on submit button**
   The Complete Purchase button's text changes to `Processing...` immediately on click, then after ~1.5s the form is hidden and `#order-confirmation` is revealed.
   - Wrong: `await expect(page.getByRole('button', { name: 'Complete Purchase' })).toBeVisible()` *after* the click — the button text has already changed.
   - Right: `await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible()` — assert on the final confirmation state.

2. **`missing_label` on ZIP input**
   The ZIP field is `<input type="text" id="zip" placeholder="ZIP code">` with no `<label>`. `getByLabel('ZIP')` won't work.
   - Ideal: `page.getByPlaceholder('ZIP code')`.
   - Acceptable: `page.locator('#zip')` (id is stable on this field).

3. **`dynamic_class` on add-to-cart buttons (upstream, in the shop flow)**
   Classes like `.btn-cta-7f3k` regenerate on every reload. Locators based on these classes will pass once and fail forever after.
   - Ideal: `page.getByRole('button', { name: 'Add Terra Cotta Planter to cart' })`.

## Accessible names on the checkout page

| Field | Locator |
|-------|---------|
| Email | `page.getByLabel('Email')` |
| Full name | `page.getByLabel('Full name')` |
| Street address | `page.getByLabel('Street address')` |
| City | `page.getByLabel('City')` |
| ZIP | `page.getByPlaceholder('ZIP code')` (no label) |
| Submit | `page.getByRole('button', { name: 'Complete Purchase' })` |
| Confirmation heading | `page.getByRole('heading', { name: 'Order Confirmed' })` |

## Typical acceptance criteria (BDD)

```
Given I have added at least one product to my cart
When I navigate to checkout and fill in my billing details
And I click the Complete Purchase button
Then the order confirmation heading should be visible
And the cart should be empty
```

## Coverage guidance

The last `Then` (cart is empty) is verified by loading the cart page after confirmation and asserting no product rows. Tests that only check for the confirmation heading miss that criterion.
