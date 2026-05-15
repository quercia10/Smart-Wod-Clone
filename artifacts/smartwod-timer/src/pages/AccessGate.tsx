import { useState, useEffect, useCallback, useRef } from "react";
import { tryActivate, ActivateResult } from "@/lib/license";

const CODE_LENGTH = 6;

type GateMode = "normal" | "expired";

interface AccessGateProps {
  mode: GateMode;
  onUnlock: (type: "trial" | "lifetime") => void;
}

type InputState = "idle" | "wrong" | "wrong-expired" | "success-trial" | "success-lifetime";

export default function AccessGate({ mode, onUnlock }: AccessGateProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [inputState, setInputState] = useState<InputState>("idle");

  const addDigit = useCallback((d: string) => {
    setDigits((prev) => {
      if (prev.length >= CODE_LENGTH) return prev;
      return [...prev, d];
    });
  }, []);

  const removeDigit = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => setDigits([]), []);

  const submit = useCallback((code: string[]) => {
    const entered = code.join("");
    const result: ActivateResult = tryActivate(entered);

    if (result === "lifetime-ok") {
      setInputState("success-lifetime");
      setTimeout(() => onUnlock("lifetime"), 1200);
      return;
    }
    if (result === "trial-ok") {
      setInputState("success-trial");
      setTimeout(() => onUnlock("trial"), 1200);
      return;
    }
    if (result === "trial-expired-rejected") {
      setInputState("wrong-expired");
      setTimeout(() => { setInputState("idle"); setDigits([]); }, 2000);
      return;
    }
    setInputState("wrong");
    setTimeout(() => { setInputState("idle"); setDigits([]); }, 900);
  }, [onUnlock]);

  useEffect(() => {
    if (digits.length === CODE_LENGTH) submit(digits);
  }, [digits, submit]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputState === "success-trial" || inputState === "success-lifetime") return;
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace" || e.key === "Delete") removeDigit();
      else if (e.key === "Escape") clearAll();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [addDigit, removeDigit, clearAll, inputState]);

  const isSuccess = inputState === "success-trial" || inputState === "success-lifetime";
  const isWrong   = inputState === "wrong" || inputState === "wrong-expired";
  const filled    = digits.length;

  const dotColor    = isSuccess ? "#2ECC71" : isWrong ? "#E74C3C" : "#2ECC71";
  const borderColor = isSuccess ? "#2ECC71" : isWrong ? "#E74C3C" : "rgba(255,255,255,0.10)";

  function getMessage(): { text: string; color: string } | null {
    if (inputState === "wrong")          return { text: "Codice errato. Riprova.",                                          color: "#E74C3C" };
    if (inputState === "wrong-expired")  return { text: "Codice di prova non più valido su questo dispositivo.",             color: "#E67E22" };
    if (inputState === "success-trial")  return { text: "Versione di prova attivata. Buon allenamento!",                    color: "#2ECC71" };
    if (inputState === "success-lifetime") return { text: "Attivazione completata. Accesso Lifetime!",                      color: "#2ECC71" };
    return null;
  }

  const msg = getMessage();

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

      {/* App title */}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(18px,2.5vw,36px)", fontWeight: 700, letterSpacing: "0.06em", color: "#F8F9FA", marginBottom: "4vh", textTransform: "uppercase" }}>
        SmartWOD Timer
      </div>

      {/* Card */}
      <div
        style={{
          background: "#1E1E1E",
          border: `1px solid ${borderColor}`,
          borderRadius: "20px",
          padding: "clamp(28px, 4vh, 52px) clamp(28px, 5vw, 72px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(16px, 2.5vh, 26px)",
          minWidth: "clamp(300px, 46vw, 620px)",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          animation: isWrong ? "shake 0.5s ease" : "none",
          transition: "border-color 0.2s ease",
        }}
      >
        {/* Icon */}
        <LockIcon unlocked={isSuccess} expired={mode === "expired" && !isSuccess} />

        {/* Title */}
        {mode === "expired" && !isSuccess ? (
          <>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(16px,2vw,28px)", fontWeight: 700, color: "#E74C3C", letterSpacing: "0.04em", textAlign: "center" }}>
              Versione di prova scaduta
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px,1.1vw,15px)", fontWeight: 400, color: "rgba(248,249,250,0.42)", textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.55, maxWidth: "360px" }}>
              La tua prova di 7 giorni è terminata.<br />Inserisci il codice Lifetime per continuare.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(15px,1.8vw,26px)", fontWeight: 600, color: "#F8F9FA", letterSpacing: "0.03em", textAlign: "center" }}>
              Attivazione richiesta
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px,1vw,15px)", fontWeight: 400, color: "rgba(248,249,250,0.38)", textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.55, maxWidth: "360px" }}>
              Inserisci il codice fornito dal produttore
            </div>
          </>
        )}

        {/* Dot row */}
        <div style={{
          display: "flex",
          gap: "clamp(12px, 1.8vw, 20px)",
          alignItems: "center",
          padding: "10px 22px",
          background: "rgba(0,0,0,0.35)",
          border: `1px solid ${isSuccess || isWrong ? borderColor : "rgba(255,255,255,0.08)"}`,
          borderRadius: "12px",
          transition: "border-color 0.2s ease",
        }}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <div key={i} style={{
              width: "clamp(13px, 1.7vw, 19px)",
              height: "clamp(13px, 1.7vw, 19px)",
              borderRadius: "50%",
              background: i < filled ? dotColor : "rgba(255,255,255,0.10)",
              transition: "background 0.12s ease",
            }} />
          ))}
        </div>

        {/* Message */}
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(11px, 1vw, 14px)",
          fontWeight: 500,
          color: msg ? msg.color : "transparent",
          letterSpacing: "0.04em",
          textAlign: "center",
          minHeight: "1.4em",
          transition: "color 0.2s ease",
        }}>
          {msg ? msg.text : "\u00A0"}
        </div>

        {/* Numpad */}
        <NumPad onDigit={addDigit} onDelete={removeDigit} disabled={isSuccess} activeDigit={null} />
      </div>

      {/* Footer */}
      <div style={{ marginTop: "4vh", fontFamily: "Inter, sans-serif", fontSize: "clamp(10px,0.9vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.18)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        Usa il telecomando o i tasti numerici
      </div>
    </div>
  );
}

