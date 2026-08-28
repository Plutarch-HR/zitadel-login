import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// R-LOGSURF-03: no asset, font, script, style, or beacon loads from any origin
// other than the login application's own. Google Fonts is the canonical violation.
// The walk covers the whole app root, not just src/, so the root config files
// (next.config.mjs, tailwind.config.mjs, postcss.config.cjs) are guarded too.
// Residual, checked by hand at cutover: public/ binaries and locales/*.json.
const APP_ROOT = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "coverage"].includes(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|cjs|scss|css)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("no external origins", () => {
  test("next/font/google is gone and no fonts.googleapis reference exists", () => {
    for (const file of walk(APP_ROOT)) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain("next/font/google");
      expect(text, file).not.toContain("fonts.googleapis.com");
      expect(text, file).not.toContain("fonts.gstatic.com");
    }
  });
  test("layout applies the milchglas body font class, not a Google font class", () => {
    const layout = readFileSync(join(APP_ROOT, "src", "app", "(login)", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/from ["']next\/font\/google["']/);
    expect(layout).toContain("font-body");
  });
});
