import { useMemo } from "react";

interface SegmentedRingProps {
  progress: number;
  size: number;
  activeColor: string;
  children?: React.ReactNode;
}

const SEGMENTS = 12;
const SEGMENT_ANGLE = 26; // degrees per segment (30 total - 4 gap)

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segPath(cx: number, cy: number, outerR: number, innerR: number, i: number) {
  const a0 = i * 30;
  const a1 = a0 + SEGMENT_ANGLE;
  const os  = polar(cx, cy, outerR, a0);
  const oe  = polar(cx, cy, outerR, a1);
  const ie  = polar(cx, cy, innerR, a1);
  const is_ = polar(cx, cy, innerR, a0);
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${is_.x.toFixed(2)} ${is_.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function lerpHex(hex: string, to: string, t: number) {
  const r1 = parseInt(hex.slice(1, 3), 16);
  const g1 = parseInt(hex.slice(3, 5), 16);
  const b1 = parseInt(hex.slice(5, 7), 16);
  const r2 = parseInt(to.slice(1, 3), 16);
  const g2 = parseInt(to.slice(3, 5), 16);
  const b2 = parseInt(to.slice(5, 7), 16);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

export default function SegmentedRing({ progress, size, activeColor, children }: SegmentedRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.462;
  const innerR = size * 0.328;
  const panelSide = innerR * 1.36;

  const activeCount = useMemo(() => Math.round(progress * SEGMENTS), [progress]);

  const activeLight = lerpHex(activeColor, "#ffffff", 0.24);
  const activeDark  = lerpHex(activeColor, "#000000", 0.22);
  const gradId      = `sr-g-${activeColor.replace("#", "")}`;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* 12-segment SVG ring */}
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          {/* Metallic dark gradient for inactive segments */}
          <linearGradient id="sr-inactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#383838" />
            <stop offset="30%"  stopColor="#424242" />
            <stop offset="68%"  stopColor="#2c2c2c" />
            <stop offset="100%" stopColor="#1c1c1c" />
          </linearGradient>
          {/* Active gradient (matches accent color) */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={activeLight} />
            <stop offset="100%" stopColor={activeDark}  />
          </linearGradient>
          {/* Subtle shadow filter */}
          <filter id="sr-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {Array.from({ length: SEGMENTS }, (_, i) => (
          <path
            key={i}
            d={segPath(cx, cy, outerR, innerR, i)}
            fill={i < activeCount ? `url(#${gradId})` : "url(#sr-inactive)"}
            stroke="#121212"
            strokeWidth="2.5"
            filter="url(#sr-shadow)"
            style={{ transition: "fill 0.35s ease" }}
          />
        ))}
      </svg>

      {/* Glass panel with logo centred behind digits */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: panelSide,
          height: panelSide,
          borderRadius: "14px",
          background: "rgba(16,16,16,0.82)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.4), 0 6px 28px rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          style={{ width: "70%", height: "70%", objectFit: "contain", opacity: 0.20, userSelect: "none" }}
        />
      </div>

      {/* Content overlay (time + label) */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
