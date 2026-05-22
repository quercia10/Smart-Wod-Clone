let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext({ latencyHint: "interactive" });
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function bell(
  ctx: AudioContext,
  freq: number,
  peakGain: number,
  decayTime: number,
  startAt = 0,
): void {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startAt + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + decayTime);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + decayTime + 0.02);
}

/* ── Countdown beep: sordo, basso, 375Hz ── */
export function playCountdownBeep(): void {
  const ctx = getCtx();
  bell(ctx, 375, 0.48, 0.18);
}

/* ── AMRAP: +giro feedback ── */
export function playBeep(): void {
  const ctx = getCtx();
  bell(ctx, 600, 0.45, 0.14);
}

/* ── Triple beep: ripresa dopo rest / round-pause ── */
export function playTripleBeep(): void {
  const ctx = getCtx();
  [0, 0.20, 0.40].forEach((d) => bell(ctx, 700, 0.48, 0.13, d));
}

/* ── Start buzzer: campana digitale 800Hz con decadimento ── */
export function playStartBuzzer(): void {
  const ctx = getCtx();
  bell(ctx, 800, 0.65, 1.0);
  bell(ctx, 1600, 0.28, 0.5);
}

/* ── End buzzer: due toni discendenti ── */
export function playEndBuzzer(): void {
  const ctx = getCtx();
  bell(ctx, 800, 0.60, 0.75, 0);
  bell(ctx, 560, 0.55, 0.90, 0.35);
}

/* ── Victory fanfare: arpeggio ascendente C5→E5→G5→C6 + accordo finale ── */
export function playFanfare(): void {
  const ctx = getCtx();
  bell(ctx, 523,  0.52, 0.22, 0.00);   // C5
  bell(ctx, 659,  0.52, 0.22, 0.13);   // E5
  bell(ctx, 784,  0.55, 0.22, 0.26);   // G5
  bell(ctx, 1047, 0.62, 1.50, 0.40);   // C6 — tenuto
  bell(ctx, 784,  0.36, 1.30, 0.42);   // G5 armonia
  bell(ctx, 659,  0.26, 1.00, 0.44);   // E5 armonia
  bell(ctx, 2093, 0.18, 0.50, 0.40);   // C7 sparkle
}

/* ── Rest beep: tono morbido a 500Hz ── */
export function playRestBeep(): void {
  const ctx = getCtx();
  bell(ctx, 500, 0.42, 0.36);
}

export function resumeAudio(): void {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
