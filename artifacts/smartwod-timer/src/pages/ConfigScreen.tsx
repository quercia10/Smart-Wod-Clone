import { useState, useEffect, useCallback, useRef } from "react";
import { WorkoutMode, WorkoutConfig } from "@/lib/types";
import { resumeAudio } from "@/lib/sound";
import BackgroundLogo from "@/components/BackgroundLogo";

interface ConfigScreenProps {
  mode: WorkoutMode;
  onStart: (config: WorkoutConfig) => void;
  onBack: () => void;
}

type FieldDef = {
  key: string; label: string; unit: string;
  min: number; max: number; step: number; default: number;
};

const FIELDS: Record<WorkoutMode, FieldDef[]> = {
  AMRAP:    [{ key: "duration",       label: "Durata",              unit: "min",    min: 1,  max: 60,  step: 1,  default: 10 }],
  FOR_TIME: [{ key: "duration",       label: "Cap di Tempo",        unit: "min",    min: 1,  max: 90,  step: 1,  default: 20 }],
  EMOM: [
    { key: "duration",  label: "Durata intervallo",  unit: "min",   min: 1,  max: 2,   step: 1,  default: 1  },
    { key: "rounds",    label: "Numero Round",        unit: "round", min: 1,  max: 60,  step: 1,  default: 10 },
  ],
  TABATA: [
    { key: "rounds",         label: "Numero Serie",        unit: "serie",  min: 1,  max: 12,  step: 1,  default: 4  },
    { key: "setsPerRound",   label: "Esercizi per Serie",  unit: "eserc.", min: 1,  max: 8,   step: 1,  default: 2  },
    { key: "workTime",       label: "Tempo Lavoro",        unit: "sec",    min: 5,  max: 60,  step: 5,  default: 20 },
    { key: "restTime",       label: "Pausa Esercizio",     unit: "sec",    min: 1,  max: 60,  step: 1,  default: 10 },
    { key: "roundPauseTime", label: "Pausa Serie",         unit: "sec",    min: 10, max: 120, step: 10, default: 60 },
  ],
};

