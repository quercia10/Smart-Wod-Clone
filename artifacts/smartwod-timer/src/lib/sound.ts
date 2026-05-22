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

/* ── Square-wave note: stile 8-bit retro ── */
function retro(
  ctx: AudioContext,
  freq: number,
  gain: number,
  dur: number,
  startAt = 0,
): void {
  const osc  = ctx.createOscillator();
  const g    = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  g.gain.setValueAtTime(0, ctx.currentTime + startAt);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + startAt + 0.008);
  g.gain.setValueAtTime(gain, ctx.currentTime + startAt + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + dur);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + dur + 0.02);
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

/* ── Super Mario Bros — Course Clear jingle (8-bit square wave) ── */
export function playFanfare(): void {
  const ctx = getCtx();
  // Ascending run
  retro(ctx, 392,  0.18, 0.11, 0.00);  // G4
  retro(ctx, 523,  0.18, 0.11, 0.11);  // C5
  retro(ctx, 659,  0.18, 0.11, 0.22);  // E5
  retro(ctx, 784,  0.20, 0.22, 0.33);  // G5
  retro(ctx, 659,  0.18, 0.11, 0.55);  // E5
  retro(ctx, 784,  0.22, 0.44, 0.66);  // G5
  // Final triumphant chord C6 + G5 + E5
  retro(ctx, 1047, 0.20, 1.60, 1.10);  // C6
  retro(ctx, 784,  0.14, 1.30, 1.10);  // G5
  retro(ctx, 659,  0.10, 1.00, 1.10);  // E5
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

/* ── Keep-awake: oscillatore inudibile per prevenire lo standby del TV ── */
let wakeOsc: OscillatorNode | null = null;

export function keepAwake(): void {
  if (wakeOsc) return;
  try {
    const ctx = getCtx();
    wakeOsc = ctx.createOscillator();
    const g = ctx.createGain();
    wakeOsc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    wakeOsc.frequency.setValueAtTime(20, ctx.currentTime);
    wakeOsc.start();
  } catch (_) {}
}

export function releaseAwake(): void {
  try { wakeOsc?.stop(); } catch (_) {}
  wakeOsc = null;
}
