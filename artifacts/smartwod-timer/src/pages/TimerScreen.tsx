import { useState, useEffect, useRef, useCallback } from "react";
import BackgroundLogo from "@/components/BackgroundLogo";
import ProgressCircle from "@/components/ProgressCircle";
import SegmentedRing from "@/components/SegmentedRing";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";
import { getRandomFrase } from "@/lib/frasi";
import {
  playBeep,
  playCountdownBeep,
  playTripleBeep,
  playStartBuzzer,
  playEndBuzzer,
  playFanfare,
  playRestBeep,
  keepAwake,
  releaseAwake,
} from "@/lib/sound";

interface TimerScreenProps {
  config: WorkoutConfig;
  onBack: () => void;
}

type Phase = "countdown" | "running" | "rest" | "round-pause" | "done";

interface TimerState {
  phase: Phase;
  timeLeft: number;
  totalTime: number;
  currentRound: number;
  totalRounds: number;
  currentSet: number;
  setsPerRound: number;
  elapsedForTime: number;
  roundCount: number;
  countdownNum: number;
  paused: boolean;
  phrase: string;
}

/* ── colors ── */
const WORK_COLOR  = "#2ECC71";
const REST_COLOR  = "#E67E22";
const PAUSE_COLOR = "#3498DB";
const DONE_COLOR  = "#2ECC71";

const MODE_COLOR: Record<WorkoutMode, string> = {
  AMRAP:    "#2ECC71",
  FOR_TIME: "#E67E22",
  EMOM:     "#3498DB",
  TABATA:   "#E74C3C",
};

function phaseColor(phase: Phase, mode: WorkoutMode): string {
  if (phase === "countdown")   return "#E67E22";
  if (phase === "running")     return mode === "TABATA" ? WORK_COLOR : MODE_COLOR[mode];
  if (phase === "rest")        return REST_COLOR;
  if (phase === "round-pause") return PAUSE_COLOR;
  return DONE_COLOR;
}

function phaseBg(phase: Phase): string {
  if (phase === "running")     return "rgba(46,204,113,0.025)";
  if (phase === "rest")        return "rgba(230,126,34,0.03)";
  if (phase === "round-pause") return "rgba(52,152,219,0.035)";
  return "transparent";
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ── helpers ── */
function getTotalRounds(config: WorkoutConfig): number {
  if (config.mode === "EMOM")   return config.rounds ?? 10;
  if (config.mode === "TABATA") return config.rounds ?? 4;
  return 1;
}

function getInitialRunTime(config: WorkoutConfig): number {
  if (config.mode === "AMRAP")    return config.duration ?? 600;
  if (config.mode === "FOR_TIME") return config.duration ?? 1200;
  if (config.mode === "EMOM")     return config.duration ?? 60;
  if (config.mode === "TABATA")   return config.workTime ?? 20;
  return 60;
}

function buildInitialState(config: WorkoutConfig): TimerState {
  return {
    phase: "countdown",
    timeLeft: 10,
    totalTime: 10,
    currentRound: 1,
    totalRounds: getTotalRounds(config),
    currentSet: 1,
    setsPerRound: config.setsPerRound ?? 2,
    elapsedForTime: 0,
    roundCount: 0,
    countdownNum: 10,
    paused: false,
    phrase: getRandomFrase(),
  };
}

/* ── phase transition ── */
function advancePhase(prev: TimerState, config: WorkoutConfig): TimerState {
  const mode = config.mode;

  if (prev.phase === "countdown") {
    const t = getInitialRunTime(config);
    return { ...prev, phase: "running", timeLeft: t, totalTime: t, elapsedForTime: 0 };
  }

  if (mode === "AMRAP" && prev.phase === "running")
    return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };

  if (mode === "FOR_TIME" && prev.phase === "running")
    return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };

  if (mode === "EMOM" && prev.phase === "running") {
    const next = prev.currentRound + 1;
    if (next > prev.totalRounds) return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };
    const t = config.duration ?? 60;
    return { ...prev, currentRound: next, timeLeft: t, totalTime: t };
  }

  if (mode === "TABATA") {
    if (prev.phase === "running") {
      const isLastSet = prev.currentSet >= prev.setsPerRound;
      if (!isLastSet) {
        // Not the last exercise — insert rest before next set
        const restT = config.restTime ?? 10;
        return { ...prev, phase: "rest", timeLeft: restT, totalTime: restT };
      }
      // Last exercise of the round — skip rest, go directly to round-pause
      const nextRound = prev.currentRound + 1;
      if (nextRound > prev.totalRounds)
        return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };
      const pauseT = config.roundPauseTime ?? 60;
      return { ...prev, phase: "round-pause", timeLeft: pauseT, totalTime: pauseT, currentRound: nextRound, currentSet: 1, phrase: getRandomFrase() };
    }
    if (prev.phase === "rest") {
      // Rest always leads to the next set
      const nextSet = prev.currentSet + 1;
      const t = config.workTime ?? 20;
      return { ...prev, phase: "running", currentSet: nextSet, timeLeft: t, totalTime: t };
    }
    if (prev.phase === "round-pause") {
      const t = config.workTime ?? 20;
      return { ...prev, phase: "running", currentSet: 1, timeLeft: t, totalTime: t };
    }
  }

  return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };
}

