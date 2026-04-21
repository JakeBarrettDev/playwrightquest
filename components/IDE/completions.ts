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
  range: Monaco.IRange
): Monaco.languages.CompletionItem[] {
  return snippets.map((snippet, i) => ({
    label: snippet.label,
    kind: monaco.languages.CompletionItemKind.Method,
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
  ];

  return () => providers.forEach((p) => p.dispose());
}
