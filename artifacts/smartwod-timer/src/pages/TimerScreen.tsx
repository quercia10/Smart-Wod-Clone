import { useState, useEffect, useRef, useCallback } from "react";
import ProgressCircle from "@/components/ProgressCircle";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";
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

type Phase = "countdown" | "running" | "rest" | "done";

interface TimerState {
  phase: Phase;
  timeLeft: number;
  totalTime: number;
  currentRound: number;
  totalRounds: number;
  elapsedForTime: number;
  roundCount: number; // AMRAP lap counter
  isWorkPhase: boolean; // TABATA
  countdownNum: number;
  paused: boolean;
}

const MODE_COLOR: Record<WorkoutMode, string> = {
  AMRAP: "#00ff66",
  FOR_TIME: "#ff8800",
  EMOM: "#00ff66",
  TABATA: "#ff3333",
};

const REST_COLOR = "#ff3333";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TimerScreen({ config, onBack }: TimerScreenProps) {
  const mode = config.mode;
  const mainColor = MODE_COLOR[mode];

  const initState = useCallback((): TimerState => {
    return {
      phase: "countdown",
      timeLeft: 10,
      totalTime: 10,
      currentRound: 1,
      totalRounds: getTotalRounds(config),
      elapsedForTime: 0,
      roundCount: 0,
      isWorkPhase: true,
      countdownNum: 10,
      paused: false,
    };
  }, [config]);

  const [state, setState] = useState<TimerState>(initState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeepRef = useRef<number>(-1);

  const currentColor =
    state.phase === "rest" ? REST_COLOR :
    state.phase === "done" ? mainColor :
    state.phase === "countdown" ? "#ff8800" :
    mainColor;

  const progress =
    state.totalTime > 0 ? state.timeLeft / state.totalTime : 0;

  // Advance state by one second
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.paused) return prev;

      const newTimeLeft = prev.timeLeft - 1;
      const newElapsed = prev.phase === "running" || prev.phase === "rest"
        ? prev.elapsedForTime + 1
        : prev.elapsedForTime;

      // Beep on last 3 seconds
      if (
        (prev.phase === "countdown" || prev.phase === "running" || prev.phase === "rest") &&
        newTimeLeft <= 3 &&
        newTimeLeft > 0 &&
        lastBeepRef.current !== newTimeLeft
      ) {
        lastBeepRef.current = newTimeLeft;
        playCountdownBeep();
      }

      if (newTimeLeft <= 0) {
        // Phase transition
        return handlePhaseEnd(prev, config, newElapsed);
      }

      return {
        ...prev,
        timeLeft: newTimeLeft,
        elapsedForTime: newElapsed,
        countdownNum: prev.phase === "countdown" ? newTimeLeft : prev.countdownNum,
      };
    });
  }, [config]);

  useEffect(() => {
    if (state.phase === "done" || state.paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.phase, state.paused, tick]);

  // Sound effects on phase changes
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    if (state.phase !== prevPhaseRef.current) {
      if (state.phase === "running" && prevPhaseRef.current === "countdown") {
        playStartBuzzer();
      } else if (state.phase === "rest") {
        playRestBeep();
      } else if (state.phase === "running" && prevPhaseRef.current === "rest") {
        playTripleBeep();
      } else if (state.phase === "done") {
        playEndBuzzer();
      }
      prevPhaseRef.current = state.phase;
    }
  }, [state.phase]);

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Backspace") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onBack();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (state.phase === "done") {
          onBack();
          return;
        }
        if (state.phase === "running") {
          // AMRAP: count round
          if (mode === "AMRAP") {
            setState((prev) => ({ ...prev, roundCount: prev.roundCount + 1 }));
            playBeep();
            return;
          }
          // FOR TIME: finish early
          if (mode === "FOR_TIME") {
            setState((prev) => ({ ...prev, phase: "done", timeLeft: 0 }));
            return;
          }
        }
        // Pause/Resume for everything else
        setState((prev) => ({ ...prev, paused: !prev.paused }));
      }
      // AMRAP round counter via ArrowUp
      if (e.key === "ArrowUp" && mode === "AMRAP" && state.phase === "running") {
        setState((prev) => ({ ...prev, roundCount: prev.roundCount + 1 }));
        playBeep();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.phase, mode, onBack]);

  const isCountdown = state.phase === "countdown";
  const isDone = state.phase === "done";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2vh 4vw",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: "clamp(20px, 2.5vw, 36px)",
            fontWeight: 700,
            color: currentColor,
            textShadow: `0 0 15px ${currentColor}`,
            letterSpacing: "0.2em",
          }}
        >
          {mode.replace("_", " ")}
        </div>

        {/* Round info */}
        {(mode === "EMOM" || mode === "TABATA") && state.phase !== "countdown" && state.phase !== "done" && (
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "clamp(16px, 2vw, 28px)",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.1em",
            }}
          >
            ROUND{" "}
            <span style={{ color: "white", fontWeight: 700 }}>
              {state.currentRound}
            </span>
            {" / "}
            {state.totalRounds}
          </div>
        )}
        {mode === "TABATA" && state.phase !== "countdown" && (
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "clamp(14px, 1.6vw, 22px)",
              color: state.isWorkPhase ? "#00ff66" : REST_COLOR,
              letterSpacing: "0.15em",
              textShadow: state.isWorkPhase ? "0 0 10px #00ff66" : `0 0 10px ${REST_COLOR}`,
            }}
          >
            {state.isWorkPhase ? "LAVORO" : "RIPOSO"}
          </div>
        )}

        {/* Pause indicator */}
        {state.paused && state.phase !== "done" && (
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "clamp(14px, 1.6vw, 22px)",
              color: "#ff8800",
              textShadow: "0 0 10px #ff8800",
              letterSpacing: "0.2em",
              animation: "pulse-neon 1s ease-in-out infinite",
            }}
          >
            ⏸ PAUSA
          </div>
        )}
      </div>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(40px, 6vw, 100px)",
          padding: "2vh 4vw",
        }}
      >
        {isCountdown ? (
          <CountdownDisplay countdownNum={state.countdownNum} color={currentColor} />
        ) : isDone ? (
          <DoneDisplay mode={mode} elapsed={state.elapsedForTime} roundCount={state.roundCount} color={mainColor} />
        ) : (
          <>
            {/* Progress circle with timer */}
            <ProgressCircle
              progress={progress}
              size={Math.min(window.innerHeight * 0.6, window.innerWidth * 0.4, 420)}
              strokeWidth={14}
              color={currentColor}
            >
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "clamp(48px, 8vw, 120px)",
                  fontWeight: 700,
                  color: currentColor,
                  textShadow: `0 0 20px ${currentColor}, 0 0 40px ${currentColor}66`,
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                }}
                data-testid="timer-display"
              >
                {mode === "FOR_TIME"
                  ? formatElapsed(state.elapsedForTime)
                  : formatTime(state.timeLeft)}
              </div>
              {mode !== "FOR_TIME" && (
                <div
                  style={{
                    fontFamily: "Roboto, sans-serif",
                    fontSize: "clamp(12px, 1.3vw, 18px)",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.2em",
                    marginTop: "8px",
                  }}
                >
                  {state.phase === "rest" ? "RIPOSO" : "RIMANENTI"}
                </div>
              )}
              {mode === "FOR_TIME" && (
                <div
                  style={{
                    fontFamily: "Roboto, sans-serif",
                    fontSize: "clamp(12px, 1.3vw, 18px)",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.2em",
                    marginTop: "8px",
                  }}
                >
                  TRASCORSI
                </div>
              )}
            </ProgressCircle>

            {/* Right side info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(20px, 3vh, 48px)",
                minWidth: "clamp(200px, 28vw, 400px)",
              }}
            >
              {/* AMRAP round counter */}
              {mode === "AMRAP" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(11px, 1.2vw, 16px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "8px" }}>GIRI COMPLETATI</div>
                  <div
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "clamp(80px, 12vw, 160px)",
                      fontWeight: 700,
                      color: mainColor,
                      textShadow: `0 0 30px ${mainColor}`,
                      lineHeight: 1,
                    }}
                    data-testid="round-count"
                  >
                    {state.roundCount}
                  </div>
                  <button
                    data-testid="btn-add-round"
                    onClick={() => { setState((p) => ({ ...p, roundCount: p.roundCount + 1 })); playBeep(); }}
                    style={{
                      marginTop: "16px",
                      background: "transparent",
                      border: `3px solid ${mainColor}`,
                      borderRadius: "10px",
                      padding: "12px 32px",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "clamp(14px, 1.8vw, 24px)",
                      color: mainColor,
                      cursor: "pointer",
                      letterSpacing: "0.15em",
                      boxShadow: `0 0 15px ${mainColor}44`,
                      transition: "all 0.15s ease",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = `${mainColor}22`;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "transparent";
                    }}
                  >
                    + GIRO
                  </button>
                </div>
              )}

              {/* FOR_TIME: cap time remaining */}
              {mode === "FOR_TIME" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(11px, 1.2vw, 16px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "8px" }}>CAP RIMANENTE</div>
                  <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(36px, 5vw, 72px)", fontWeight: 700, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>
                    {formatTime(state.timeLeft)}
                  </div>
                  <button
                    data-testid="btn-done"
                    onClick={() => setState((p) => ({ ...p, phase: "done" }))}
                    style={{
                      marginTop: "24px",
                      background: "transparent",
                      border: `3px solid ${mainColor}`,
                      borderRadius: "10px",
                      padding: "14px 36px",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "clamp(14px, 1.8vw, 24px)",
                      color: mainColor,
                      cursor: "pointer",
                      letterSpacing: "0.15em",
                      boxShadow: `0 0 15px ${mainColor}44`,
                      outline: "none",
                    }}
                  >
                    FINE
                  </button>
                </div>
              )}

              {/* EMOM: current minute */}
              {mode === "EMOM" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(11px, 1.2vw, 16px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "8px" }}>MINUTO CORRENTE</div>
                  <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "clamp(80px, 12vw, 160px)", fontWeight: 700, color: mainColor, textShadow: `0 0 30px ${mainColor}`, lineHeight: 1 }}>
                    {state.currentRound}
                  </div>
                  <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(12px, 1.3vw, 18px)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                    di {state.totalRounds} totali
                  </div>
                </div>
              )}

              {/* TABATA: work/rest indicator */}
              {mode === "TABATA" && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "clamp(32px, 5vw, 72px)",
                      fontWeight: 700,
                      color: state.isWorkPhase ? "#00ff66" : REST_COLOR,
                      textShadow: `0 0 25px ${state.isWorkPhase ? "#00ff66" : REST_COLOR}`,
                      letterSpacing: "0.15em",
                    }}
                  >
                    {state.isWorkPhase ? "LAVORA!" : "RIPOSA!"}
                  </div>
                  <div style={{ marginTop: "16px", fontFamily: "Roboto, sans-serif", fontSize: "clamp(12px, 1.3vw, 18px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>
                    ROUND {state.currentRound} / {state.totalRounds}
                  </div>
                  {/* Mini grid of rounds */}
                  <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "280px" }}>
                    {Array.from({ length: state.totalRounds }).map((_, i) => {
                      const done = i < state.currentRound - 1;
                      const current = i === state.currentRound - 1;
                      return (
                        <div
                          key={i}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: done ? `${mainColor}99` : current ? mainColor : "rgba(255,255,255,0.1)",
                            border: current ? `2px solid ${mainColor}` : "none",
                            boxShadow: current ? `0 0 10px ${mainColor}` : "none",
                            transition: "all 0.3s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Controls hint */}
              <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(10px, 1vw, 13px)", color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em", textAlign: "center" }}>
                {mode === "AMRAP" && "INVIO / ↑ = +Giro"}
                {mode === "FOR_TIME" && "INVIO = Fine"}
                {(mode === "EMOM" || mode === "TABATA") && "INVIO = Pausa/Riprendi"}
                {" • ESC = Menu"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CountdownDisplay({ countdownNum, color }: { countdownNum: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2vh",
      }}
    >
      <div
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "clamp(24px, 3.5vw, 52px)",
          fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
        }}
      >
        PREPARATI
      </div>
      <div
        key={countdownNum}
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "clamp(160px, 28vw, 380px)",
          fontWeight: 700,
          color,
          textShadow: `0 0 40px ${color}, 0 0 80px ${color}66`,
          lineHeight: 1,
          animation: "countdown-num 1s ease-in-out",
        }}
      >
        {countdownNum <= 3 ? countdownNum : ""}
      </div>
      {countdownNum > 3 && (
        <div
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: "clamp(80px, 16vw, 220px)",
            fontWeight: 700,
            color,
            textShadow: `0 0 30px ${color}, 0 0 60px ${color}66`,
            lineHeight: 1,
          }}
        >
          {countdownNum}
        </div>
      )}
      <div
        style={{
          fontFamily: "Roboto, sans-serif",
          fontSize: "clamp(14px, 1.8vw, 24px)",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.3em",
          marginTop: "1vh",
        }}
      >
        {countdownNum <= 3 ? "VIA TRA POCO..." : "secondi all'inizio"}
      </div>
    </div>
  );
}

