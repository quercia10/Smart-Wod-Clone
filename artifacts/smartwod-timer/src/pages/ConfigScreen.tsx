import { useState, useEffect, useCallback, useRef } from "react";
import { WorkoutMode, WorkoutConfig } from "@/lib/types";
import { resumeAudio } from "@/lib/sound";

interface ConfigScreenProps {
  mode: WorkoutMode;
  onStart: (config: WorkoutConfig) => void;
  onBack: () => void;
}

type FieldDef = {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

const FIELDS: Record<WorkoutMode, FieldDef[]> = {
  AMRAP: [
    { key: "duration", label: "Durata", unit: "min", min: 1, max: 60, step: 1, default: 10 },
  ],
  FOR_TIME: [
    { key: "duration", label: "Cap di Tempo", unit: "min", min: 1, max: 90, step: 1, default: 20 },
  ],
  EMOM: [
    { key: "duration", label: "Durata intervallo", unit: "min", min: 1, max: 2, step: 1, default: 1 },
    { key: "rounds", label: "Numero Round", unit: "round", min: 1, max: 60, step: 1, default: 10 },
  ],
  TABATA: [
    { key: "rounds", label: "Numero Serie", unit: "serie", min: 1, max: 12, step: 1, default: 4 },
    { key: "setsPerRound", label: "Esercizi per Serie", unit: "eserc.", min: 1, max: 8, step: 1, default: 2 },
    { key: "workTime", label: "Tempo Lavoro", unit: "sec", min: 5, max: 60, step: 5, default: 20 },
    { key: "restTime", label: "Recupero Esercizio", unit: "sec", min: 5, max: 60, step: 5, default: 10 },
    { key: "roundPauseTime", label: "Pausa Serie", unit: "sec", min: 10, max: 120, step: 10, default: 60 },
  ],
};

const MODE_COLOR: Record<WorkoutMode, string> = {
  AMRAP: "#00ff66",
  FOR_TIME: "#ff8800",
  EMOM: "#00ff66",
  TABATA: "#ff3333",
};

export default function ConfigScreen({ mode, onStart, onBack }: ConfigScreenProps) {
  const fields = FIELDS[mode];
  const color = MODE_COLOR[mode];

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    fields.forEach((f) => { init[f.key] = f.default; });
    return init;
  });

  const [focusedField, setFocusedField] = useState(0);
  // focusedField: 0..fields.length-1 = config rows, fields.length = START button

  const totalItems = fields.length + 1; // +1 for START button

  // Refs: indices 0..fields.length-1 are field rows, fields.length is START button
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const moveFocus = useCallback((index: number) => {
    setFocusedField(index);
    itemRefs.current[index]?.focus();
  }, []);

  // Auto-focus first item on mount
  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  const changeValue = useCallback((fieldIndex: number, delta: number) => {
    const field = fields[fieldIndex];
    if (!field) return;
    setValues((prev) => {
      const next = prev[field.key] + delta * field.step;
      return { ...prev, [field.key]: Math.max(field.min, Math.min(field.max, next)) };
    });
  }, [fields]);

  const buildConfig = useCallback((): WorkoutConfig => {
    const cfg: WorkoutConfig = { mode };
    if (values.duration != null) cfg.duration = values.duration * 60;
    if (values.rounds != null) cfg.rounds = values.rounds;
    if (values.setsPerRound != null) cfg.setsPerRound = values.setsPerRound;
    if (values.workTime != null) cfg.workTime = values.workTime;
    if (values.restTime != null) cfg.restTime = values.restTime;
    if (values.roundPauseTime != null) cfg.roundPauseTime = values.roundPauseTime;
    return cfg;
  }, [mode, values]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace") {
        onBack();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus((focusedField - 1 + totalItems) % totalItems);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus((focusedField + 1) % totalItems);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (focusedField < fields.length) changeValue(focusedField, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (focusedField < fields.length) changeValue(focusedField, 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedField === fields.length) {
          resumeAudio();
          onStart(buildConfig());
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedField, fields.length, totalItems, changeValue, buildConfig, onStart, onBack, moveFocus]);

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
      {/* Mode title */}
      <div style={{ textAlign: "center", marginBottom: "5vh" }}>
        <div
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: "clamp(32px, 5vw, 72px)",
            fontWeight: 700,
            color,
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            letterSpacing: "0.2em",
          }}
        >
          {mode.replace("_", " ")}
        </div>
        <div
          style={{
            fontFamily: "Roboto, sans-serif",
            fontSize: "clamp(12px, 1.5vw, 20px)",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.2em",
            marginTop: "0.5vh",
          }}
        >
          CONFIGURA L'ALLENAMENTO
        </div>
      </div>

      {/* Fields */}
      <div className="config-fields">
        {fields.map((field, i) => {
          const isFocused = focusedField === i;
          return (
            <div
              key={field.key}
              ref={(el) => { itemRefs.current[i] = el; }}
              data-testid={`config-field-${field.key}`}
              tabIndex={0}
              onClick={() => moveFocus(i)}
              onFocus={() => setFocusedField(i)}
              style={{
                background: isFocused ? `rgba(${hexToRgb(color)}, 0.1)` : "rgba(255,255,255,0.03)",
                border: `2px solid ${isFocused ? color : "rgba(255,255,255,0.1)"}`,
                borderRadius: "10px",
                padding: "clamp(12px, 2vh, 24px) clamp(20px, 3vw, 40px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                boxShadow: isFocused ? `0 0 20px ${color}44` : "none",
                outline: "none",
              }}
            >
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "clamp(18px, 2vw, 30px)",
                  color: isFocused ? "white" : "rgba(255,255,255,0.7)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                }}
              >
                {field.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.2vw, 20px)" }}>
                {isFocused && (
                  <span className="dpad-hint" style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(16px, 2vw, 28px)" }}>←</span>
                )}
                <button
                  className="touch-stepper stepper-btn wod-btn"
                  style={{ borderColor: isFocused ? `${color}66` : undefined }}
                  onClick={(e) => { e.stopPropagation(); setFocusedField(i); changeValue(i, -1); }}
                >−</button>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", minWidth: "6ch", justifyContent: "center" }}>
                  <span
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "clamp(28px, 4vw, 56px)",
                      fontWeight: 700,
                      color: isFocused ? color : "white",
                      textShadow: isFocused ? `0 0 15px ${color}` : "none",
                      minWidth: "4ch",
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {values[field.key]}
                  </span>
                  <span
                    style={{
                      fontFamily: "Roboto, sans-serif",
                      fontSize: "clamp(12px, 1.2vw, 18px)",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {field.unit}
                  </span>
                </div>
                {isFocused && (
                  <span className="dpad-hint" style={{ color: "rgba(255,255,255,0.3)", fontSize: "clamp(16px, 2vw, 28px)" }}>→</span>
                )}
                <button
                  className="touch-stepper stepper-btn wod-btn"
                  style={{ borderColor: isFocused ? `${color}66` : undefined }}
                  onClick={(e) => { e.stopPropagation(); setFocusedField(i); changeValue(i, 1); }}
                >+</button>
              </div>
            </div>
          );
        })}

        {/* START button */}
        <button
          ref={(el) => { itemRefs.current[fields.length] = el; }}
          data-testid="btn-start"
          tabIndex={0}
          className="wod-btn"
          onClick={() => { resumeAudio(); onStart(buildConfig()); }}
          onFocus={() => setFocusedField(fields.length)}
          style={{
            marginTop: "clamp(8px, 1.5vh, 20px)",
            background: focusedField === fields.length ? color : "transparent",
            border: `3px solid ${color}`,
            borderRadius: "10px",
            padding: "clamp(14px, 2.5vh, 28px)",
            fontFamily: "Oswald, sans-serif",
            fontSize: "clamp(20px, 2.5vw, 36px)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: focusedField === fields.length ? "#000" : color,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: focusedField === fields.length
              ? `0 0 30px ${color}, 0 0 60px ${color}66`
              : `0 0 10px ${color}44`,
            transform: focusedField === fields.length ? "scale(1.03)" : "scale(1)",
          }}
        >
          INIZIA
        </button>
      </div>

      {/* Back hint */}
      <div
        style={{
          marginTop: "4vh",
          fontFamily: "Roboto, sans-serif",
          fontSize: "clamp(10px, 1vw, 14px)",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        <span className="dpad-hint">ESC ← Indietro &nbsp;|&nbsp; ↑ ↓ Naviga &nbsp;|&nbsp; ← → Modifica</span>
        <span className="touch-hint">Tocca + − per modificare &nbsp;|&nbsp; INIZIA per partire</span>
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
