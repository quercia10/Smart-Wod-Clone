import { useEffect } from "react";
import { getTrialDaysLeft } from "@/lib/license";
import BackgroundLogo from "@/components/BackgroundLogo";

interface TrialBannerProps {
  onDone: () => void;
}

export default function TrialBanner({ onDone }: TrialBannerProps) {
  const daysLeft = getTrialDaysLeft();

  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

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
        gap: "3vh",
        fontFamily: "Inter, sans-serif",
        position: "relative",
      }}
    >
      <BackgroundLogo />

      <div style={{ fontSize: "clamp(18px, 2.5vw, 36px)", fontWeight: 700, letterSpacing: "0.06em", color: "#2ECC71", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
        SmartWOD Timer
      </div>

      <div
        style={{
          background: "rgba(230,126,34,0.08)",
          border: "2px solid rgba(230,126,34,0.4)",
          borderRadius: "14px",
          padding: "clamp(28px, 4vh, 56px) clamp(40px, 6vw, 100px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2vh",
          boxShadow: "0 0 40px rgba(230,126,34,0.15)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ filter: "drop-shadow(0 0 8px #E67E22)" }}>
          <circle cx="26" cy="26" r="22" stroke="#E67E22" strokeWidth="3" />
          <path d="M26 14 L26 28" stroke="#E67E22" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="26" cy="36" r="2.5" fill="#E67E22" />
        </svg>

        <div style={{ fontSize: "clamp(14px, 1.8vw, 26px)", fontWeight: 600, color: "#E67E22", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          PROVA ATTIVA
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(72px, 12vw, 160px)", fontWeight: 700, color: "#E67E22", lineHeight: 1 }}>
            {daysLeft}
          </span>
          <span style={{ fontSize: "clamp(20px, 2.5vw, 36px)", fontWeight: 300, color: "rgba(230,126,34,0.7)", letterSpacing: "0.1em" }}>
            {daysLeft === 1 ? "giorno" : "giorni"} rimanenti
          </span>
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(11px, 1.2vw, 16px)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginTop: "1vh" }}>
          Avvio in corso...
        </div>
      </div>

      <div style={{ width: "clamp(200px, 30vw, 400px)", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginTop: "2vh", position: "relative", zIndex: 1 }}>
        <div
          style={{
            height: "100%",
            background: "#E67E22",
            boxShadow: "0 0 8px #E67E22",
            animation: "fill-bar 3s linear forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes fill-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
