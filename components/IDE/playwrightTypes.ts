export const playwrightDts = `
declare module '@playwright/test' {
  export const test: TestType;
  export const expect: Expect;

  export interface TestType {
    (name: string, fn: (args: { page: Page }) => Promise<void> | void): void;
    describe: (name: string, fn: () => void) => void;
    beforeEach: (fn: (args: { page: Page }) => Promise<void> | void) => void;
    afterEach: (fn: (args: { page: Page }) => Promise<void> | void) => void;
    beforeAll: (fn: () => Promise<void> | void) => void;
    afterAll: (fn: () => Promise<void> | void) => void;
    step<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
    skip: TestBody;
    only: TestBody;
    fixme: TestBody;
  }

  export type TestBody = (name: string, fn: (args: { page: Page }) => Promise<void> | void) => void;

  export type AriaRole =
    | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'blockquote'
    | 'button' | 'caption' | 'cell' | 'checkbox' | 'code' | 'columnheader' | 'combobox'
    | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'directory' | 'document'
    | 'feed' | 'figure' | 'form' | 'generic' | 'grid' | 'gridcell' | 'group' | 'heading'
    | 'img' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'marquee'
    | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio'
    | 'navigation' | 'none' | 'note' | 'option' | 'paragraph' | 'presentation'
    | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader'
    | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton'
    | 'status' | 'strong' | 'subscript' | 'superscript' | 'switch' | 'tab' | 'table'
    | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'time' | 'timer' | 'toolbar'
    | 'tooltip' | 'tree' | 'treegrid' | 'treeitem';

  export interface GetByRoleOptions {
    name?: string | RegExp;
    exact?: boolean;
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    level?: number;
    pressed?: boolean;
    selected?: boolean;
    includeHidden?: boolean;
  }

  export interface GetByTextOptions {
    exact?: boolean;
  }

  export interface LocatorFilterOptions {
    has?: Locator;
    hasNot?: Locator;
    hasText?: string | RegExp;
    hasNotText?: string | RegExp;
  }

  export interface TimeoutOption {
    timeout?: number;
  }

  export interface Locator {
    /** Locate by ARIA role. Preferred locator — most resilient to DOM changes. */
    getByRole(role: AriaRole, options?: GetByRoleOptions): Locator;
    /** Locate form fields by their visible label. Preferred for inputs. */
    getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator;
    /** Locate by visible text. */
    getByText(text: string | RegExp, options?: GetByTextOptions): Locator;
    /** Locate inputs by placeholder text. */
    getByPlaceholder(text: string | RegExp, options?: { exact?: boolean }): Locator;
    /** Locate by data-testid. Fallback when semantic locators are unavailable. */
    getByTestId(id: string | RegExp): Locator;
    getByTitle(text: string | RegExp, options?: { exact?: boolean }): Locator;
    getByAltText(text: string | RegExp, options?: { exact?: boolean }): Locator;
    locator(selector: string, options?: LocatorFilterOptions): Locator;
    filter(options: LocatorFilterOptions): Locator;
    first(): Locator;
    last(): Locator;
    nth(index: number): Locator;
    click(options?: { button?: 'left' | 'right' | 'middle'; force?: boolean; timeout?: number }): Promise<void>;
    dblclick(options?: TimeoutOption): Promise<void>;
    fill(value: string, options?: TimeoutOption): Promise<void>;
    type(text: string, options?: { delay?: number; timeout?: number }): Promise<void>;
    press(key: string, options?: TimeoutOption): Promise<void>;
    check(options?: TimeoutOption): Promise<void>;
    uncheck(options?: TimeoutOption): Promise<void>;
    selectOption(values: string | string[], options?: TimeoutOption): Promise<string[]>;
    hover(options?: TimeoutOption): Promise<void>;
    focus(options?: TimeoutOption): Promise<void>;
    blur(): Promise<void>;
    scrollIntoViewIfNeeded(options?: TimeoutOption): Promise<void>;
    screenshot(options?: { path?: string; fullPage?: boolean; timeout?: number }): Promise<Buffer>;
    textContent(options?: TimeoutOption): Promise<string | null>;
    innerText(options?: TimeoutOption): Promise<string>;
    innerHTML(options?: TimeoutOption): Promise<string>;
    inputValue(options?: TimeoutOption): Promise<string>;
    getAttribute(name: string, options?: TimeoutOption): Promise<string | null>;
    isVisible(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    isChecked(): Promise<boolean>;
    isHidden(): Promise<boolean>;
    count(): Promise<number>;
    waitFor(options?: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }): Promise<void>;
    evaluate<T, A>(fn: (el: Element, arg: A) => T, arg: A): Promise<T>;
    evaluate<T>(fn: (el: Element) => T): Promise<T>;
  }

  export interface Page extends Locator {
    goto(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }): Promise<PlaywrightResponse | null>;
    reload(options?: TimeoutOption): Promise<PlaywrightResponse | null>;
    goBack(options?: TimeoutOption): Promise<PlaywrightResponse | null>;
    goForward(options?: TimeoutOption): Promise<PlaywrightResponse | null>;
    waitForURL(url: string | RegExp | ((url: URL) => boolean), options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void>;
    waitForResponse(url: string | RegExp | ((r: PlaywrightResponse) => boolean), options?: TimeoutOption): Promise<PlaywrightResponse>;
    waitForRequest(url: string | RegExp | ((r: PlaywrightRequest) => boolean), options?: TimeoutOption): Promise<PlaywrightRequest>;
    waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle', options?: TimeoutOption): Promise<void>;
    /**
     * @deprecated Avoid in production tests. Use web-first assertions (toBeVisible, toHaveText) instead.
     */
    waitForTimeout(ms: number): Promise<void>;
    title(): Promise<string>;
    url(): string;
    content(): Promise<string>;
    setViewportSize(size: { width: number; height: number }): Promise<void>;
    screenshot(options?: { path?: string; fullPage?: boolean; timeout?: number }): Promise<Buffer>;
    evaluate<T>(fn: () => T): Promise<T>;
    evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
    keyboard: Keyboard;
    mouse: Mouse;
    route(url: string | RegExp, handler: (route: Route, request: PlaywrightRequest) => Promise<void> | void): Promise<void>;
    unroute(url: string | RegExp): Promise<void>;
  }

  export interface Keyboard {
    press(key: string): Promise<void>;
    type(text: string, options?: { delay?: number }): Promise<void>;
    down(key: string): Promise<void>;
    up(key: string): Promise<void>;
  }

  export interface Mouse {
    click(x: number, y: number, options?: { button?: 'left' | 'right' | 'middle' }): Promise<void>;
    move(x: number, y: number): Promise<void>;
    wheel(deltaX: number, deltaY: number): Promise<void>;
  }

  export interface Route {
    fulfill(options: { status?: number; body?: string; contentType?: string }): Promise<void>;
    continue(): Promise<void>;
    abort(): Promise<void>;
  }

  export interface PlaywrightResponse {
    status(): number;
    statusText(): string;
    ok(): boolean;
    url(): string;
    json(): Promise<unknown>;
    text(): Promise<string>;
    headers(): Record<string, string>;
  }

  export interface PlaywrightRequest {
    url(): string;
    method(): string;
    postData(): string | null;
    headers(): Record<string, string>;
  }

  export interface Expect {
    <T extends Locator>(target: T): LocatorAssertions;
    <T extends Page>(target: T): PageAssertions;
    <T>(value: T): GenericAssertions<T>;
    soft: Expect;
    configure(options: { timeout?: number }): Expect;
  }

  /** Web-first assertions auto-retry until the condition passes or the timeout elapses. Prefer these over manual waits. */
  export interface LocatorAssertions {
    toBeVisible(options?: TimeoutOption): Promise<void>;
    toBeHidden(options?: TimeoutOption): Promise<void>;
    toBeAttached(options?: TimeoutOption): Promise<void>;
    toBeEnabled(options?: TimeoutOption): Promise<void>;
    toBeDisabled(options?: TimeoutOption): Promise<void>;
    toBeChecked(options?: { timeout?: number; checked?: boolean }): Promise<void>;
    toBeFocused(options?: TimeoutOption): Promise<void>;
    toBeEditable(options?: TimeoutOption): Promise<void>;
    toBeEmpty(options?: TimeoutOption): Promise<void>;
    toBeInViewport(options?: TimeoutOption): Promise<void>;
    toHaveText(expected: string | RegExp | (string | RegExp)[], options?: TimeoutOption): Promise<void>;
    toContainText(expected: string | RegExp | (string | RegExp)[], options?: TimeoutOption): Promise<void>;
    toHaveValue(expected: string | RegExp, options?: TimeoutOption): Promise<void>;
    toHaveAttribute(name: string, value: string | RegExp, options?: TimeoutOption): Promise<void>;
    toHaveCount(count: number, options?: TimeoutOption): Promise<void>;
    toHaveClass(className: string | RegExp | (string | RegExp)[], options?: TimeoutOption): Promise<void>;
    toHaveScreenshot(options?: { path?: string; maxDiffPixels?: number; timeout?: number }): Promise<void>;
    not: LocatorAssertions;
  }

  export interface PageAssertions {
    toHaveURL(url: string | RegExp, options?: TimeoutOption): Promise<void>;
    toHaveTitle(title: string | RegExp, options?: TimeoutOption): Promise<void>;
    toHaveScreenshot(options?: { path?: string; fullPage?: boolean; maxDiffPixels?: number; timeout?: number }): Promise<void>;
    not: PageAssertions;
  }

  export interface GenericAssertions<T> {
    toBe(expected: T): void;
    toEqual(expected: T): void;
    toStrictEqual(expected: T): void;
    toBeNull(): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(value: number): void;
    toBeLessThan(value: number): void;
    toContain(value: string | unknown[]): void;
    toMatch(pattern: string | RegExp): void;
    not: GenericAssertions<T>;
  }
}
`;