/* ═══════════════════════════ Component ═══════════════════════════ */
export default function TimerScreen({ config, onBack }: TimerScreenProps) {
  const mode = config.mode;
  const [state, setState] = useState<TimerState>(() => buildInitialState(config));
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeepRef  = useRef<number>(-1);
  const prevPhaseRef = useRef<Phase | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseBtnRef  = useRef<HTMLButtonElement>(null);
  const menuBtnRef   = useRef<HTMLButtonElement>(null);
  const actionBtnRef = useRef<HTMLButtonElement>(null);

  // D-pad focus tracking per Android TV
  const [tvFocus, setTvFocus] = useState<"menu" | "pause">("pause");

  const color    = phaseColor(state.phase, mode);
  const bg       = phaseBg(state.phase);
  const progress = state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;

  /* ── avviso countdown: giallo caldo negli ultimi 5s in tutte le fasi ── */
  const WARNING_COLOR = "#F1C40F";
  const isWarning = (
    (state.phase === "running" || state.phase === "rest" || state.phase === "round-pause") &&
    state.timeLeft > 0 && state.timeLeft <= 3
  );
  const displayColor = isWarning ? WARNING_COLOR : color;

  /* ── callbacks ── */
  const addRound = useCallback(() => {
    setState((p) => ({ ...p, roundCount: p.roundCount + 1 }));
    playBeep();
  }, []);

  const finishForTime = useCallback(() => {
    setState((p) => ({ ...p, phase: "done", phrase: getRandomFrase() }));
  }, []);

  const [flashKey,   setFlashKey]   = useState(0);
  const [flashColor, setFlashColor] = useState<string>(WORK_COLOR);

  const togglePause = useCallback(() => {
    setState((p) => ({ ...p, paused: !p.paused }));
  }, []);

  /* ── tick ── */
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.paused || prev.phase === "done") return prev;

      const newLeft    = prev.timeLeft - 1;
      const newElapsed = (prev.phase === "running" || prev.phase === "rest")
        ? prev.elapsedForTime + 1
        : prev.elapsedForTime;

      // avviso sonoro a 3s per tutte le fasi
      const warnAt = 3;
      if (newLeft <= warnAt && newLeft > 0 && lastBeepRef.current !== newLeft) {
        lastBeepRef.current = newLeft;
        playCountdownBeep();
      }

      if (newLeft <= 0) return { ...advancePhase(prev, config), elapsedForTime: newElapsed };

      return {
        ...prev,
        timeLeft: newLeft,
        elapsedForTime: newElapsed,
        countdownNum: prev.phase === "countdown" ? newLeft : prev.countdownNum,
      };
    });
  }, [config]);

  /* ── interval ── */
  useEffect(() => {
    if (state.phase === "done" || state.paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.phase, state.paused, tick]);

  /* ── sounds + flash on phase change ── */
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (state.phase === prev) return;
    prevPhaseRef.current = state.phase;

    const triggerFlash = (c: string) => { setFlashColor(c); setFlashKey((k) => k + 1); };

    if (state.phase === "running" && prev === "countdown") {
      playStartBuzzer();
      triggerFlash(MODE_COLOR[mode]);
    } else if (state.phase === "rest") {
      playRestBeep();
      triggerFlash(REST_COLOR);
    } else if (state.phase === "running" && (prev === "rest" || prev === "round-pause")) {
      playTripleBeep();
      triggerFlash(mode === "TABATA" ? WORK_COLOR : MODE_COLOR[mode]);
    } else if (state.phase === "round-pause") {
      playRestBeep();
      triggerFlash(PAUSE_COLOR);
    } else if (state.phase === "done") {
      playFanfare();
      triggerFlash(DONE_COLOR);
    }
  }, [state.phase, mode]);

  /* ── Wake Lock: prevent TV standby (API + audio fallback) ── */
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;

    async function grab() {
      try {
        if ("wakeLock" in navigator) {
          lock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (_) {}
    }

    grab();
    keepAwake(); // oscillatore inudibile come fallback per TV senza WakeLock API

    const onVisible = () => {
      if (document.visibilityState === "visible") { grab(); keepAwake(); }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      lock?.release();
      releaseAwake();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* ── auto-focus: ensure TV D-Pad events are captured ── */
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  /* ── focus action/pause button on phase entry ── */
  useEffect(() => {
    if (state.phase === "running") {
      if (mode === "AMRAP" || mode === "FOR_TIME") {
        setTimeout(() => actionBtnRef.current?.focus(), 50);
        setTvFocus("pause");
      } else {
        setTimeout(() => pauseBtnRef.current?.focus(), 50);
        setTvFocus("pause");
      }
    }
    if (state.phase === "rest" || state.phase === "round-pause") {
      setTimeout(() => pauseBtnRef.current?.focus(), 50);
      setTvFocus("pause");
    }
  }, [state.phase, mode]);

  /* ── keyboard ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "BrowserBack" || e.key === "GoBack") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onBack(); return;
      }
      // Tasti media telecomando (MiBox3, Fire TV, ecc.)
      if (e.key === "MediaPlayPause" || e.key === "MediaPlay" || e.key === "MediaPause") {
        e.preventDefault();
        if (state.phase === "done") return;
        togglePause(); return;
      }
      if (e.key === "MediaStop") {
        e.preventDefault();
        if (intervalRef.current) clearInterval(intervalRef.current);
        onBack(); return;
      }
      // D-pad navigazione tra pulsanti (Android TV)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setTvFocus("menu");
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (state.phase !== "countdown" && state.phase !== "done") {
          setTvFocus("pause");
          pauseBtnRef.current?.focus();
        }
        return;
      }
      if (e.key === "ArrowUp") {
        if (mode === "AMRAP" && state.phase === "running") {
          e.preventDefault(); addRound(); return;
        }
        e.preventDefault();
        setTvFocus("menu");
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        if (mode === "FOR_TIME" && state.phase === "running") {
          e.preventDefault(); finishForTime(); return;
        }
        e.preventDefault();
        if (state.phase !== "countdown" && state.phase !== "done") {
          setTvFocus("pause");
          pauseBtnRef.current?.focus();
        }
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (state.phase === "done") { onBack(); return; }
        if (tvFocus === "menu") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onBack(); return;
        }
        if (state.phase === "running" && mode === "AMRAP") { addRound(); return; }
        if (state.phase === "running" && mode === "FOR_TIME") { finishForTime(); return; }
        togglePause();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, mode, tvFocus, onBack, addRound, finishForTime, togglePause]);

  /* ── responsive circle size ── */
  const computeCircleSize = useCallback(() => {
    const portrait = window.innerHeight > window.innerWidth;
    if (portrait) return Math.min(window.innerWidth * 0.72, window.innerHeight * 0.38, 320);
    return Math.min(window.innerHeight * 0.58, window.innerWidth * 0.38, 400);
  }, []);

  const [circleSize, setCircleSize] = useState(computeCircleSize);

  useEffect(() => {
    const handle = () => setCircleSize(computeCircleSize());
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, [computeCircleSize]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ width: "100vw", height: "100vh", background: "transparent", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", transition: "background 0.5s ease", outline: "none" }}
    >

      <BackgroundLogo />

      {/* Phase tint */}
      <div style={{ position: "absolute", inset: 0, background: bg, transition: "background 0.5s ease", pointerEvents: "none", zIndex: 1 }} />

      {/* Phase-change flash */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          style={{
            position: "absolute", inset: 0,
            background: flashColor,
            pointerEvents: "none",
            zIndex: 4,
            animation: "phase-flash 0.65s ease-out forwards",
          }}
        />
      )}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2vh 4vw", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px,1.4vw,18px)" }}>
          <button
            ref={menuBtnRef}
            tabIndex={0}
            className="wod-btn"
            onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); onBack(); }}
            onFocus={() => setTvFocus("menu")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `2px solid ${tvFocus === "menu" ? "#F8F9FA" : "rgba(255,255,255,0.14)"}`,
              borderRadius: "20px",
              padding: "clamp(5px,0.8vh,9px) clamp(12px,1.5vw,20px)",
              fontFamily: "Inter,sans-serif",
              fontSize: "clamp(11px,1.2vw,16px)",
              fontWeight: 600,
              color: tvFocus === "menu" ? "#F8F9FA" : "rgba(248,249,250,0.7)",
              cursor: "pointer",
              letterSpacing: "0.04em",
              flexShrink: 0,
              outline: "none",
              boxShadow: tvFocus === "menu" ? "0 0 0 3px rgba(248,249,250,0.35)" : "none",
              transition: "border-color 0.15s, box-shadow 0.15s, color 0.15s",
            }}
          >
            ← MENU
          </button>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(16px,2.2vw,30px)", fontWeight: 700, color, letterSpacing: "0.06em" }}>
            {mode.replace("_", " ")}
            {mode === "TABATA" && state.phase !== "countdown" && state.phase !== "done" && (
              <span style={{ fontSize: "65%", fontWeight: 400, marginLeft: "12px", color: "rgba(248,249,250,0.4)", letterSpacing: "0.04em" }}>
                {state.phase === "running" ? "LAVORO" : state.phase === "rest" ? "RECUPERO" : "PAUSA SERIE"}
              </span>
            )}
          </div>
        </div>

        {(mode === "EMOM" || mode === "TABATA") && state.phase !== "countdown" && state.phase !== "done" && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(13px,1.6vw,22px)", color: "rgba(248,249,250,0.42)", letterSpacing: "0.04em" }}>
            SERIE <span style={{ color: "#F8F9FA", fontWeight: 700 }}>{state.currentRound}</span> / {state.totalRounds}
          </div>
        )}

        {/* Pause / Resume button */}
        {state.phase !== "countdown" && state.phase !== "done" && (
          <button
            ref={pauseBtnRef}
            tabIndex={0}
            className="wod-btn"
            onClick={togglePause}
            onFocus={() => setTvFocus("pause")}
            style={{
              background: state.paused ? "#E67E22" : "rgba(255,255,255,0.07)",
              border: `2px solid ${state.paused ? "#E67E22" : tvFocus === "pause" ? "#F8F9FA" : "rgba(255,255,255,0.14)"}`,
              borderRadius: "20px",
              padding: "clamp(6px,1vh,10px) clamp(14px,2vw,26px)",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(12px,1.3vw,18px)",
              fontWeight: state.paused ? 700 : 500,
              color: state.paused ? "#121212" : "rgba(248,249,250,0.75)",
              cursor: "pointer",
              letterSpacing: "0.05em",
              outline: "none",
              boxShadow: tvFocus === "pause" && !state.paused ? "0 0 0 3px rgba(248,249,250,0.35)" : "none",
              transition: "all 0.18s ease",
              animation: state.paused ? "pulse-subtle 1.4s ease-in-out infinite" : "none",
            }}
          >
            {state.paused ? "▶ RIPRENDI" : "⏸ PAUSA"}
          </button>
        )}
      </div>

      {/* Main */}
      <div className="timer-main" style={{ flex: 1, position: "relative", zIndex: 2 }}>
        {state.phase === "countdown" && <CountdownDisplay countdownNum={state.countdownNum} />}

        {state.phase === "done" && (
          <DoneDisplay mode={mode} elapsed={state.elapsedForTime} roundCount={state.roundCount} phrase={state.phrase} onBack={onBack} />
        )}

        {state.phase === "round-pause" && (
          <RoundPauseDisplay
            timeLeft={state.timeLeft} totalTime={state.totalTime}
            currentRound={state.currentRound} totalRounds={state.totalRounds}
            phrase={state.phrase} circleSize={Math.min(circleSize, 300)}
            isWarning={isWarning}
          />
        )}

        {(state.phase === "running" || state.phase === "rest") && (
          <>
            <SegmentedRing progress={progress} size={circleSize} activeColor={displayColor}>
              <div
                className={isWarning ? "timer-warning" : ""}
                style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(48px,15vmin,130px)", fontWeight: 700, color: displayColor, letterSpacing: "0.02em", lineHeight: 1 }}
                data-testid="timer-display"
              >
                {mode === "FOR_TIME" ? formatTime(state.elapsedForTime) : formatTime(state.timeLeft)}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(10px,1.1vw,14px)", fontWeight: 500, color: isWarning ? "rgba(241,196,15,0.65)" : "rgba(248,249,250,0.32)", letterSpacing: "0.18em", marginTop: "10px", textTransform: "uppercase" }}>
                {mode === "FOR_TIME" ? "TRASCORSI" : state.phase === "rest" ? "RECUPERO" : "RIMANENTI"}
              </div>
            </SegmentedRing>

            <RightPanel
              config={config} state={state} mode={mode}
              onAddRound={addRound} onFinishForTime={finishForTime}
              actionBtnRef={actionBtnRef}
            />
          </>
        )}
      </div>

      {/* Flat progress bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "rgba(255,255,255,0.07)", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: displayColor, transition: "width 0.95s linear" }} />
      </div>
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function CountdownDisplay({ countdownNum }: { countdownNum: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2vh" }}>
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(16px,2.2vw,34px)", fontWeight: 600, color: "rgba(248,249,250,0.42)", letterSpacing: "0.3em", textTransform: "uppercase" }}>Preparati</div>
      <div key={countdownNum} style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(90px,28vmin,360px)", fontWeight: 700, color: "#E67E22", lineHeight: 1, animation: "countdown-num 1s ease-in-out" }}>
        {countdownNum}
      </div>
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(12px,1.3vw,18px)", fontWeight: 400, color: "rgba(248,249,250,0.25)", letterSpacing: "0.2em" }}>
        {countdownNum <= 3 ? "Via tra poco..." : "secondi all'inizio"}
      </div>
    </div>
  );
}

function RoundPauseDisplay({ timeLeft, totalTime, currentRound, totalRounds, phrase, circleSize, isWarning }: {
  timeLeft: number; totalTime: number; currentRound: number; totalRounds: number; phrase: string; circleSize: number; isWarning?: boolean;
}) {
  const WARNING_COLOR = "#F1C40F";
  const displayColor = isWarning ? WARNING_COLOR : PAUSE_COLOR;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3vh", maxWidth: "92vw" }}>
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(13px,1.8vw,26px)", fontWeight: 600, color: displayColor, letterSpacing: "0.06em" }}>
        Pausa Serie &nbsp;·&nbsp; {currentRound} / {totalRounds}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(28px,5vw,70px)", flexWrap: "wrap", justifyContent: "center" }}>
        <ProgressCircle progress={progress} size={circleSize} strokeWidth={10} color={displayColor}>
          <div
            className={isWarning ? "timer-warning" : ""}
            style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(36px,12vmin,100px)", fontWeight: 700, color: displayColor, lineHeight: 1 }}
          >
            {formatTime(timeLeft)}
          </div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(9px,1vw,13px)", fontWeight: 500, color: isWarning ? "rgba(241,196,15,0.55)" : "rgba(248,249,250,0.32)", letterSpacing: "0.12em", marginTop: "6px", textTransform: "uppercase" }}>Ripartenza</div>
        </ProgressCircle>

        <div style={{ maxWidth: "min(540px, 82vw)", background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.18)", borderRadius: "16px", padding: "clamp(18px,3vh,32px) clamp(18px,3vw,36px)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 500, color: "rgba(248,249,250,0.25)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Frase del round
          </div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(15px,1.9vw,28px)", fontWeight: 500, color: "rgba(248,249,250,0.85)", lineHeight: 1.45, animation: "scale-in 0.4s ease-out" }}>
            "{phrase}"
          </div>
        </div>
      </div>
    </div>
  );
}

function DoneDisplay({ mode, elapsed, roundCount, phrase, onBack }: {
  mode: WorkoutMode; elapsed: number; roundCount: number; phrase: string; onBack: () => void;
}) {
  return (
    <>
      <Confetti />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5vh", maxWidth: "88vw", textAlign: "center" }}>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(28px,8vmin,72px)", fontWeight: 700, color: DONE_COLOR, letterSpacing: "0.15em", lineHeight: 1.15, animation: "scale-in 0.4s ease-out" }}>
          ALLENAMENTO<br />COMPLETATO
        </div>

        {mode === "FOR_TIME" && (
          <div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 500, color: "rgba(248,249,250,0.32)", letterSpacing: "0.18em", marginBottom: "8px", textTransform: "uppercase" }}>Tempo totale</div>
            <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(56px,9vw,120px)", fontWeight: 700, color: DONE_COLOR, lineHeight: 1 }}>{formatTime(elapsed)}</div>
          </div>
        )}
        {mode === "AMRAP" && (
          <div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 500, color: "rgba(248,249,250,0.32)", letterSpacing: "0.18em", marginBottom: "8px", textTransform: "uppercase" }}>Giri totali</div>
            <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,13vw,170px)", fontWeight: 700, color: DONE_COLOR, lineHeight: 1 }}>{roundCount}</div>
          </div>
        )}

        <div style={{ maxWidth: "clamp(260px,52vw,700px)", background: "rgba(46,204,113,0.05)", border: "1px solid rgba(46,204,113,0.18)", borderRadius: "16px", padding: "clamp(14px,2vh,26px) clamp(18px,3vw,36px)", fontFamily: "Inter,sans-serif", fontSize: "clamp(14px,1.7vw,24px)", fontWeight: 500, color: "rgba(248,249,250,0.78)", lineHeight: 1.45, animation: "scale-in 0.5s ease-out 0.3s both" }}>
          "{phrase}"
        </div>

        <button
          tabIndex={0}
          autoFocus
          className="wod-btn"
          onClick={onBack}
          style={{
            marginTop: "1vh",
            background: DONE_COLOR,
            border: "none",
            borderRadius: "20px",
            padding: "clamp(12px,1.8vh,22px) clamp(32px,4vw,64px)",
            fontFamily: "Inter,sans-serif",
            fontSize: "clamp(15px,1.8vw,26px)",
            fontWeight: 700,
            color: "#121212",
            cursor: "pointer",
            letterSpacing: "0.1em",
            animation: "scale-in 0.4s ease-out 0.6s both",
          }}
        >
          ← TORNA AL MENU
        </button>
      </div>
    </>
  );
}

interface RightPanelProps {
  config: WorkoutConfig;
  state: TimerState;
  mode: WorkoutMode;
  onAddRound: () => void;
  onFinishForTime: () => void;
  actionBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

function RightPanel({ state, mode, onAddRound, onFinishForTime, actionBtnRef }: RightPanelProps) {
  const setsPerRound  = state.setsPerRound;
  const totalRounds   = state.totalRounds;

  if (mode === "AMRAP") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 500, color: "rgba(248,249,250,0.32)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Giri completati</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,12vw,160px)", fontWeight: 700, color: WORK_COLOR, lineHeight: 1 }} data-testid="round-count">
          {state.roundCount}
        </div>
        <button
          ref={actionBtnRef}
          data-testid="btn-add-round"
          tabIndex={0}
          className="wod-btn"
          onClick={onAddRound}
          style={{ background: "#1E1E1E", border: `1px solid rgba(46,204,113,0.4)`, borderRadius: "20px", padding: "clamp(10px,1.4vh,18px) clamp(22px,2.8vw,44px)", fontFamily: "Inter,sans-serif", fontSize: "clamp(13px,1.6vw,22px)", fontWeight: 700, color: WORK_COLOR, cursor: "pointer", letterSpacing: "0.1em", transition: "all 0.18s ease" }}>
          + Giro
        </button>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,0.9vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.18)", letterSpacing: "0.1em", marginTop: "4px" }}>
          <span className="dpad-hint">INVIO / ↑ = +Giro</span>
        </div>
      </div>
    );
  }

  if (mode === "FOR_TIME") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 500, color: "rgba(248,249,250,0.32)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Cap rimanente</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(36px,5vw,70px)", fontWeight: 700, color: "rgba(248,249,250,0.5)", lineHeight: 1 }}>
          {formatTime(state.timeLeft)}
        </div>
        <button
          ref={actionBtnRef}
          data-testid="btn-done"
          tabIndex={0}
          className="wod-btn"
          onClick={onFinishForTime}
          style={{ background: "#1E1E1E", border: `1px solid rgba(230,126,34,0.4)`, borderRadius: "20px", padding: "clamp(10px,1.4vh,18px) clamp(22px,2.8vw,44px)", fontFamily: "Inter,sans-serif", fontSize: "clamp(13px,1.6vw,22px)", fontWeight: 700, color: REST_COLOR, cursor: "pointer", letterSpacing: "0.1em", transition: "all 0.18s ease" }}>
          Fine
        </button>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,0.9vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.18)", letterSpacing: "0.1em", marginTop: "4px" }}>
          <span className="dpad-hint">INVIO / ↓ = Fine</span>
        </div>
      </div>
    );
  }

  if (mode === "EMOM") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 500, color: "rgba(248,249,250,0.32)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Minuto</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,12vw,160px)", fontWeight: 700, color: WORK_COLOR, lineHeight: 1 }}>
          {state.currentRound}
        </div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(11px,1.2vw,16px)", fontWeight: 400, color: "rgba(248,249,250,0.28)", letterSpacing: "0.05em" }}>
          di {state.totalRounds} totali
        </div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,0.9vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.18)", letterSpacing: "0.1em", marginTop: "8px" }}>
          INVIO = Pausa
        </div>
      </div>
    );
  }

  /* ── TABATA ── */
  const tabataColor = state.phase === "running" ? WORK_COLOR : REST_COLOR;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "clamp(14px,2.2vh,26px)", minWidth: "clamp(180px,24vw,340px)" }}>

      {/* Phase label */}
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(26px,3.8vw,54px)", fontWeight: 800, color: tabataColor, letterSpacing: "0.04em" }}>
        {state.phase === "running" ? "LAVORA!" : "RECUPERO"}
      </div>

      {/* Exercise pills */}
      <div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 600, color: "#F8F9FA", letterSpacing: "0.06em", marginBottom: "clamp(8px,1.2vh,14px)", textTransform: "uppercase" }}>
          Esercizio {state.currentSet} / {setsPerRound}
        </div>
        <div style={{ display: "flex", gap: "clamp(8px,1vw,14px)" }}>
          {Array.from({ length: setsPerRound }).map((_, i) => {
            const active = i <= state.currentSet - 1;
            return (
              <div key={i} style={{
                width: "clamp(44px,5.5vw,76px)",
                height: "clamp(22px,2.8vw,38px)",
                borderRadius: "999px",
                background: active
                  ? "linear-gradient(145deg, #3de07e 0%, #22a855 100%)"
                  : "linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)",
                border: `1px solid ${active ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)"}`,
                boxShadow: active
                  ? "0 2px 10px rgba(46,204,113,0.40), inset 0 1px 0 rgba(255,255,255,0.22)"
                  : "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 4px rgba(0,0,0,0.4)",
                transition: "all 0.3s ease",
              }} />
            );
          })}
        </div>
      </div>

      {/* Round squares */}
      <div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,14px)", fontWeight: 600, color: "#F8F9FA", letterSpacing: "0.06em", marginBottom: "clamp(8px,1.2vh,14px)", textTransform: "uppercase" }}>
          Serie {state.currentRound} / {totalRounds}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(7px,0.9vw,12px)", maxWidth: "260px" }}>
          {Array.from({ length: totalRounds }).map((_, i) => {
            const active = i <= state.currentRound - 1;
            return (
              <div key={i} style={{
                width: "clamp(22px,2.8vw,38px)",
                height: "clamp(22px,2.8vw,38px)",
                borderRadius: "7px",
                background: active
                  ? "linear-gradient(145deg, #5bc4f6 0%, #2883cc 100%)"
                  : "linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)",
                border: `1px solid ${active ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)"}`,
                boxShadow: active
                  ? "0 2px 10px rgba(52,152,219,0.40), inset 0 1px 0 rgba(255,255,255,0.22)"
                  : "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 4px rgba(0,0,0,0.4)",
                transition: "all 0.3s ease",
              }} />
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,0.9vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.2)", letterSpacing: "0.06em", marginTop: "4px" }}>
        INVIO = Pausa
      </div>
    </div>
  );
}

/* ───────────────────────── Confetti ───────────────────────── */

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#2ECC71","#E67E22","#3498DB","#E74C3C","#F1C40F","#9B59B6","#1ABC9C"];
    const makepiece = () => ({
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight * 0.5 - 10,
      w: Math.random() * 13 + 5,
      h: Math.random() * 7 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 2.5,
      vy: Math.random() * 2 + 1,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 9,
      opacity: 1,
    });
    const pieces = Array.from({ length: 150 }, makepiece);

    let animId: number;
    const start = Date.now();
    const DURATION = 20;

    function draw() {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed > DURATION + 1) return;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const fading = elapsed > DURATION - 2;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.rot += p.rotSpeed;
        if (fading) {
          p.opacity = Math.max(0, p.opacity - 0.022);
        } else if (p.y > canvas!.height + 20) {
          Object.assign(p, makepiece());
          p.x = Math.random() * canvas!.width;
          p.vy = Math.random() * 2 + 1;
        }
        if (p.opacity <= 0) continue;
        ctx!.save();
        ctx!.globalAlpha = p.opacity;
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rot * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }} />;
}
