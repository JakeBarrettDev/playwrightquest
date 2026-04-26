import type * as Monaco from "monaco-editor";

interface SnippetDef {
  label: string;
  insertText: string;
  detail: string;
  documentation?: string;
}

// Ordered by best-practice rank. Earlier items get a lower sortText
// and therefore appear higher in the completion list.
const PREFERRED_LOCATORS: SnippetDef[] = [
  {
    label: "getByRole",
    insertText: "getByRole('${1:button}', { name: '${2:label}' })$0",
    detail: "Playwright locator (preferred)",
    documentation:
      "Locate elements by ARIA role. Most resilient to DOM changes.",
  },
  {
    label: "getByLabel",
    insertText: "getByLabel('${1:label}')$0",
    detail: "Playwright locator (preferred for form fields)",
    documentation: "Locate form fields by their visible <label> text.",
  },
  {
    label: "getByText",
    insertText: "getByText('${1:text}')$0",
    detail: "Playwright locator (preferred for content)",
    documentation: "Locate elements by their visible text.",
  },
  {
    label: "getByPlaceholder",
    insertText: "getByPlaceholder('${1:placeholder}')$0",
    detail: "Playwright locator (use when no <label> is available)",
  },
  {
    label: "getByTestId",
    insertText: "getByTestId('${1:id}')$0",
    detail: "Playwright locator (fallback)",
    documentation:
      "Locate by data-testid. Use only when semantic locators are not feasible.",
  },
];

// Top-level snippets surfaced when the user types a `pw`-prefixed identifier.
// The `pw` prefix is intentional: it keeps Playwright scaffolds out of the
// default TS autocomplete noise and gives players a single discoverable
// namespace. All of these are snippet-mode insertions with tab stops.
const PW_SNIPPETS: SnippetDef[] = [
  {
    label: "pwtest",
    insertText:
      "test('${1:description}', async ({ page }) => {\n  ${2:// test body}\n});$0",
    detail: "Playwright: new test block",
    documentation: "Scaffold a new Playwright test with a page fixture.",
  },
  {
    label: "pwimport",
    insertText: "import { test, expect } from '@playwright/test';\n$0",
    detail: "Playwright: common imports",
  },
  {
    label: "pwstep",
    insertText:
      "await test.step('${1:step name}', async () => {\n  ${2:// step body}\n});$0",
    detail: "Playwright: test.step block",
    documentation:
      "Group related actions + assertions into a named reporter-friendly step.",
  },
  {
    label: "pwdescribe",
    insertText: "test.describe('${1:suite name}', () => {\n  ${2:// tests}\n});$0",
    detail: "Playwright: test.describe suite",
  },
  {
    label: "pwbeforeeach",
    insertText:
      "test.beforeEach(async ({ page }) => {\n  ${1:await page.goto('/');}\n});$0",
    detail: "Playwright: beforeEach hook",
  },
  {
    label: "pwgoto",
    insertText: "await page.goto('${1:/}');$0",
    detail: "Playwright: navigate",
  },
  {
    label: "pwclick",
    insertText:
      "await page.getByRole('${1:button}', { name: '${2:label}' }).click();$0",
    detail: "Playwright: click by role + name",
    documentation:
      "Click the element that exposes the given ARIA role and accessible name.",
  },
  {
    label: "pwfill",
    insertText: "await page.getByLabel('${1:label}').fill('${2:value}');$0",
    detail: "Playwright: fill form field by label",
  },
  {
    label: "pwselect",
    insertText:
      "await page.getByLabel('${1:label}').selectOption('${2:value}');$0",
    detail: "Playwright: select an <option> by label",
  },
  {
    label: "pwcheck",
    insertText:
      "await page.getByLabel('${1:label}').check();$0",
    detail: "Playwright: check a checkbox or radio",
  },
  {
    label: "pwexpectvisible",
    insertText:
      "await expect(page.getByRole('${1:heading}', { name: '${2:text}' })).toBeVisible();$0",
    detail: "Playwright: assert element is visible",
    documentation:
      "Web-first assertion. Auto-retries until the locator resolves to a visible element.",
  },
  {
    label: "pwexpecttext",
    insertText:
      "await expect(page.getByTestId('${1:test-id}')).toHaveText('${2:text}');$0",
    detail: "Playwright: assert text content",
  },
  {
    label: "pwexpecturl",
    insertText: "await expect(page).toHaveURL(/${1:pattern}/);$0",
    detail: "Playwright: assert current URL",
  },
  {
    label: "pwexpectcount",
    insertText:
      "await expect(page.getByRole('${1:listitem}')).toHaveCount(${2:3});$0",
    detail: "Playwright: assert number of matches",
  },
  {
    label: "pwwaitresponse",
    insertText:
      "const ${1:response} = await page.waitForResponse('${2:**/api/**}');$0",
    detail: "Playwright: wait for a network response",
  },
  {
    label: "pwroute",
    insertText:
      "await page.route('${1:**/api/**}', async (route) => {\n  await route.fulfill({ json: ${2:{}} });\n});$0",
    detail: "Playwright: intercept & mock a request",
  },
  {
    label: "pwpom",
    insertText:
      "import { type Page, type Locator } from '@playwright/test';\n\nexport class ${1:ExamplePage} {\n  readonly ${2:submitButton}: Locator;\n\n  constructor(readonly page: Page) {\n    this.${2:submitButton} = page.getByRole('button', { name: '${3:Submit}' });\n  }\n\n  async goto() {\n    await this.page.goto('${4:/}');\n  }\n}\n$0",
    detail: "Playwright: Page Object Model skeleton",
    documentation:
      "Opinionated POM shape: locators declared in the constructor, navigation helpers as methods.",
  },
];

