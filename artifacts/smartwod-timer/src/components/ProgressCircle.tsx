const N_SEGMENTS = 52;

interface ProgressCircleProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
  children?: React.ReactNode;
}

export default function ProgressCircle({
  progress,
  size = 400,
  color = "#2ECC71",
  children,
}: ProgressCircleProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.41;
  const segW = Math.max(5, size * 0.023);
  const segH = Math.max(11, size * 0.05);
  const rx = segW / 2;
  const activeCount = Math.round(Math.max(0, Math.min(1, progress)) * N_SEGMENTS);
  const uid = color.replace(/[^a-z0-9]/gi, "x");

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`sg-${uid}`} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: N_SEGMENTS }).map((_, i) => {
          if (i < activeCount) return null;
          const angle = (i / N_SEGMENTS) * 2 * Math.PI - Math.PI / 2;
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          const deg = (angle * 180) / Math.PI + 90;
          return (
            <rect
              key={i}
              x={x - segW / 2}
              y={y - segH / 2}
              width={segW}
              height={segH}
              rx={rx}
              ry={rx}
              fill="rgba(255,255,255,0.07)"
              transform={`rotate(${deg} ${x} ${y})`}
            />
          );
        })}

        <g filter={`url(#sg-${uid})`}>
          {Array.from({ length: activeCount }).map((_, i) => {
            const angle = (i / N_SEGMENTS) * 2 * Math.PI - Math.PI / 2;
            const x = cx + R * Math.cos(angle);
            const y = cy + R * Math.sin(angle);
            const deg = (angle * 180) / Math.PI + 90;
            return (
              <rect
                key={i}
                x={x - segW / 2}
                y={y - segH / 2}
                width={segW}
                height={segH}
                rx={rx}
                ry={rx}
                fill={color}
                transform={`rotate(${deg} ${x} ${y})`}
              />
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