function DoneDisplay({
  mode,
  elapsed,
  roundCount,
  color,
}: {
  mode: WorkoutMode;
  elapsed: number;
  roundCount: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3vh",
      }}
    >
      <div
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "clamp(36px, 6vw, 90px)",
          fontWeight: 700,
          color,
          textShadow: `0 0 30px ${color}, 0 0 60px ${color}66`,
          letterSpacing: "0.3em",
          animation: "scale-in 0.4s ease-out",
        }}
      >
        TEMPO!
      </div>
      <div
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "clamp(20px, 3vw, 48px)",
          fontWeight: 300,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.2em",
        }}
      >
        ALLENAMENTO COMPLETATO
      </div>

      {mode === "FOR_TIME" && (
        <div style={{ marginTop: "2vh", textAlign: "center" }}>
          <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(12px, 1.3vw, 18px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "12px" }}>TEMPO TOTALE</div>
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "clamp(60px, 10vw, 130px)",
              fontWeight: 700,
              color,
              textShadow: `0 0 20px ${color}`,
              lineHeight: 1,
            }}
          >
            {formatElapsed(elapsed)}
          </div>
        </div>
      )}

      {mode === "AMRAP" && (
        <div style={{ marginTop: "2vh", textAlign: "center" }}>
          <div style={{ fontFamily: "Roboto, sans-serif", fontSize: "clamp(12px, 1.3vw, 18px)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "12px" }}>GIRI TOTALI</div>
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "clamp(80px, 14vw, 180px)",
              fontWeight: 700,
              color,
              textShadow: `0 0 20px ${color}`,
              lineHeight: 1,
            }}
          >
            {roundCount}
          </div>
        </div>
      )}

      <div style={{ marginTop: "4vh", fontFamily: "Roboto, sans-serif", fontSize: "clamp(12px, 1.3vw, 18px)", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}>
        INVIO / ESC = Menu
      </div>
    </div>
  );
}

