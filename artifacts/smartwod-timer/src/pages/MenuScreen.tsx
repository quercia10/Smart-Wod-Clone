import { useState, useEffect, useCallback, useRef } from "react";
import { WorkoutMode, WorkoutConfig, MODE_LABELS, MODE_SUBTITLES } from "@/lib/types";
import { resumeAudio } from "@/lib/sound";

const MODES: WorkoutMode[] = ["AMRAP", "FOR_TIME", "EMOM", "TABATA"];

const MODE_COLORS_BG: Record<WorkoutMode, string> = {
  AMRAP: "#00ff66",
  FOR_TIME: "#ff8800",
  EMOM: "#00ff66",
  TABATA: "#ff3333",
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
    const mode = MODES[index];
    onSelect({ mode });
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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "6vh" }}>
        <div
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: "clamp(28px, 4vw, 56px)",
            fontWeight: 700,
            letterSpacing: "0.25em",
            color: "#00ff66",
            textShadow: "0 0 20px #00ff66, 0 0 40px #00ff66",
            textTransform: "uppercase",
          }}
        >
          SmartWOD Timer
        </div>
        <div
          style={{
            fontFamily: "Roboto, sans-serif",
            fontSize: "clamp(12px, 1.5vw, 20px)",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.3em",
            marginTop: "0.5vh",
            textTransform: "uppercase",
          }}
        >
          Scegli la modalità di allenamento
        </div>
      </div>

      {/* Mode grid */}
      <div className="menu-grid">
        {MODES.map((mode, i) => {
          const isFocused = focused === i;
          const color = MODE_COLORS_BG[mode];
          return (
            <button
              key={mode}
              ref={(el) => { btnRefs.current[i] = el; }}
              data-testid={`mode-btn-${mode}`}
              tabIndex={0}
              onClick={() => handleSelect(i)}
              onFocus={() => { setFocused(i); }}
              className="wod-btn"
              style={{
                background: isFocused ? `rgba(${hexToRgb(color)}, 0.12)` : "rgba(255,255,255,0.03)",
                border: `3px solid ${isFocused ? color : "rgba(255,255,255,0.12)"}`,
                borderRadius: "12px",
                padding: "clamp(20px, 3vh, 48px) clamp(12px, 1.5vw, 24px)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                transition: "all 0.2s ease",
                transform: isFocused ? "scale(1.05)" : "scale(1)",
                boxShadow: isFocused
                  ? `0 0 30px ${color}66, 0 0 60px ${color}33, inset 0 0 20px ${color}1a`
                  : "none",
              }}
            >
              {/* Mode icon */}
              <ModeIcon mode={mode} color={color} isFocused={isFocused} />

              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "clamp(22px, 2.5vw, 40px)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: isFocused ? color : "white",
                  textShadow: isFocused ? `0 0 15px ${color}` : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {MODE_LABELS[mode]}
              </div>
              <div
                style={{
                  fontFamily: "Roboto, sans-serif",
                  fontSize: "clamp(10px, 1.1vw, 16px)",
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                  lineHeight: 1.3,
                }}
              >
                {MODE_SUBTITLES[mode]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        style={{
          marginTop: "5vh",
          fontFamily: "Roboto, sans-serif",
          fontSize: "clamp(10px, 1vw, 14px)",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        <span className="dpad-hint">← → D-Pad &nbsp;|&nbsp; INVIO Seleziona &nbsp;|&nbsp; ESC Esci</span>
        <span className="touch-hint">Tocca una modalità per iniziare</span>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function ModeIcon({ mode, color, isFocused }: { mode: WorkoutMode; color: string; isFocused: boolean }) {
  const size = 52;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    filter: isFocused ? `drop-shadow(0 0 8px ${color})` : "none",
    transition: "filter 0.2s ease",
  };

  if (mode === "AMRAP") {
    return (
      <div style={style}>
        <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="22" stroke={isFocused ? color : "rgba(255,255,255,0.4)"} strokeWidth="3" strokeDasharray="6 4" />
          <path d="M26 12 L26 26 L36 36" stroke={isFocused ? color : "rgba(255,255,255,0.6)"} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="26" cy="26" r="3" fill={isFocused ? color : "rgba(255,255,255,0.6)"} />
        </svg>
      </div>
    );
  }
  if (mode === "FOR_TIME") {
    return (
      <div style={style}>
        <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
          <polygon points="14,8 42,26 14,44" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
        </svg>
      </div>
    );
  }
  if (mode === "EMOM") {
    return (
      <div style={style}>
        <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
          <rect x="8" y="16" width="10" height="24" rx="3" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
          <rect x="21" y="10" width="10" height="30" rx="3" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
          <rect x="34" y="20" width="10" height="20" rx="3" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
        </svg>
      </div>
    );
  }
  // TABATA
  return (
    <div style={style}>
      <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
        <rect x="8" y="8" width="16" height="16" rx="3" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
        <rect x="28" y="8" width="16" height="16" rx="3" fill={isFocused ? "rgba(255,136,0,0.8)" : "rgba(255,255,255,0.3)"} />
        <rect x="8" y="28" width="16" height="16" rx="3" fill={isFocused ? color : "rgba(255,255,255,0.5)"} />
        <rect x="28" y="28" width="16" height="16" rx="3" fill={isFocused ? "rgba(255,136,0,0.8)" : "rgba(255,255,255,0.3)"} />
      </svg>
    </div>
  );
}
