import { useState, useEffect, useRef, useCallback } from "react";
import ProgressCircle from "@/components/ProgressCircle";
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
const WORK_COLOR  = "#00ff66";
const REST_COLOR  = "#ff8800";
const PAUSE_COLOR = "#4488cc";
const DONE_COLOR  = "#00ff66";

const MODE_COLOR: Record<WorkoutMode, string> = {
  AMRAP:    WORK_COLOR,
  FOR_TIME: REST_COLOR,
  EMOM:     WORK_COLOR,
  TABATA:   "#ff3333",
};

function phaseColor(phase: Phase, mode: WorkoutMode): string {
  if (phase === "countdown")   return "#ff8800";
  if (phase === "running")     return mode === "TABATA" ? WORK_COLOR : MODE_COLOR[mode];
  if (phase === "rest")        return REST_COLOR;
  if (phase === "round-pause") return PAUSE_COLOR;
  return DONE_COLOR;
}

function phaseBg(phase: Phase): string {
  if (phase === "running")     return "rgba(0,255,102,0.025)";
  if (phase === "rest")        return "rgba(255,136,0,0.035)";
  if (phase === "round-pause") return "rgba(68,136,204,0.045)";
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

  const color    = phaseColor(state.phase, mode);
  const bg       = phaseBg(state.phase);
  const progress = state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;

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

      if (newLeft <= 3 && newLeft > 0 && lastBeepRef.current !== newLeft) {
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
      if (e.key === "ArrowUp" && mode === "AMRAP" && state.phase === "running") addRound();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, mode, onBack, addRound, finishForTime, togglePause]);

  /* ── render ── */
  const circleSize = Math.min(
    typeof window !== "undefined" ? window.innerHeight * 0.58 : 380,
    typeof window !== "undefined" ? window.innerWidth  * 0.38 : 380,
    400,
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", transition: "background 0.5s ease" }}>
      {/* Phase tint */}
      <div style={{ position: "absolute", inset: 0, background: bg, transition: "background 0.5s ease", pointerEvents: "none", zIndex: 1 }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2vh 4vw", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(20px,2.5vw,36px)", fontWeight: 700, color, textShadow: `0 0 15px ${color}`, letterSpacing: "0.2em" }}>
          {mode.replace("_", " ")}
          {mode === "TABATA" && state.phase !== "countdown" && state.phase !== "done" && (
            <span style={{ fontSize: "60%", fontWeight: 300, marginLeft: "16px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
              {state.phase === "running" ? "LAVORO" : state.phase === "rest" ? "RECUPERO" : "PAUSA SERIE"}
            </span>
          )}
        </div>

        {(mode === "EMOM" || mode === "TABATA") && state.phase !== "countdown" && state.phase !== "done" && (
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(15px,1.9vw,26px)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
            SERIE <span style={{ color: "white", fontWeight: 700 }}>{state.currentRound}</span> / {state.totalRounds}
          </div>
        )}

        {state.paused && (
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(14px,1.6vw,22px)", color: "#ff8800", textShadow: "0 0 10px #ff8800", letterSpacing: "0.2em", animation: "pulse-neon 1s ease-in-out infinite" }}>
            ⏸ PAUSA
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(28px,5vw,80px)", padding: "2vh 4vw", position: "relative", zIndex: 2 }}>
        {state.phase === "countdown" && <CountdownDisplay countdownNum={state.countdownNum} />}

        {state.phase === "done" && (
          <DoneDisplay mode={mode} elapsed={state.elapsedForTime} roundCount={state.roundCount} phrase={state.phrase} />
        )}

        {state.phase === "round-pause" && (
          <RoundPauseDisplay
            timeLeft={state.timeLeft} totalTime={state.totalTime}
            currentRound={state.currentRound} totalRounds={state.totalRounds}
            phrase={state.phrase} circleSize={Math.min(circleSize, 300)}
          />
        )}

        {(state.phase === "running" || state.phase === "rest") && (
          <>
            <ProgressCircle progress={progress} size={circleSize} strokeWidth={13} color={color}>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(48px,8vw,115px)", fontWeight: 700, color, textShadow: `0 0 20px ${color},0 0 40px ${color}66`, letterSpacing: "0.02em", lineHeight: 1 }} data-testid="timer-display">
                {mode === "FOR_TIME" ? formatTime(state.elapsedForTime) : formatTime(state.timeLeft)}
              </div>
              <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(11px,1.2vw,16px)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginTop: "8px" }}>
                {mode === "FOR_TIME" ? "TRASCORSI" : state.phase === "rest" ? "RECUPERO" : "RIMANENTI"}
              </div>
            </ProgressCircle>

            <RightPanel
              config={config} state={state} mode={mode}
              onAddRound={addRound} onFinishForTime={finishForTime}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function CountdownDisplay({ countdownNum }: { countdownNum: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2vh" }}>
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(22px,3vw,48px)", color: "rgba(255,255,255,0.5)", letterSpacing: "0.4em" }}>PREPARATI</div>
      <div key={countdownNum} style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(140px,26vw,360px)", fontWeight: 700, color: "#ff8800", textShadow: "0 0 40px #ff8800,0 0 80px #ff880066", lineHeight: 1, animation: "countdown-num 1s ease-in-out" }}>
        {countdownNum}
      </div>
      <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(13px,1.5vw,20px)", color: "rgba(255,255,255,0.25)", letterSpacing: "0.25em" }}>
        {countdownNum <= 3 ? "VIA TRA POCO..." : "secondi all'inizio"}
      </div>
    </div>
  );
}

function RoundPauseDisplay({ timeLeft, totalTime, currentRound, totalRounds, phrase, circleSize }: {
  timeLeft: number; totalTime: number; currentRound: number; totalRounds: number; phrase: string; circleSize: number;
}) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3vh", maxWidth: "92vw" }}>
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(16px,2.2vw,32px)", fontWeight: 500, color: PAUSE_COLOR, textShadow: `0 0 15px ${PAUSE_COLOR}`, letterSpacing: "0.2em" }}>
        PAUSA SERIE — SERIE {currentRound} / {totalRounds}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(28px,5vw,70px)", flexWrap: "wrap", justifyContent: "center" }}>
        <ProgressCircle progress={progress} size={circleSize} strokeWidth={11} color={PAUSE_COLOR}>
          <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(40px,7vw,100px)", fontWeight: 700, color: PAUSE_COLOR, textShadow: `0 0 20px ${PAUSE_COLOR}`, lineHeight: 1 }}>
            {formatTime(timeLeft)}
          </div>
          <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,14px)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginTop: "6px" }}>RIPARTENZA</div>
        </ProgressCircle>

        <div style={{ maxWidth: "clamp(240px,36vw,540px)", background: "rgba(68,136,204,0.07)", border: "1px solid rgba(68,136,204,0.3)", borderRadius: "12px", padding: "clamp(18px,3vh,32px) clamp(18px,3vw,36px)", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.25)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            💬 frase del round
          </div>
          <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(17px,2.1vw,30px)", fontWeight: 500, color: "rgba(255,255,255,0.88)", lineHeight: 1.4, animation: "scale-in 0.4s ease-out" }}>
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
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(48px,8vw,110px)", fontWeight: 700, color: DONE_COLOR, textShadow: `0 0 30px ${DONE_COLOR},0 0 60px ${DONE_COLOR}66`, letterSpacing: "0.3em", animation: "scale-in 0.4s ease-out" }}>
        TEMPO!
      </div>
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(16px,2.2vw,32px)", fontWeight: 300, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em" }}>
        ALLENAMENTO COMPLETATO
      </div>

      {mode === "FOR_TIME" && (
        <div>
          <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,15px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", marginBottom: "8px" }}>TEMPO TOTALE</div>
          <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(56px,9vw,120px)", fontWeight: 700, color: DONE_COLOR, textShadow: `0 0 20px ${DONE_COLOR}`, lineHeight: 1 }}>{formatTime(elapsed)}</div>
        </div>
      )}
      {mode === "AMRAP" && (
        <div>
          <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,15px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", marginBottom: "8px" }}>GIRI TOTALI</div>
          <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,13vw,170px)", fontWeight: 700, color: DONE_COLOR, textShadow: `0 0 20px ${DONE_COLOR}`, lineHeight: 1 }}>{roundCount}</div>
        </div>
      )}

      <div style={{ maxWidth: "clamp(260px,52vw,700px)", background: "rgba(0,255,102,0.05)", border: "1px solid rgba(0,255,102,0.2)", borderRadius: "12px", padding: "clamp(14px,2vh,26px) clamp(18px,3vw,36px)", fontFamily: "Oswald,sans-serif", fontSize: "clamp(15px,1.9vw,27px)", fontWeight: 500, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, animation: "scale-in 0.5s ease-out 0.3s both" }}>
        "{phrase}"
      </div>

      <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(11px,1.1vw,15px)", color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em" }}>
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
}

