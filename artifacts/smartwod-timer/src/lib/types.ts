export type WorkoutMode = "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA";

export type AppState =
  | "menu"
  | "config"
  | "countdown"
  | "running"
  | "rest"
  | "done";

export interface WorkoutConfig {
  mode: WorkoutMode;
  duration?: number; // seconds for AMRAP / FOR_TIME / EMOM interval
  rounds?: number; // for EMOM / TABATA
  workTime?: number; // TABATA work seconds
  restTime?: number; // TABATA rest seconds
}

export interface TimerState {
  appState: AppState;
  config: WorkoutConfig | null;
  timeLeft: number;
  totalTime: number;
  currentRound: number;
  totalRounds: number;
  elapsedTime: number;
  roundCount: number; // AMRAP lap counter
  isWorkPhase: boolean; // TABATA
  countdownNum: number;
}

export const MODE_LABELS: Record<WorkoutMode, string> = {
  AMRAP: "AMRAP",
  FOR_TIME: "FOR TIME",
  EMOM: "EMOM",
  TABATA: "TABATA",
};

export const MODE_SUBTITLES: Record<WorkoutMode, string> = {
  AMRAP: "Quanti più giri possibili",
  FOR_TIME: "A tempo",
  EMOM: "Ogni minuto nel minuto",
  TABATA: "8 round 20s lavoro / 10s riposo",
};

export const MODE_COLORS: Record<WorkoutMode, string> = {
  AMRAP: "neon-green",
  FOR_TIME: "neon-orange",
  EMOM: "neon-green",
  TABATA: "neon-red",
};