const PREFERRED_ASSERTIONS: SnippetDef[] = [
  {
    label: "toBeVisible",
    insertText: "toBeVisible()$0",
    detail: "Playwright web-first assertion",
    documentation: "Auto-retries until the element is visible.",
  },
  {
    label: "toHaveText",
    insertText: "toHaveText('${1:text}')$0",
    detail: "Playwright web-first assertion",
  },
  {
    label: "toHaveValue",
    insertText: "toHaveValue('${1:value}')$0",
    detail: "Playwright web-first assertion",
  },
  {
    label: "toBeEnabled",
    insertText: "toBeEnabled()$0",
    detail: "Playwright web-first assertion",
  },
  {
    label: "toBeChecked",
    insertText: "toBeChecked()$0",
    detail: "Playwright web-first assertion",
  },
  {
    label: "toHaveCount",
    insertText: "toHaveCount(${1:1})$0",
    detail: "Playwright web-first assertion",
  },
  {
    label: "toHaveURL",
    insertText: "toHaveURL(/${1:pattern}/)$0",
    detail: "Playwright web-first assertion",
  },
];

function buildItems(
  monaco: typeof Monaco,
  snippets: SnippetDef[],
  range: Monaco.IRange,
  kind: Monaco.languages.CompletionItemKind = monaco.languages
    .CompletionItemKind.Method
): Monaco.languages.CompletionItem[] {
  return snippets.map((snippet, i) => ({
    label: snippet.label,
    kind,
    insertText: snippet.insertText,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: snippet.detail,
    documentation: snippet.documentation,
    range,
    // Prefix with '0' + zero-padded index so these sort above TS-language-
    // service completions (which start with higher chars).
    sortText: "0" + String(i).padStart(2, "0") + snippet.label,
    preselect: i === 0,
  }));
}

export function registerPlaywrightCompletions(monaco: typeof Monaco) {
  const providers = [
    monaco.languages.registerCompletionItemProvider("typescript", {
      triggerCharacters: ["."],
      provideCompletionItems: (model, position) => {
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: Monaco.languages.CompletionItem[] = [];

        // After a member-access, e.g. `page.`, `locator.`, or chained calls.
        if (/\.\s*\w*$/.test(textBeforeCursor) &&
            !/expect\s*\([^)]*\)\s*\.\s*\w*$/.test(textBeforeCursor)) {
          suggestions.push(...buildItems(monaco, PREFERRED_LOCATORS, range));
        }

        // Inside an expect(...).something context.
        if (/expect\s*\([^)]*\)\s*\.\s*\w*$/.test(textBeforeCursor)) {
          suggestions.push(...buildItems(monaco, PREFERRED_ASSERTIONS, range));
        }

        return { suggestions };
      },
    }),

    // Top-level `pw*` scaffolds. Fires on every word-character keystroke; we
    // only return items when the player is typing an identifier that starts
    // with `pw` (case-insensitive) so completions elsewhere stay uncluttered.
    monaco.languages.registerCompletionItemProvider("typescript", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        if (!/^pw/i.test(word.word)) {
          return { suggestions: [] };
        }

        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: buildItems(
            monaco,
            PW_SNIPPETS,
            range,
            monaco.languages.CompletionItemKind.Snippet
          ),
        };
      },
    }),
  ];

  return () => providers.forEach((p) => p.dispose());
}