function RightPanel({ state, mode, onAddRound, onFinishForTime }: RightPanelProps) {
  const setsPerRound  = state.setsPerRound;
  const totalRounds   = state.totalRounds;

  if (mode === "AMRAP") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,15px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em" }}>GIRI COMPLETATI</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,12vw,160px)", fontWeight: 700, color: WORK_COLOR, textShadow: `0 0 30px ${WORK_COLOR}`, lineHeight: 1 }} data-testid="round-count">
          {state.roundCount}
        </div>
        <button data-testid="btn-add-round" onClick={onAddRound}
          style={{ background: "transparent", border: `3px solid ${WORK_COLOR}`, borderRadius: "10px", padding: "12px 32px", fontFamily: "Oswald,sans-serif", fontSize: "clamp(14px,1.8vw,24px)", color: WORK_COLOR, cursor: "pointer", letterSpacing: "0.15em", boxShadow: `0 0 15px ${WORK_COLOR}44`, outline: "none" }}>
          + GIRO
        </button>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em", marginTop: "8px" }}>
          INVIO / ↑ = +Giro • ESC = Menu
        </div>
      </div>
    );
  }

  if (mode === "FOR_TIME") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,15px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em" }}>CAP RIMANENTE</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(36px,5vw,70px)", fontWeight: 700, color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>
          {formatTime(state.timeLeft)}
        </div>
        <button data-testid="btn-done" onClick={onFinishForTime}
          style={{ background: "transparent", border: `3px solid ${REST_COLOR}`, borderRadius: "10px", padding: "14px 36px", fontFamily: "Oswald,sans-serif", fontSize: "clamp(14px,1.8vw,24px)", color: REST_COLOR, cursor: "pointer", letterSpacing: "0.15em", boxShadow: `0 0 15px ${REST_COLOR}44`, outline: "none" }}>
          FINE
        </button>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em", marginTop: "8px" }}>
          INVIO = Fine • ESC = Menu
        </div>
      </div>
    );
  }

  if (mode === "EMOM") {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1.1vw,15px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em" }}>MINUTO</div>
        <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(80px,12vw,160px)", fontWeight: 700, color: WORK_COLOR, textShadow: `0 0 30px ${WORK_COLOR}`, lineHeight: 1 }}>
          {state.currentRound}
        </div>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(11px,1.2vw,16px)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
          di {state.totalRounds} totali
        </div>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em", marginTop: "8px" }}>
          INVIO = Pausa • ESC = Menu
        </div>
      </div>
    );
  }

  /* ── TABATA ── */
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", minWidth: "clamp(160px,22vw,320px)" }}>
      <div style={{ fontFamily: "Oswald,sans-serif", fontSize: "clamp(26px,3.8vw,52px)", fontWeight: 700, color: state.phase === "running" ? WORK_COLOR : REST_COLOR, textShadow: `0 0 20px ${state.phase === "running" ? WORK_COLOR : REST_COLOR}`, letterSpacing: "0.15em" }}>
        {state.phase === "running" ? "LAVORA!" : "RECUPERO"}
      </div>

      {/* Sets per round dots */}
      <div>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.28)", letterSpacing: "0.15em", marginBottom: "8px" }}>
          ESERCIZIO {state.currentSet} / {setsPerRound}
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {Array.from({ length: setsPerRound }).map((_, i) => {
            const done    = i < state.currentSet - 1;
            const current = i === state.currentSet - 1;
            return (
              <div key={i} style={{ width: 26, height: 26, borderRadius: 6, background: done ? `${WORK_COLOR}99` : current ? WORK_COLOR : "rgba(255,255,255,0.1)", boxShadow: current ? `0 0 10px ${WORK_COLOR}` : "none", transition: "all 0.3s ease" }} />
            );
          })}
        </div>
      </div>

      {/* Round dots */}
      <div>
        <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.28)", letterSpacing: "0.15em", marginBottom: "8px" }}>
          SERIE {state.currentRound} / {totalRounds}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", justifyContent: "center", maxWidth: "220px" }}>
          {Array.from({ length: totalRounds }).map((_, i) => {
            const done    = i < state.currentRound - 1;
            const current = i === state.currentRound - 1;
            return (
              <div key={i} style={{ width: 22, height: 22, borderRadius: 5, background: done ? `${PAUSE_COLOR}99` : current ? PAUSE_COLOR : "rgba(255,255,255,0.1)", boxShadow: current ? `0 0 8px ${PAUSE_COLOR}` : "none", transition: "all 0.3s ease" }} />
            );
          })}
        </div>
      </div>

      <div style={{ fontFamily: "Roboto,sans-serif", fontSize: "clamp(10px,1vw,13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em" }}>
        INVIO = Pausa • ESC = Menu
      </div>
    </div>
  );
}
