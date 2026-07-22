interface Props { data: number[]; up: boolean; width?: number; height?: number; }
export function Sparkline({ data, up, width = 120, height = 36 }: Props) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`).join(" ");
  const stroke = up ? "oklch(0.86 0.28 138)" : "oklch(0.65 0.24 25)";
  const id = `sg-${up ? "u" : "d"}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <polygon fill={`url(#${id})`} points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  );
}