function getTotalRounds(config: WorkoutConfig): number {
  if (config.mode === "EMOM") return config.rounds ?? 10;
  if (config.mode === "TABATA") return config.rounds ?? 8;
  return 1;
}

function handlePhaseEnd(prev: TimerState, config: WorkoutConfig, newElapsed: number): TimerState {
  const mode = config.mode;

  if (prev.phase === "countdown") {
    // Start the workout
    const runTime = getInitialRunTime(config);
    return {
      ...prev,
      phase: "running",
      timeLeft: runTime,
      totalTime: runTime,
      elapsedForTime: 0,
      isWorkPhase: true,
    };
  }

  if (mode === "AMRAP") {
    if (prev.phase === "running") {
      return { ...prev, phase: "done", timeLeft: 0, elapsedForTime: newElapsed };
    }
  }

  if (mode === "FOR_TIME") {
    if (prev.phase === "running") {
      return { ...prev, phase: "done", timeLeft: 0, elapsedForTime: newElapsed };
    }
  }

  if (mode === "EMOM") {
    if (prev.phase === "running") {
      const nextRound = prev.currentRound + 1;
      if (nextRound > prev.totalRounds) {
        return { ...prev, phase: "done", timeLeft: 0, elapsedForTime: newElapsed };
      }
      const interval = (config.duration ?? 60);
      return {
        ...prev,
        phase: "running",
        currentRound: nextRound,
        timeLeft: interval,
        totalTime: interval,
        elapsedForTime: newElapsed,
      };
    }
  }

  if (mode === "TABATA") {
    if (prev.phase === "running") {
      // Work phase ended → rest phase
      const restTime = config.restTime ?? 10;
      return {
        ...prev,
        phase: "rest",
        isWorkPhase: false,
        timeLeft: restTime,
        totalTime: restTime,
        elapsedForTime: newElapsed,
      };
    }
    if (prev.phase === "rest") {
      // Rest ended → next round work or done
      const nextRound = prev.currentRound + 1;
      if (nextRound > prev.totalRounds) {
        return { ...prev, phase: "done", timeLeft: 0, elapsedForTime: newElapsed };
      }
      const workTime = config.workTime ?? 20;
      return {
        ...prev,
        phase: "running",
        isWorkPhase: true,
        currentRound: nextRound,
        timeLeft: workTime,
        totalTime: workTime,
        elapsedForTime: newElapsed,
      };
    }
  }

  return { ...prev, phase: "done", timeLeft: 0 };
}

function getInitialRunTime(config: WorkoutConfig): number {
  if (config.mode === "AMRAP") return config.duration ?? 600;
  if (config.mode === "FOR_TIME") return config.duration ?? 1200;
  if (config.mode === "EMOM") return config.duration ?? 60;
  if (config.mode === "TABATA") return config.workTime ?? 20;
  return 60;
}
