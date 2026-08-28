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
// The mat is a gradient stack whose last layer is the solid terminator the frosted
// surfaces composite over. Parsed, never assumed.
function matBackdrop(mat: string): string {
  const m = mat.match(/linear-gradient\(\s*135deg\s*,\s*(#[0-9A-Fa-f]{6})/);
  if (!m) throw new Error(`--glas-mat has no linear-gradient(135deg, #rrggbb ...) terminator: ${mat}`);
  return m[1];
}
// WCAG relative luminance over sRGB; rgba composited over a solid backdrop first.
function luminance(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`expected a 6 digit hex color, got ${hex}`);
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function composite(rgba: string, backdropHex: string): string {
  const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) throw new Error(`expected an rgba() surface, got ${rgba}`);
  if (!/^#[0-9A-Fa-f]{6}$/.test(backdropHex)) throw new Error(`expected a 6 digit hex backdrop, got ${backdropHex}`);
  const a = parseFloat(m[4]);
  const bg = [1, 3, 5].map((i) => parseInt(backdropHex.slice(i, i + 2), 16));
  const ch = [1, 2, 3].map((i, k) => Math.round(parseInt(m[i]) * a + bg[k] * (1 - a)));
  return "#" + ch.map((c) => c.toString(16).padStart(2, "0")).join("");
}
const ratio = (fg: string, bg: string) => {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe("milchglas tokens", () => {
  const { root, dark } = blocks(css());
  const light = vars(root);
  const darkV = vars(dark);

  test("structure: dark overrides live on .dark, never a media query", () => {
    expect(css()).not.toContain("prefers-color-scheme");
    expect(Object.keys(darkV).length).toBeGreaterThan(10);
  });
  test("brand anchors are verbatim", () => {
    expect(light["--indigo"]).toBe("#4F52C9");
    expect(light["--gruenspan"]).toBe("#1D7A68");
    expect(light["--glas-text"]).toBe("#1C1E2E");
  });
  test("AA contrast: ink on composited glas-karte over the mat, light mode", () => {
    const karte = composite(resolve("--glas-karte", light, light), matBackdrop(resolve("--glas-mat", light, light)));
    expect(ratio(resolve("--glas-text", light, light), karte)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(resolve("--glas-gedimmt", light, light), karte)).toBeGreaterThanOrEqual(4.5);
  });
  test("AA contrast: ink on composited glas-karte, dark mode", () => {
    const karte = composite(resolve("--glas-karte", darkV, light), matBackdrop(resolve("--glas-mat", darkV, light)));
    expect(ratio(resolve("--glas-text", darkV, light), karte)).toBeGreaterThanOrEqual(4.5);
  });
  test("AA contrast: white on indigo primary action", () => {
    expect(ratio("#FFFFFF", resolve("--indigo", light, light))).toBeGreaterThanOrEqual(4.5);
  });
  test("no external origin anywhere in the token layer", () => {
    expect(css()).not.toMatch(/https?:\/\//);
  });
});
