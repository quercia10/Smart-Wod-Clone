export type WorkoutMode = "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA";

export type AppState =
  | "menu"
  | "config"
  | "countdown"
  | "running"
  | "rest"
  | "round-pause"
  | "done";

export interface WorkoutConfig {
  mode: WorkoutMode;
  duration?: number;       // seconds for AMRAP / FOR_TIME / EMOM interval
  rounds?: number;         // for EMOM / TABATA (complete rounds)
  setsPerRound?: number;   // TABATA: work/rest sets per round
  workTime?: number;       // TABATA work seconds
  restTime?: number;       // TABATA short rest seconds
  roundPauseTime?: number; // TABATA long pause between rounds
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
  TABATA: "Lavoro / Recupero / Pausa Round",
};

export const MODE_COLORS: Record<WorkoutMode, string> = {
  AMRAP: "neon-green",
  FOR_TIME: "neon-orange",
  EMOM: "neon-green",
  TABATA: "neon-red",
};
