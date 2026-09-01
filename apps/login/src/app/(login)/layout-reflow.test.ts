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
