import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = () => readFileSync(join(__dirname, "milchglas.tokens.css"), "utf8");

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
function blocks(text: string): { root: string; dark: string } {
  const root = text.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const dark = text.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  return { root, dark };
}
// WCAG relative luminance over sRGB; rgba composited over a solid backdrop first.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function composite(rgba: string, backdropHex: string): string {
  const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)!;
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
    const karte = composite(light["--glas-karte"], "#DBE0FB");
    expect(ratio(light["--glas-text"], karte)).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#63657D", karte)).toBeGreaterThanOrEqual(4.5); // --glas-gedimmt
  });
  test("AA contrast: ink on composited glas-karte, dark mode", () => {
    const karte = composite(darkV["--glas-karte"], "#1B1A2E");
    expect(ratio("#FAF9F5", karte)).toBeGreaterThanOrEqual(4.5); // --glas-text dark = --d-text
  });
  test("AA contrast: white on indigo primary action", () => {
    expect(ratio("#FFFFFF", light["--indigo"])).toBeGreaterThanOrEqual(4.5);
  });
  test("no external origin anywhere in the token layer", () => {
    expect(css()).not.toMatch(/https?:\/\//);
  });
});
