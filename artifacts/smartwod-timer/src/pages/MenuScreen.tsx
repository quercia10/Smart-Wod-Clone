import { useState, useEffect, useCallback, useRef } from "react";
import { WorkoutMode, WorkoutConfig, MODE_LABELS, MODE_SUBTITLES } from "@/lib/types";
import { resumeAudio } from "@/lib/sound";
import BackgroundLogo from "@/components/BackgroundLogo";

const MODES: WorkoutMode[] = ["AMRAP", "FOR_TIME", "EMOM", "TABATA"];

const MODE_COLORS: Record<WorkoutMode, string> = {
  AMRAP:    "#2ECC71",
  FOR_TIME: "#E67E22",
  EMOM:     "#3498DB",
  TABATA:   "#E74C3C",
};

interface MenuScreenProps {
  onSelect: (config: WorkoutConfig) => void;
}

export default function MenuScreen({ onSelect }: MenuScreenProps) {
  const [focused, setFocused] = useState(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = useCallback((index: number) => {
    setFocused(index);
    btnRefs.current[index]?.focus();
  }, []);

  const handleSelect = useCallback((index: number) => {
    resumeAudio();
    onSelect({ mode: MODES[index] });
  }, [onSelect]);

  useEffect(() => {
    btnRefs.current[focused]?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        moveFocus((focused - 1 + MODES.length) % MODES.length);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        moveFocus((focused + 1) % MODES.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(focused);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focused, handleSelect, moveFocus]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      <BackgroundLogo />
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "5vh" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(22px, 3.2vw, 48px)", fontWeight: 700, letterSpacing: "0.06em", color: "#F8F9FA", textTransform: "uppercase" }}>
          SmartWOD Timer
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px, 1.3vw, 18px)", color: "rgba(248,249,250,0.42)", letterSpacing: "0.18em", marginTop: "6px", fontWeight: 400, textTransform: "uppercase" }}>
          Scegli la modalità di allenamento
        </div>
      </div>

      {/* Mode grid */}
      <div className="menu-grid">
        {MODES.map((mode, i) => {
          const isFocused = focused === i;
          const accent = MODE_COLORS[mode];
          return (
            <button
              key={mode}
              ref={(el) => { btnRefs.current[i] = el; }}
              data-testid={`mode-btn-${mode}`}
              tabIndex={0}
              onClick={() => handleSelect(i)}
              onFocus={() => setFocused(i)}
              className="wod-btn"
              style={{
                background: isFocused ? "#F8F9FA" : "#1E1E1E",
                border: `1px solid ${isFocused ? "transparent" : "rgba(255,255,255,0.10)"}`,
                borderRadius: "20px",
                padding: "clamp(18px, 2.8vh, 44px) clamp(10px, 1.4vw, 22px)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.18s ease",
                transform: isFocused ? "scale(1.04)" : "scale(1)",
                boxShadow: isFocused ? "0 8px 32px rgba(0,0,0,0.45)" : "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              <ModeIcon mode={mode} color={isFocused ? "#121212" : accent} />

              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(18px, 2.2vw, 34px)", fontWeight: 700, letterSpacing: "0.04em", color: isFocused ? "#121212" : "#F8F9FA", transition: "color 0.18s ease" }}>
                {MODE_LABELS[mode]}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(10px, 1vw, 14px)", color: isFocused ? "rgba(18,18,18,0.58)" : "rgba(248,249,250,0.42)", textAlign: "center", letterSpacing: "0.03em", lineHeight: 1.4, fontWeight: 400 }}>
                {MODE_SUBTITLES[mode]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ marginTop: "4vh", fontFamily: "Inter, sans-serif", fontSize: "clamp(10px, 0.9vw, 13px)", color: "rgba(248,249,250,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 400 }}>
        <span className="dpad-hint">← → D-Pad &nbsp;·&nbsp; INVIO Seleziona</span>
        <span className="touch-hint">Tocca una modalità per iniziare</span>
      </div>
    </div>
  );
}

function ModeIcon({ mode, color }: { mode: WorkoutMode; color: string }) {
  const size = 48;
  const s: React.CSSProperties = { width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" };

  if (mode === "AMRAP") {
    return (
      <div style={s}>
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="2.5" />
          <path d="M24 13 L24 24 L33 33" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="24" r="2.5" fill={color} />
        </svg>
      </div>
    );
  }
  if (mode === "FOR_TIME") {
    return (
      <div style={s}>
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="26" r="16" stroke={color} strokeWidth="2.5" />
          <path d="M19 8 h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 10 v4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 20 v7" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 27 l5 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (mode === "EMOM") {
    return (
      <div style={s}>
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect x="6"  y="20" width="8"  height="22" rx="2" fill={color} opacity="0.55" />
          <rect x="20" y="12" width="8"  height="30" rx="2" fill={color} />
          <rect x="34" y="26" width="8"  height="16" rx="2" fill={color} opacity="0.55" />
        </svg>
      </div>
    );
  }
  return (
    <div style={s}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="6"  y="6"  width="16" height="16" rx="4" fill={color} />
        <rect x="26" y="6"  width="16" height="16" rx="4" fill={color} opacity="0.38" />
        <rect x="6"  y="26" width="16" height="16" rx="4" fill={color} opacity="0.38" />
        <rect x="26" y="26" width="16" height="16" rx="4" fill={color} />
      </svg>
    </div>
  );
}
