# Rubric: Test Structure

<!-- tags: rubric, structure, test-step, arrange-act-assert, test-name, pom, code-quality -->

Well-structured tests are easier to read, easier to debug, and easier to maintain. Score structure as part of `code_quality`.

## Arrange, Act, Assert

A clear test has three visual phases:

```ts
test('guest can complete checkout with a single planter', async ({ page }) => {
  // Arrange — set up the scenario
  await page.goto('/sites/bramble-co/');
  await page.getByRole('button', { name: 'Add Terra Cotta Planter to cart' }).click();
  await page.getByRole('link', { name: 'Cart' }).click();

  // Act — perform the behavior under test
  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.getByLabel('Email').fill('guest@example.com');
  await page.getByRole('button', { name: 'Complete Purchase' }).click();

  // Assert — verify the outcome
  await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
});
```

Blank lines between phases are a cheap, effective readability win.

## `test.step` for long flows

Wrap multi-step phases in `test.step('descriptive label', async () => { ... })`. Steps appear in the trace and HTML report, which makes debugging failures dramatically easier.

```ts
await test.step('add a planter to the cart', async () => {
  await page.getByRole('button', { name: 'Add Terra Cotta Planter to cart' }).click();
});
```

## Descriptive test names

Names should describe the user behavior, not the mechanism. "guest can complete checkout" beats "checkout test" or "test 1". Bonus points in the rubric for descriptive names.

## Page Object Model on complex flows

For flows that touch many elements on the same page, a Page Object Model (POM) class concentrates selectors in one place, making tests shorter and refactor-safe.

Bonus points in the rubric when a complex flow uses a POM; no deduction for not using one on simple flows.

## Don't

- Don't share state between tests.
- Don't rely on test order.
- Don't mix multiple unrelated behaviors into one test.
- Don't leave commented-out selectors or debug `page.pause()` calls in submitted code.
