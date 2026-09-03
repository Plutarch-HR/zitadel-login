import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// WCAG 1.4.10 (Reflow). Both shell wrappers are `min-h-screen` flex columns that
// centre their content. With plain `justify-center`, content taller than the
// viewport (200% zoom, large text) overflows equally in both directions and the
// top overflow is unreachable, because a flex container cannot be scrolled back
// past its start edge. `justify-center-safe` compiles to `justify-content: safe
// center`, which falls back to start alignment exactly in the overflow case.
const LAYOUT = join(__dirname, "layout.tsx");

describe("login shell reflow", () => {
  test("both min-h-screen wrappers centre safely", () => {
    const text = readFileSync(LAYOUT, "utf8");
    const wrappers = text.split("\n").filter((line) => line.includes("min-h-screen"));

    // One for the Suspense fallback, one for the live tree.
    expect(wrappers).toHaveLength(2);
    for (const line of wrappers) {
      expect(line).toContain("justify-center-safe");
      expect(line).not.toMatch(/justify-center(?!-safe)/);
    }
  });
});

// The language and theme controls belong to the login card, not to the page. The
// outer shell is a 1100px container, so widening the control row to `md:max-w-full`
// pushed the pickers into the far bottom right corner of the viewport, detached
// from the 440px card they belong to.
describe("login shell control row", () => {
  const lines = () => readFileSync(LAYOUT, "utf8").split("\n");

  // Line numbers of the opening tags of the two control rows.
  const controlRowStarts = () =>
    lines()
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes("flex-row") && line.includes("py-4"))
      .map(({ index }) => index);

  // The children of one control row: everything between its opening tag and the
  // first line that closes it again.
  const controlRowChildren = (start: number) => {
    const all = lines();
    const end = all.findIndex((line, index) => index > start && line.includes("</div>"));
    expect(end).toBeGreaterThan(start);
    return all.slice(start + 1, end);
  };

  test("both control rows stay in the 440px card column", () => {
    const all = lines();
    const rows = controlRowStarts().map((index) => all[index]);

    // One for the Suspense fallback, one for the live tree.
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toContain("max-w-[440px]");
      expect(row).not.toContain("md:max-w-full");
      expect(row).not.toContain("md:px-8");
    }
  });

  test("the live control row seats language left and theme right", () => {
    const all = lines();
    const start = controlRowStarts().find((index) => all[index].includes("justify-between"));

    expect(start).toBeDefined();
    expect(all[start!]).toContain("max-w-[440px]");

    // LanguageSwitcher first, ThemeSwitch second, so the row reads left to right.
    // Scoped to this row's own children, so the ThemeSwitch in the Suspense
    // fallback row cannot stand in for this row's own.
    const children = controlRowChildren(start!);
    const language = children.findIndex((line) => line.includes("<LanguageSwitcher"));
    const theme = children.findIndex((line) => line.includes("<ThemeSwitch"));

    expect(language).toBeGreaterThan(-1);
    expect(theme).toBeGreaterThan(-1);
    expect(language).toBeLessThan(theme);
  });
});
