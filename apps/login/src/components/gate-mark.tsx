type Props = { size?: number; decorative?: boolean; className?: string };

export function GateMark({ size = 20, decorative = false, className }: Props) {
  const width = Math.round((size * 80) / 84);
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": "Plutarch" };
  return (
    <svg viewBox="0 0 80 84" width={width} height={size} className={className} {...a11y}>
      {!decorative && <title>Plutarch</title>}
      <rect width="80" height="14" rx="2" fill="currentColor" />
      <rect x="6" y="14" width="16" height="66" rx="2" fill="currentColor" />
      <rect x="58" y="14" width="16" height="66" rx="2" fill="currentColor" />
      <circle cx="40" cy="64" r="7.5" fill="#1D7A68" />
    </svg>
  );
}
