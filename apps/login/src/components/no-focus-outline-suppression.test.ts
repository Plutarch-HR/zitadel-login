import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

// WCAG 2.4.7 (Focus Visible). In Tailwind v4 the outline-none utility compiles to
// `--tw-outline-style: none`, and every `outline-<width>` utility resolves
// `outline-style: var(--tw-outline-style)`. So an element carrying both
// `focus:outline-none` and `focus-visible:outline-2` paints no ring at all: the
// suppression wins on the same element. This sweep keeps that combination from
// creeping back in.
//
// The `group-focus:outline-none` form is deliberately NOT flagged: it targets a
// non-focusable presentational child (the avatars), where the focus indicator is
// the `group-focus:ring-2` painted on that same child while a focusable ancestor
// holds focus. The lookbehinds below exclude any prefixed variant.
const SRC_ROOT = join(__dirname, "..");

// Elements that suppress the default outline but replace it with an equally
// visible, distinct indicator of their own. Each entry needs a reason.
const ALLOWED: Record<string, string> = {
  // The text input replaces the outline with an indigo border plus a 1px indigo
  // ring on focus (`focus:border-[var(--indigo)] focus:ring-1`), which is a
  // visible indicator in both themes.
  "components/input.tsx": "outline replaced by an indigo focus border and ring",
};

const FOCUS_SUPPRESSION = /(?<![-\w])focus:outline-none/;
const BARE_SUPPRESSION = /(?<![-\w:])outline-none/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    // Keep the skip-list aligned with src/styles/no-external-origin.test.ts:
    // these are gitignored build output, never authored source.
    if (["node_modules", ".next", "coverage"].includes(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|scss)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

describe("no focus outline suppression", () => {
  test("no component or app source suppresses its own focus outline", () => {
    for (const file of walk(SRC_ROOT)) {
      const key = relative(SRC_ROOT, file).split(sep).join("/");
      if (key in ALLOWED) continue;
      const text = readFileSync(file, "utf8");
      expect(FOCUS_SUPPRESSION.test(text), `${key} must not suppress the focus outline`).toBe(false);
      expect(BARE_SUPPRESSION.test(text), `${key} must not carry a bare outline-none`).toBe(false);
    }
  });

  test("the repaired interactive components carry the indigo focus-visible ring", () => {
    const files = [
      "components/button.tsx",
      "components/language-switcher.tsx",
      "components/idps/base-button.tsx",
      "components/theme-switch.tsx",
      "components/authentication-method-radio.tsx",
    ];
    for (const f of files) {
      const text = readFileSync(join(SRC_ROOT, ...f.split("/")), "utf8");
      expect(text, f).toContain("focus-visible:outline-2");
      expect(text, f).toContain("focus-visible:outline-[var(--indigo)]");
    }
  });
});