const MODE_COLORS: Record<WorkoutMode, string> = {
  AMRAP:    "#2ECC71",
  FOR_TIME: "#E67E22",
  EMOM:     "#3498DB",
  TABATA:   "#E74C3C",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function ConfigScreen({ mode, onStart, onBack }: ConfigScreenProps) {
  const fields = FIELDS[mode];
  const accent = MODE_COLORS[mode];

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    fields.forEach((f) => { init[f.key] = f.default; });
    return init;
  });

  const [focusedField, setFocusedField] = useState(0);
  const totalItems = fields.length + 1;
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const moveFocus = useCallback((index: number) => {
    setFocusedField(index);
    itemRefs.current[index]?.focus();
  }, []);

  useEffect(() => { itemRefs.current[0]?.focus(); }, []);

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

  const tabataTotalSeconds = mode === "TABATA"
    ? (values.rounds ?? 4) * (
        (values.setsPerRound ?? 2) * (values.workTime ?? 20)
        + (values.setsPerRound ?? 2) * (values.restTime ?? 10)
      )
      + ((values.rounds ?? 4) - 1) * (values.roundPauseTime ?? 60)
    : 0;

  function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m} min${sec > 0 ? ` ${sec} sec` : ""}`
      : `${sec} sec`;
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace") { onBack(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); moveFocus((focusedField - 1 + totalItems) % totalItems); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveFocus((focusedField + 1) % totalItems); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); if (focusedField < fields.length) changeValue(focusedField, -1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); if (focusedField < fields.length) changeValue(focusedField, 1); }
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedField === fields.length) { resumeAudio(); onStart(buildConfig()); }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedField, fields.length, totalItems, changeValue, buildConfig, onStart, onBack, moveFocus]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      <BackgroundLogo />
      {/* Mode title */}
      <div style={{ textAlign: "center", marginBottom: "4vh" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(28px, 4.5vw, 64px)", fontWeight: 700, color: accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {mode.replace("_", " ")}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px, 1.2vw, 17px)", color: "rgba(248,249,250,0.38)", letterSpacing: "0.18em", marginTop: "6px", textTransform: "uppercase" }}>
          Configura l'allenamento
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
                background: isFocused ? "#F8F9FA" : "#1E1E1E",
                border: `1px solid ${isFocused ? "transparent" : "rgba(255,255,255,0.10)"}`,
                borderRadius: "16px",
                padding: "clamp(12px, 1.8vh, 22px) clamp(18px, 2.5vw, 36px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.18s ease",
                boxShadow: isFocused ? "0 6px 24px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.2)",
                transform: isFocused ? "scale(1.02)" : "scale(1)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(15px, 1.8vw, 26px)", fontWeight: 500, color: isFocused ? "#121212" : "#F8F9FA", letterSpacing: "0.02em" }}>
                {field.label}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.2vw, 18px)" }}>
                {isFocused && <span className="dpad-hint" style={{ color: "rgba(18,18,18,0.35)", fontSize: "clamp(14px,1.8vw,24px)" }}>←</span>}

                <button
                  className="touch-stepper stepper-btn wod-btn"
                  style={{ background: isFocused ? "rgba(18,18,18,0.08)" : undefined, borderColor: isFocused ? "rgba(18,18,18,0.18)" : undefined, color: isFocused ? "#121212" : undefined }}
                  onClick={(e) => { e.stopPropagation(); setFocusedField(i); changeValue(i, -1); }}
                >−</button>

                <div style={{ display: "flex", alignItems: "baseline", gap: "7px", minWidth: "6ch", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(26px, 3.6vw, 52px)", fontWeight: 700, color: isFocused ? accent : "#F8F9FA", minWidth: "4ch", textAlign: "center", display: "inline-block", transition: "color 0.18s" }}>
                    {values[field.key]}
                  </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px, 1.1vw, 16px)", color: isFocused ? "rgba(18,18,18,0.5)" : "rgba(248,249,250,0.38)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {field.unit}
                  </span>
                </div>

                {isFocused && <span className="dpad-hint" style={{ color: "rgba(18,18,18,0.35)", fontSize: "clamp(14px,1.8vw,24px)" }}>→</span>}

                <button
                  className="touch-stepper stepper-btn wod-btn"
                  style={{ background: isFocused ? "rgba(18,18,18,0.08)" : undefined, borderColor: isFocused ? "rgba(18,18,18,0.18)" : undefined, color: isFocused ? "#121212" : undefined }}
                  onClick={(e) => { e.stopPropagation(); setFocusedField(i); changeValue(i, 1); }}
                >+</button>
              </div>
            </div>
          );
        })}

        {/* TABATA total time */}
        {mode === "TABATA" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: `rgba(${hexToRgb(accent)},0.07)`,
            border: `1px solid rgba(${hexToRgb(accent)},0.25)`,
            borderRadius: "14px",
            padding: "clamp(10px, 1.4vh, 18px) clamp(18px, 2.5vw, 36px)",
          }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(12px, 1.4vw, 20px)", fontWeight: 500, color: `rgba(${hexToRgb(accent)},0.75)`, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Tempo totale previsto
            </div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(20px, 2.6vw, 38px)", fontWeight: 700, color: accent, letterSpacing: "0.04em" }}>
              {fmtTime(tabataTotalSeconds)}
            </div>
          </div>
        )}

        {/* START button */}
        <button
          ref={(el) => { itemRefs.current[fields.length] = el; }}
          data-testid="btn-start"
          tabIndex={0}
          className="wod-btn"
          onClick={() => { resumeAudio(); onStart(buildConfig()); }}
          onFocus={() => setFocusedField(fields.length)}
          style={{
            marginTop: "clamp(6px, 1.2vh, 16px)",
            background: focusedField === fields.length ? accent : "#1E1E1E",
            border: `1px solid ${focusedField === fields.length ? "transparent" : `rgba(${hexToRgb(accent)},0.45)`}`,
            borderRadius: "20px",
            padding: "clamp(13px, 2.2vh, 26px)",
            fontFamily: "Inter, sans-serif",
            fontSize: "clamp(17px, 2.2vw, 32px)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: focusedField === fields.length ? "#121212" : accent,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow: focusedField === fields.length ? "0 8px 28px rgba(0,0,0,0.45)" : "0 1px 4px rgba(0,0,0,0.2)",
            transform: focusedField === fields.length ? "scale(1.03)" : "scale(1)",
          }}
        >
          INIZIA
        </button>
      </div>

      {/* Back hint */}
      <div style={{ marginTop: "3.5vh", fontFamily: "Inter, sans-serif", fontSize: "clamp(10px, 0.9vw, 13px)", color: "rgba(248,249,250,0.18)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        <span className="dpad-hint">ESC Indietro &nbsp;·&nbsp; ↑↓ Naviga &nbsp;·&nbsp; ←→ Modifica</span>
        <span className="touch-hint">Tocca +− per modificare &nbsp;·&nbsp; INIZIA per partire</span>
      </div>
    </div>
  );
}
