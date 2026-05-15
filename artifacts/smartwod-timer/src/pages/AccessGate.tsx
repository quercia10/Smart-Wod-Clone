import { useState, useEffect, useCallback } from "react";
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
    // wrong
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
  const isWrong = inputState === "wrong" || inputState === "wrong-expired";
  const filled = digits.length;

  const dotColor = isSuccess ? "#00ff66" : isWrong ? "#ff3333" : "#00ff66";
  const borderColor = isSuccess ? "#00ff66" : isWrong ? "#ff3333" : "rgba(0,255,102,0.3)";

  function getMessage(): { text: string; color: string } | null {
    if (inputState === "wrong") return { text: "Codice Errato. Riprova.", color: "#ff3333" };
    if (inputState === "wrong-expired") return { text: "Codice di prova non più valido su questo dispositivo.", color: "#ff8800" };
    if (inputState === "success-trial") return { text: "Versione di Prova Attivata. Buon allenamento!", color: "#00ff66" };
    if (inputState === "success-lifetime") return { text: "Attivazione Completata. Accesso Lifetime!", color: "#00ff66" };
    return null;
  }

  const msg = getMessage();

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Oswald, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: "clamp(18px, 2.5vw, 36px)", fontWeight: 700, letterSpacing: "0.3em", color: "#00ff66", textShadow: "0 0 20px #00ff66, 0 0 40px #00ff66", marginBottom: "4vh", textTransform: "uppercase" }}>
        SmartWOD Timer
      </div>

      {/* Card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `2px solid ${isSuccess ? "#00ff66" : mode === "expired" ? "rgba(255,51,51,0.3)" : "rgba(0,255,102,0.2)"}`,
          borderRadius: "16px",
          padding: "clamp(28px, 4vh, 52px) clamp(28px, 5vw, 72px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(16px, 2.5vh, 28px)",
          minWidth: "clamp(300px, 48vw, 660px)",
          boxShadow: isSuccess
            ? "0 0 50px rgba(0,255,102,0.25)"
            : mode === "expired"
            ? "0 0 40px rgba(255,51,51,0.1)"
            : "0 0 40px rgba(0,255,102,0.06)",
          animation: isWrong ? "shake 0.5s ease" : "none",
        }}
      >
        {/* Icon */}
        <LockIcon unlocked={isSuccess} expired={mode === "expired" && !isSuccess} />

        {/* Title */}
        {mode === "expired" && !isSuccess ? (
          <>
            <div style={{ fontSize: "clamp(18px, 2.2vw, 32px)", fontWeight: 700, color: "#ff3333", letterSpacing: "0.2em", textAlign: "center", textShadow: "0 0 15px #ff3333" }}>
              VERSIONE DI PROVA SCADUTA
            </div>
            <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(11px, 1.2vw, 16px)", color: "rgba(255,255,255,0.45)", textAlign: "center", letterSpacing: "0.05em", lineHeight: 1.5, maxWidth: "380px" }}>
              La tua prova di 7 giorni è terminata.<br />Inserisci il codice Lifetime per continuare.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "clamp(16px, 2vw, 28px)", fontWeight: 500, color: "rgba(255,255,255,0.85)", letterSpacing: "0.15em", textAlign: "center", textTransform: "uppercase" }}>
              Attivazione Richiesta
            </div>
            <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(11px, 1.1vw, 16px)", color: "rgba(255,255,255,0.38)", textAlign: "center", letterSpacing: "0.04em", lineHeight: 1.5, maxWidth: "380px" }}>
              Inserisci il codice fornito dal produttore
            </div>
          </>
        )}

        {/* Dot row */}
        <div style={{
          display: "flex",
          gap: "clamp(12px, 1.8vw, 22px)",
          alignItems: "center",
          padding: "10px 22px",
          background: "rgba(0,0,0,0.4)",
          border: `2px solid ${borderColor}`,
          borderRadius: "10px",
          boxShadow: isSuccess ? `0 0 25px ${dotColor}` : isWrong ? `0 0 20px ${dotColor}` : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <div key={i} style={{
              width: "clamp(13px, 1.8vw, 20px)",
              height: "clamp(13px, 1.8vw, 20px)",
              borderRadius: "50%",
              background: i < filled ? dotColor : "rgba(255,255,255,0.12)",
              boxShadow: i < filled && !isWrong ? `0 0 8px ${dotColor}` : "none",
              transition: "background 0.12s, box-shadow 0.12s",
            }} />
          ))}
        </div>

        {/* Message */}
        <div style={{
          fontFamily: "Roboto, sans-serif",
          fontSize: "clamp(11px, 1.1vw, 15px)",
          color: msg ? msg.color : "transparent",
          letterSpacing: "0.12em",
          textShadow: msg ? `0 0 8px ${msg.color}` : "none",
          textAlign: "center",
          minHeight: "1.4em",
          transition: "color 0.2s",
        }}>
          {msg ? msg.text : " "}
        </div>

        {/* Numpad */}
        <NumPad onDigit={addDigit} onDelete={removeDigit} disabled={isSuccess} activeDigit={null} />
      </div>

      {/* Footer */}
      <div style={{ marginTop: "4vh", fontFamily: "Roboto, sans-serif", fontSize: "clamp(10px, 1vw, 13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Usa il telecomando o i tasti numerici
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(10px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

function LockIcon({ unlocked, expired }: { unlocked: boolean; expired: boolean }) {
  const color = unlocked ? "#00ff66" : expired ? "#ff3333" : "#00ff66";
  return (
    <svg width="48" height="48" viewBox="0 0 52 52" fill="none" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
      <rect x="10" y="24" width="32" height="22" rx="5" fill={unlocked ? color : "none"} stroke={color} strokeWidth="3" style={{ transition: "fill 0.3s" }} />
      {expired ? (
        <path d="M17 24V16a9 9 0 0 1 18 0" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="4 3" />
      ) : (
        <path d="M17 24V18a9 9 0 0 1 18 0v6" stroke={color} strokeWidth="3" strokeLinecap="round" />
      )}
      <circle cx="26" cy="35" r="3" fill={unlocked ? "#000" : color} style={{ transition: "fill 0.3s" }} />
    </svg>
  );
}

function NumPad({ onDigit, onDelete, disabled }: { onDigit: (d: string) => void; onDelete: () => void; disabled: boolean; activeDigit: string | null }) {
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { setFlash(e.key); setTimeout(() => setFlash(null), 130); }
      else if (e.key === "Backspace") { setFlash("⌫"); setTimeout(() => setFlash(null), 130); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [disabled]);

  const layout = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]];
  const btnSize = "clamp(54px, 6.5vw, 90px)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px, 1.2vw, 16px)" }}>
      {layout.flat().map((key, i) => {
        if (key === "") return <div key={`e${i}`} />;
        const isDelete = key === "⌫";
        const isFocused = flash === key;
        return (
          <button key={key} data-testid={`numpad-${isDelete ? "delete" : key}`} disabled={disabled}
            onClick={() => { if (disabled) return; isDelete ? onDelete() : onDigit(key); }}
            style={{
              width: btnSize, height: btnSize,
              background: isFocused ? "rgba(0,255,102,0.22)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${isFocused ? "#00ff66" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "10px",
              fontFamily: isDelete ? "Roboto, sans-serif" : "Oswald, sans-serif",
              fontSize: isDelete ? "clamp(16px, 2vw, 28px)" : "clamp(20px, 2.6vw, 38px)",
              fontWeight: 600,
              color: isFocused ? "#00ff66" : isDelete ? "rgba(255,255,255,0.5)" : "white",
              cursor: disabled ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isFocused ? "0 0 18px rgba(0,255,102,0.45)" : "none",
              transform: isFocused ? "scale(1.08)" : "scale(1)",
              transition: "all 0.1s ease",
              outline: "none",
            }}>{key}</button>
        );
      })}
    </div>
  );
}
