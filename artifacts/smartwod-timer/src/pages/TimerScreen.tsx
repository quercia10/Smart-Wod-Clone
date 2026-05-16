import { useState, useEffect, useRef, useCallback } from "react";
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
  playRestBeep,
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
      const t = config.restTime ?? 10;
      return { ...prev, phase: "rest", timeLeft: t, totalTime: t };
    }
    if (prev.phase === "rest") {
      const nextSet = prev.currentSet + 1;
      if (nextSet <= prev.setsPerRound) {
        const t = config.workTime ?? 20;
        return { ...prev, phase: "running", currentSet: nextSet, timeLeft: t, totalTime: t };
      }
      // All sets in round done
      const nextRound = prev.currentRound + 1;
      if (nextRound > prev.totalRounds)
        return { ...prev, phase: "done", timeLeft: 0, phrase: getRandomFrase() };
      const pauseT = config.roundPauseTime ?? 60;
      return { ...prev, phase: "round-pause", timeLeft: pauseT, totalTime: pauseT, currentRound: nextRound, currentSet: 1, phrase: getRandomFrase() };
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
  const actionBtnRef = useRef<HTMLButtonElement>(null);

  const color    = phaseColor(state.phase, mode);
  const bg       = phaseBg(state.phase);
  const progress = state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;

  /* ── avviso countdown: giallo caldo negli ultimi 5s (lavoro/rest) o 10s (round-pause) ── */
  const WARNING_COLOR = "#F1C40F";
  const isWarning = (
    (state.phase === "running" || state.phase === "rest") &&
    state.timeLeft > 0 && state.timeLeft <= 5
  ) || (
    state.phase === "round-pause" &&
    state.timeLeft > 0 && state.timeLeft <= 10
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

      // round-pause (lunga) → avviso a 10s; tutto il resto → avviso a 5s
      const warnAt = prev.phase === "round-pause" ? 10 : 5;
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

  /* ── sounds on phase change ── */
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (state.phase === prev) return;
    prevPhaseRef.current = state.phase;
    if (state.phase === "running" && prev === "countdown") playStartBuzzer();
    else if (state.phase === "rest") playRestBeep();
    else if (state.phase === "running" && (prev === "rest" || prev === "round-pause")) playTripleBeep();
    else if (state.phase === "round-pause") playRestBeep();
    else if (state.phase === "done") playEndBuzzer();
  }, [state.phase]);

  /* ── auto-focus: ensure TV D-Pad events are captured ── */
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  /* ── focus action/pause button on phase entry ── */
  useEffect(() => {
    if (state.phase === "running") {
      if (mode === "AMRAP" || mode === "FOR_TIME") {
        setTimeout(() => actionBtnRef.current?.focus(), 50);
      } else {
        setTimeout(() => pauseBtnRef.current?.focus(), 50);
      }
    }
    if (state.phase === "rest" || state.phase === "round-pause") {
      setTimeout(() => pauseBtnRef.current?.focus(), 50);
    }
  }, [state.phase, mode]);

  /* ── keyboard ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onBack(); return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (state.phase === "done") { onBack(); return; }
        if (state.phase === "running" && mode === "AMRAP") { addRound(); return; }
        if (state.phase === "running" && mode === "FOR_TIME") { finishForTime(); return; }
        togglePause();
      }
      if (e.key === "ArrowUp" && mode === "AMRAP" && state.phase === "running") {
        e.preventDefault(); addRound();
      }
      if (e.key === "ArrowDown" && mode === "FOR_TIME" && state.phase === "running") {
        e.preventDefault(); finishForTime();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, mode, onBack, addRound, finishForTime, togglePause]);

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
      {/* Phase tint */}
      <div style={{ position: "absolute", inset: 0, background: bg, transition: "background 0.5s ease", pointerEvents: "none", zIndex: 1 }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2vh 4vw", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(16px,2.2vw,30px)", fontWeight: 700, color, letterSpacing: "0.06em" }}>
          {mode.replace("_", " ")}
          {mode === "TABATA" && state.phase !== "countdown" && state.phase !== "done" && (
            <span style={{ fontSize: "65%", fontWeight: 400, marginLeft: "12px", color: "rgba(248,249,250,0.4)", letterSpacing: "0.04em" }}>
              {state.phase === "running" ? "LAVORO" : state.phase === "rest" ? "RECUPERO" : "PAUSA SERIE"}
            </span>
          )}
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
            style={{
              background: state.paused ? "#E67E22" : "rgba(255,255,255,0.07)",
              border: `1px solid ${state.paused ? "#E67E22" : "rgba(255,255,255,0.14)"}`,
              borderRadius: "20px",
              padding: "clamp(6px,1vh,10px) clamp(14px,2vw,26px)",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(12px,1.3vw,18px)",
              fontWeight: state.paused ? 700 : 500,
              color: state.paused ? "#121212" : "rgba(248,249,250,0.75)",
              cursor: "pointer",
              letterSpacing: "0.05em",
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
          <DoneDisplay mode={mode} elapsed={state.elapsedForTime} roundCount={state.roundCount} phrase={state.phrase} />
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
            <BrandBadge size={Math.max(56, Math.round(circleSize * 0.17))} />
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

function DoneDisplay({ mode, elapsed, roundCount, phrase }: {
  mode: WorkoutMode; elapsed: number; roundCount: number; phrase: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5vh", maxWidth: "88vw", textAlign: "center" }}>
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(42px,14vmin,110px)", fontWeight: 700, color: DONE_COLOR, letterSpacing: "0.2em", animation: "scale-in 0.4s ease-out" }}>
        TEMPO!
      </div>
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(13px,1.8vw,26px)", fontWeight: 400, color: "rgba(248,249,250,0.32)", letterSpacing: "0.1em" }}>
        Allenamento completato
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

      <div style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(10px,1vw,13px)", fontWeight: 400, color: "rgba(248,249,250,0.18)", letterSpacing: "0.15em" }}>
        INVIO / ESC = Menu
      </div>
    </div>
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
          <span className="dpad-hint">INVIO / ↑ = +Giro &nbsp;·&nbsp; ESC = Menu</span>
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
          <span className="dpad-hint">INVIO / ↓ = Fine &nbsp;·&nbsp; ESC = Menu</span>
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
          INVIO = Pausa &nbsp;·&nbsp; ESC = Menu
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
        INVIO = Pausa &nbsp;·&nbsp; ESC = Menu
      </div>
    </div>
  );
}

/* ───────────────────────── Brand Badge ───────────────────────── */

function BrandBadge({ size }: { size: number }) {
  const ring = Math.max(2, Math.round(size * 0.07));
  return (
    <div
      className="dpad-hint"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        alignSelf: "center",
        borderRadius: "50%",
        background: "radial-gradient(circle at 36% 32%, #484848 0%, #252525 55%, #181818 100%)",
        border: `${ring}px solid #3c3c3c`,
        boxShadow:
          `0 0 0 ${Math.max(1, ring - 1)}px #555, ` +
          `0 0 0 ${ring * 2}px #222, ` +
          "0 6px 24px rgba(0,0,0,0.7), " +
          "0 0 32px rgba(46,204,113,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src="/logo.png"
        alt="SmartWOD"
        style={{ width: "62%", height: "62%", objectFit: "contain", opacity: 0.88 }}
      />
    </div>
  );
}
