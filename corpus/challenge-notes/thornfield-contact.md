# Challenge Notes: Thornfield & Associates — Contact Form

<!-- tags: thornfield, contact_form, form_submission, select_option, optional_field, confirmation, getByLabel, getByRole, challenge -->

Notes specific to the contact form challenge on the Thornfield & Associates sample site. Use these to ground feedback on this challenge's intentional traps.

## Site overview

- `/sites/thornfield/index.html` — consulting firm homepage with hero CTA, three service cards, and testimonials.
- `/sites/thornfield/contact.html` — the contact form page.
- `/sites/thornfield/services.html` — services detail page with modal dialogs.

## Intentional traps on this challenge

### 1. Optional Phone field (`optional_field_trap`)

The Phone input has `type="tel"` but **no `required` attribute**. It is genuinely optional.

**Wrong approach:** Asserting `await expect(page.getByLabel('Phone')).toHaveValue(...)` when the field has not been filled — this will succeed with an empty string `''`, which may appear to confirm something it doesn't.

**Right approach:** Either fill the field explicitly if you intend to assert on it, or skip it entirely since it is optional. The challenge acceptance criteria only require required fields to be filled.

### 2. Service interest empty default option (`empty_default_option_trap`)

The Service interest `<select>` has a first option with `value=""` and display text `"Select a service…"`. The default selected value is an **empty string**, not a service name.

**Wrong approach:**
```javascript
// Does NOT select a real service:
const select = page.getByLabel('Service interest');
await expect(select).toHaveValue('strategy'); // fails — default is ''
```

**Right approach:** Always call `selectOption()` explicitly before asserting:
```javascript
await page.getByLabel('Service interest').selectOption('technology');
await expect(page.getByLabel('Service interest')).toHaveValue('technology');
```

## Accessible names for every field

| Field | Required | Ideal locator |
|-------|----------|---------------|
| Full name | Yes | `page.getByLabel('Full name')` |
| Work email | Yes | `page.getByLabel('Work email')` |
| Company | Yes | `page.getByLabel('Company')` |
| Phone | No | `page.getByLabel('Phone')` |
| Service interest | Yes | `page.getByLabel('Service interest')` or `page.getByRole('combobox', { name: 'Service interest' })` |
| Message | Yes | `page.getByLabel('Message')` |
| Submit button | — | `page.getByRole('button', { name: 'Send message' })` |
| Confirmation | — | `page.getByRole('alert')` |

## Confirmation element behaviour

The confirmation `<div id="contact-confirmation">` has `role="alert"` and `aria-live="polite"`. It is hidden (`display:none`) until the form is submitted, then the class `visible` is added which sets `display:block`.

**Correct assertion:**
```javascript
await expect(page.getByRole('alert')).toBeVisible();
// Or assert on exact text:
await expect(page.getByRole('alert')).toHaveText("Thank you, we'll be in touch within one business day.");
```

**Note:** The form itself is hidden after submission (`style.display='none'`), so asserting `toBeHidden()` on any required field also passes as a secondary check.

## Typical acceptance criteria (BDD)

```
Given I am on the Thornfield contact page
When I fill in Full name, Work email, Company, and Message
And I select "Technology" from the Service interest dropdown
And I click the "Send message" button
Then the confirmation alert should be visible with the expected message
```

## Coverage guidance

Tests that assert only `toBeVisible()` on the alert are correct but minimal. Stronger tests also assert on the exact confirmation text and verify the form is no longer visible after submission.
