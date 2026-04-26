# Challenge Notes: Thornfield & Associates — Services Modal

<!-- tags: thornfield, modal, dialog, aria-modal, aria-labelledby, scoped_locator, getByRole, intermediate, challenge -->

Notes specific to the services modal challenge on the Thornfield & Associates sample site. Use these to ground feedback on modal/dialog interaction patterns and intentional traps.

## How the modals work

The services page (`/sites/thornfield/services.html`) contains **three modal dialogs**, one for each service (Strategy, Technology, Operations). All three are present in the DOM at all times, but are visually hidden until triggered. Each dialog:

- Has `role="dialog"` and `aria-modal="true"`
- Has a unique `aria-labelledby` pointing to its heading `id`
- Becomes visible when the corresponding "Request a consultation" button is clicked

## Locating a dialog by role and accessible name

The accessible name of each dialog is derived from its heading via `aria-labelledby`. Playwright's `getByRole('dialog', { name: '...' })` uses this to match:

```javascript
// Correct — uses the aria-labelledby heading text as accessible name:
const dialog = page.getByRole('dialog', { name: 'Request a Technology Consultation' });
await expect(dialog).toBeVisible();
```

**Wrong approach — locating by text inside the dialog:**
```javascript
// Fragile — aria-labelledby is not the same as inner text matching:
page.locator('[role="dialog"]:has-text("Technology")'); // matches all three if not careful
```

**Why this matters:** All three dialogs share similar internal text and structure. Only `aria-labelledby` + `getByRole('dialog', { name })` provides an unambiguous, resilient locator.

## Scoping locators inside the dialog

All three modal dialogs are in the DOM simultaneously. Unscoped locators like `getByLabel('Your name')` will match three elements (one per dialog) and throw a strict-mode error or match the wrong hidden element.

**Always scope to the dialog:**
```javascript
const dialog = page.getByRole('dialog', { name: 'Request a Technology Consultation' });

// Scoped — correct:
await dialog.getByLabel('Your name').fill('Jane Smith');
await dialog.getByLabel('Your email').fill('jane@example.com');
await dialog.getByRole('button', { name: 'Submit request' }).click();
await expect(dialog.getByRole('alert')).toBeVisible();
```

**Wrong — unscoped:**
```javascript
// Playwright strict mode will error because three inputs match:
await page.getByLabel('Your name').fill('Jane Smith'); // throws StrictModeError
```

## The `aria-labelledby` pattern

`aria-labelledby` sets the accessible name of an element by referencing another element's `id`. When Playwright computes accessible names for `getByRole()`, it resolves `aria-labelledby` automatically.

Example from the Technology dialog:
```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-technology-title">
  <div class="modal">
    <h2 id="modal-technology-title">Request a Technology Consultation</h2>
    ...
  </div>
</div>
```

Playwright reads the `h2` text through `aria-labelledby` and exposes it as the dialog's accessible name. The `name` option in `getByRole` matches against this resolved name.

## Opening the correct consultation button

Three buttons on the page share the label "Request a consultation". To click the right one, scope to the section by its `id`:

```javascript
// Correct — scoped to #technology section:
await page.locator('#technology').getByRole('button', { name: 'Request a consultation' }).click();

// Wrong — strict mode error (three matching buttons):
await page.getByRole('button', { name: 'Request a consultation' }).click();
```

## Close button trap

The close button uses `aria-label="Close dialog"` because its visible text is `×` (the multiplication sign), which is not a stable or accessible name on its own.

```javascript
// Correct:
await dialog.getByRole('button', { name: 'Close dialog' }).click();

// Wrong — '×' is unreliable and may not match in all locales:
await dialog.getByText('×').click();
```

## Confirmation after modal submission

After clicking "Submit request" inside the dialog, the form is hidden and a `role="alert"` element becomes visible within the same dialog.

```javascript
await dialog.getByRole('button', { name: 'Submit request' }).click();
await expect(dialog.getByRole('alert')).toBeVisible();
```

Asserting on `page.getByRole('alert')` without dialog scoping is risky — all three dialogs contain an alert element, and even though only one is visible, it is better practice to scope explicitly.

## Full example: Technology modal flow

```javascript
test('technology service modal can be submitted', async ({ page }) => {
  await page.goto('/sites/thornfield/services.html');

  // Open modal — scope to section to avoid strict mode error
  await page.locator('#technology').getByRole('button', { name: 'Request a consultation' }).click();

  // Get scoped dialog reference
  const dialog = page.getByRole('dialog', { name: 'Request a Technology Consultation' });
  await expect(dialog).toBeVisible();

  // Fill form inside dialog
  await dialog.getByLabel('Your name').fill('Jane Smith');
  await dialog.getByLabel('Your email').fill('jane@example.com');
  await dialog.getByRole('button', { name: 'Submit request' }).click();

  // Assert confirmation inside dialog
  await expect(dialog.getByRole('alert')).toBeVisible();
});
```
