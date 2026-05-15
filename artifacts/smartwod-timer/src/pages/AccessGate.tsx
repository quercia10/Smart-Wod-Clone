import { useState, useEffect, useCallback } from "react";

const SECRET_CODE = "060792";
const CODE_LENGTH = SECRET_CODE.length;

interface AccessGateProps {
  onUnlock: () => void;
}

export default function AccessGate({ onUnlock }: AccessGateProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const addDigit = useCallback((d: string) => {
    setDigits((prev) => {
      if (prev.length >= CODE_LENGTH) return prev;
      return [...prev, d];
    });
  }, []);

  const removeDigit = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setDigits([]);
  }, []);

  const submit = useCallback((code: string[]) => {
    const entered = code.join("");
    if (entered === SECRET_CODE) {
      setSuccess(true);
      setTimeout(() => {
        localStorage.setItem("smartwod_activated", "true");
        onUnlock();
      }, 900);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits([]);
      }, 600);
    }
  }, [onUnlock]);

  // Auto-submit when code is fully entered
  useEffect(() => {
    if (digits.length === CODE_LENGTH) {
      submit(digits);
    }
  }, [digits, submit]);

  // Physical keyboard / remote number keys
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        addDigit(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        removeDigit();
      } else if (e.key === "Escape") {
        clearAll();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [addDigit, removeDigit, clearAll]);

  const filled = digits.length;

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
        gap: 0,
        fontFamily: "Oswald, sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: "clamp(18px, 2.5vw, 36px)",
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: "#00ff66",
          textShadow: "0 0 20px #00ff66, 0 0 40px #00ff66",
          marginBottom: "6vh",
          textTransform: "uppercase",
        }}
      >
        SmartWOD Timer
      </div>

      {/* Card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "2px solid rgba(0,255,102,0.25)",
          borderRadius: "16px",
          padding: "clamp(32px, 5vh, 60px) clamp(32px, 6vw, 80px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(20px, 3vh, 36px)",
          minWidth: "clamp(320px, 50vw, 680px)",
          boxShadow: "0 0 40px rgba(0,255,102,0.08)",
          animation: shake ? "shake 0.5s ease" : success ? "glow-pulse 0.9s ease" : "none",
        }}
      >
        {/* Lock icon */}
        <svg
          width="52"
          height="52"
          viewBox="0 0 52 52"
          fill="none"
          style={{ filter: "drop-shadow(0 0 8px #00ff66)", opacity: success ? 1 : 0.8 }}
        >
          <rect
            x="10"
            y="24"
            width="32"
            height="22"
            rx="5"
            fill={success ? "#00ff66" : "none"}
            stroke="#00ff66"
            strokeWidth="3"
            style={{ transition: "fill 0.3s ease" }}
          />
          <path
            d="M17 24V18a9 9 0 0 1 18 0v6"
            stroke="#00ff66"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="26"
            cy="35"
            r="3"
            fill={success ? "#000" : "#00ff66"}
            style={{ transition: "fill 0.3s ease" }}
          />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: "clamp(16px, 2vw, 28px)",
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.15em",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          Attivazione Richiesta
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: "Roboto, sans-serif",
            fontSize: "clamp(12px, 1.2vw, 17px)",
            color: "rgba(255,255,255,0.38)",
            textAlign: "center",
            letterSpacing: "0.05em",
            lineHeight: 1.5,
            maxWidth: "420px",
          }}
        >
          Inserisci il codice fornito dal produttore
        </div>

        {/* Dot indicators */}
        <div
          style={{
            display: "flex",
            gap: "clamp(14px, 2vw, 24px)",
            alignItems: "center",
            padding: "12px 24px",
            background: "rgba(0,0,0,0.4)",
            border: `2px solid ${shake ? "#ff3333" : success ? "#00ff66" : "rgba(0,255,102,0.3)"}`,
            borderRadius: "10px",
            boxShadow: success
              ? "0 0 25px #00ff66, inset 0 0 20px rgba(0,255,102,0.1)"
              : shake
              ? "0 0 20px #ff3333"
              : "none",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "clamp(14px, 2vw, 22px)",
                height: "clamp(14px, 2vw, 22px)",
                borderRadius: "50%",
                background: i < filled
                  ? success ? "#00ff66" : shake ? "#ff3333" : "#00ff66"
                  : "rgba(255,255,255,0.12)",
                boxShadow: i < filled && !shake
                  ? "0 0 10px #00ff66"
                  : "none",
                transition: "background 0.15s ease, box-shadow 0.15s ease",
              }}
            />
          ))}
        </div>

        {/* Error / success message */}
        <div
          style={{
            fontFamily: "Roboto, sans-serif",
            fontSize: "clamp(11px, 1.1vw, 15px)",
            color: shake ? "#ff3333" : success ? "#00ff66" : "transparent",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            textShadow: shake ? "0 0 8px #ff3333" : success ? "0 0 8px #00ff66" : "none",
            height: "1.2em",
            transition: "color 0.2s ease",
          }}
        >
          {shake ? "Codice errato. Riprova." : success ? "Codice corretto. Accesso consentito." : " "}
        </div>

        {/* On-screen numpad */}
        <NumPad onDigit={addDigit} onDelete={removeDigit} disabled={success} />
      </div>

      {/* Hint */}
      <div
        style={{
          marginTop: "5vh",
          fontFamily: "Roboto, sans-serif",
          fontSize: "clamp(10px, 1vw, 13px)",
          color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Usa il telecomando o i tasti numerici
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(10px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(0,255,102,0.08); }
          50% { box-shadow: 0 0 60px rgba(0,255,102,0.4), 0 0 100px rgba(0,255,102,0.2); }
        }
      `}</style>
    </div>
  );
}

interface NumPadProps {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled: boolean;
}

function NumPad({ onDigit, onDelete, disabled }: NumPadProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  // D-Pad navigation among numpad keys
  // Layout: 1 2 3 / 4 5 6 / 7 8 9 / _ 0 ←
  const layout = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "⌫"],
  ];

  const allKeys = layout.flat().filter((k) => k !== "");

  useEffect(() => {
    if (disabled) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        setFocusedKey(e.key);
        setTimeout(() => setFocusedKey(null), 150);
      } else if (e.key === "Backspace") {
        setFocusedKey("⌫");
        setTimeout(() => setFocusedKey(null), 150);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [disabled]);

  const btnSize = "clamp(56px, 7vw, 96px)";
  const fontSize = "clamp(22px, 2.8vw, 42px)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "clamp(10px, 1.5vw, 18px)",
        marginTop: "0.5vh",
      }}
    >
      {layout.flat().map((key, i) => {
        if (key === "") {
          return <div key={`empty-${i}`} />;
        }
        const isDelete = key === "⌫";
        const isFocused = focusedKey === key;

        return (
          <button
            key={key}
            data-testid={`numpad-${isDelete ? "delete" : key}`}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (isDelete) onDelete();
              else onDigit(key);
            }}
            style={{
              width: btnSize,
              height: btnSize,
              background: isFocused
                ? "rgba(0,255,102,0.25)"
                : "rgba(255,255,255,0.05)",
              border: `2px solid ${isFocused ? "#00ff66" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "10px",
              fontFamily: isDelete ? "Roboto, sans-serif" : "Oswald, sans-serif",
              fontSize: isDelete ? "clamp(18px, 2.2vw, 32px)" : fontSize,
              fontWeight: 600,
              color: isFocused ? "#00ff66" : isDelete ? "rgba(255,255,255,0.55)" : "white",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isFocused ? "0 0 20px rgba(0,255,102,0.5)" : "none",
              transform: isFocused ? "scale(1.08)" : "scale(1)",
              transition: "all 0.12s ease",
              outline: "none",
            }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
