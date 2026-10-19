import { useId } from "react";

type Props = { size?: number; decorative?: boolean; className?: string };

// The Plutarch mark as the product draws it (client/renderer/src/brand/GateMark.tsx): a gate of
// ink that inverts with the mode via currentColor, and the agent dot, a sphere shaded through the
// Azur to Glut fade that never changes. SVG interpolates stops in sRGB, so the OKLCH midpoint is its
// own stop. The mark is the one place the agent colour appears on this surface; the artifact of
// record fixes the dot, and a recoloured or removed dot is a misuse of the mark.
export function GateMark({ size = 20, decorative = false, className }: Props) {
  const width = Math.round((size * 80) / 84);
  const sphere = `gate-dot-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": "Plutarch" };
  return (
    <svg viewBox="0 0 80 84" width={width} height={size} className={className} {...a11y}>
      {!decorative && <title>Plutarch</title>}
      <defs>
        <radialGradient id={sphere} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="var(--agent-azur)" />
          <stop offset="50%" stopColor="color-mix(in oklch, var(--agent-azur), var(--agent-glut))" />
          <stop offset="100%" stopColor="var(--agent-glut)" />
        </radialGradient>
      </defs>
      <rect width="80" height="14" rx="2" fill="currentColor" />
      <rect x="6" y="14" width="16" height="66" rx="2" fill="currentColor" />
      <rect x="58" y="14" width="16" height="66" rx="2" fill="currentColor" />
      <circle cx="40" cy="64" r="7.5" fill={`url(#${sphere})`} data-agent-dot="" />
    </svg>
  );
}