function LockIcon({ unlocked, expired }: { unlocked: boolean; expired: boolean }) {
  const color = unlocked ? "#2ECC71" : expired ? "#E74C3C" : "#2ECC71";
  return (
    <svg width="44" height="44" viewBox="0 0 52 52" fill="none">
      <rect x="10" y="24" width="32" height="22" rx="5" fill={unlocked ? color : "none"} stroke={color} strokeWidth="2.5" style={{ transition: "fill 0.3s" }} />
      {expired ? (
        <path d="M17 24V16a9 9 0 0 1 18 0" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
      ) : (
        <path d="M17 24V18a9 9 0 0 1 18 0v6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      )}
      <circle cx="26" cy="35" r="3" fill={unlocked ? "#1E1E1E" : color} style={{ transition: "fill 0.3s" }} />
    </svg>
  );
}

function NumPad({ onDigit, onDelete, disabled }: { onDigit: (d: string) => void; onDelete: () => void; disabled: boolean; activeDigit: string | null }) {
  const [flash, setFlash] = useState<string | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const layout = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]];
  const flatKeys = layout.flat();
  const COLS = 3;
  const ROWS = 4;

  useEffect(() => {
    if (disabled) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { setFlash(e.key); setTimeout(() => setFlash(null), 130); }
      else if (e.key === "Backspace") { setFlash("⌫"); setTimeout(() => setFlash(null), 130); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [disabled]);

  function getNeighbor(currentIdx: number, direction: string): number | null {
    const row = Math.floor(currentIdx / COLS);
    const col = currentIdx % COLS;
    let newRow = row, newCol = col;
    if (direction === "ArrowUp") newRow--;
    else if (direction === "ArrowDown") newRow++;
    else if (direction === "ArrowLeft") newCol--;
    else if (direction === "ArrowRight") newCol++;
    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return null;
    const newIdx = newRow * COLS + newCol;
    if (flatKeys[newIdx] === "") return null;
    return newIdx;
  }

  function handleButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!arrows.includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const neighbor = getNeighbor(idx, e.key);
    if (neighbor !== null) btnRefs.current[neighbor]?.focus();
  }

  const btnSize = "clamp(54px, 6.5vw, 86px)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px, 1.2vw, 14px)" }}>
      {flatKeys.map((key, i) => {
        if (key === "") return <div key={`e${i}`} />;
        const isDelete  = key === "⌫";
        const isFocused = flash === key;
        return (
          <button
            key={key}
            ref={(el) => { btnRefs.current[i] = el; }}
            data-testid={`numpad-${isDelete ? "delete" : key}`}
            disabled={disabled}
            tabIndex={0}
            className="numpad-btn"
            onClick={() => { if (disabled) return; isDelete ? onDelete() : onDigit(key); }}
            onKeyDown={(e) => handleButtonKeyDown(e, i)}
            style={{
              width: btnSize, height: btnSize,
              background: isFocused ? "#F8F9FA" : "rgba(255,255,255,0.06)",
              border: `1px solid ${isFocused ? "transparent" : "rgba(255,255,255,0.10)"}`,
              borderRadius: "12px",
              fontFamily: isDelete ? "Inter, sans-serif" : "Oswald, sans-serif",
              fontSize: isDelete ? "clamp(16px, 2vw, 26px)" : "clamp(20px, 2.5vw,36px)",
              fontWeight: 600,
              color: isFocused ? "#121212" : isDelete ? "rgba(248,249,250,0.48)" : "#F8F9FA",
              cursor: disabled ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: isFocused ? "scale(1.06)" : "scale(1)",
              transition: "all 0.12s ease",
              outline: "none",
            }}
          >{key}</button>
        );
      })}
    </div>
  );
}
