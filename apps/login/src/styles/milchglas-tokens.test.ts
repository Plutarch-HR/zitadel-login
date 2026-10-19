import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = () => readFileSync(join(__dirname, "milchglas.tokens.css"), "utf8");

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const declarations = block.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of declarations.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
function blocks(text: string): { root: string; dark: string } {
  const root = text.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const dark = text.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  return { root, dark };
}
// Follows var(--x) indirection so a token defined by reference is asserted on its real
// value. The scheme map wins, falling back to :root the way the cascade resolves it.
function resolve(name: string, scheme: Record<string, string>, base: Record<string, string>): string {
  let value = scheme[name] ?? base[name];
  const seen = new Set<string>([name]);
  while (value !== undefined && /^var\(\s*--[\w-]+\s*\)$/.test(value)) {
    const ref = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)![1];
    if (seen.has(ref)) throw new Error(`circular var() chain resolving ${name} at ${ref}`);
    seen.add(ref);
    value = scheme[ref] ?? base[ref];
  }
  if (value === undefined) throw new Error(`token ${name} is not defined in the token layer`);
  return value;
}
// WCAG relative luminance over sRGB.
function luminance(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`expected a 6 digit hex color, got ${hex}`);
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (fg: string, bg: string) => {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe("login token layer", () => {
  const { root, dark } = blocks(css());
  const light = vars(root);
  const darkV = vars(dark);

  test("structure: dark overrides live on .dark, never a media query", () => {
    expect(css()).not.toContain("prefers-color-scheme");
    expect(Object.keys(darkV).length).toBeGreaterThan(10);
  });
  test("brand anchors are verbatim", () => {
    expect(resolve("--indigo", light, light)).toBe("#2464D5");
    expect(resolve("--glas-text", light, light)).toBe("#202A35");
    expect(light["--agent-azur"]).toBe("#1E7BFF");
    expect(light["--agent-glut"]).toBe("#E8521A");
  });
  // Pearl & Graphite surfaces are opaque, so text is measured against the card colour itself.
  for (const [mode, scheme] of [
    ["light", light],
    ["dark", darkV],
  ] as const) {
    test(`AA contrast: ink on the card, ${mode} mode`, () => {
      const karte = resolve("--glas-karte", scheme, light);
      expect(ratio(resolve("--glas-text", scheme, light), karte)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(resolve("--glas-gedimmt", scheme, light), karte)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(resolve("--indigo-text", scheme, light), karte)).toBeGreaterThanOrEqual(4.5);
    });
    test(`AA contrast: label on the primary action, ${mode} mode`, () => {
      expect(
        ratio(resolve("--indigo-tile-text", scheme, light), resolve("--indigo", scheme, light)),
      ).toBeGreaterThanOrEqual(4.5);
    });
    test(`non-text contrast: focus ring and input border against the card, ${mode} mode`, () => {
      const karte = resolve("--glas-karte", scheme, light);
      expect(ratio(resolve("--indigo", scheme, light), karte)).toBeGreaterThanOrEqual(3);
      expect(ratio(resolve("--glas-linie-stark", scheme, light), karte)).toBeGreaterThanOrEqual(3);
    });
  }
  test("no external origin anywhere in the token layer", () => {
    expect(css()).not.toMatch(/https?:\/\//);
  });
});
