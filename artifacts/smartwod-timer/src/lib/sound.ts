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

/* ── Super Mario Course Clear — versione soft ── */
export function playFanfare(): void {
  const ctx = getCtx();

  // Compressore master: ammorbidisce i picchi senza distorcere
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-20, ctx.currentTime);
  comp.knee.setValueAtTime(12, ctx.currentTime);
  comp.ratio.setValueAtTime(5, ctx.currentTime);
  comp.attack.setValueAtTime(0.004, ctx.currentTime);
  comp.release.setValueAtTime(0.30, ctx.currentTime);
  comp.connect(ctx.destination);

  // Gain master ridotto: suona dolce, non squillante
  const master = ctx.createGain();
  master.connect(comp);
  master.gain.setValueAtTime(0.55, ctx.currentTime);

  function note(
    freq: number,
    peakGain: number,
    attack: number,
    hold: number,
    release: number,
    startAt: number,
  ) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(master);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
    gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startAt + attack);
    gain.gain.setValueAtTime(peakGain, ctx.currentTime + startAt + attack + hold);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + attack + hold + release);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + startAt + attack + hold + release + 0.05);
  }

  // Super Mario Bros — Course Clear
  //                  freq    gain  atk   hold  rel   start
  note(392.0,         0.18, 0.012, 0.08, 0.11, 0.00); // G4
  note(523.3,         0.18, 0.012, 0.08, 0.11, 0.15); // C5
  note(659.3,         0.18, 0.012, 0.08, 0.11, 0.30); // E5
  note(784.0,         0.20, 0.012, 0.20, 0.13, 0.45); // G5
  note(659.3,         0.16, 0.012, 0.08, 0.11, 0.68); // E5
  note(784.0,         0.20, 0.015, 0.40, 0.22, 0.80); // G5 (tenuto)
  // Accordo finale C maggiore — gains scalati per registro
  note(523.3,         0.14, 0.09,  1.10, 0.80, 1.24); // C5 (root grave, caldo)
  note(659.3,         0.11, 0.12,  1.00, 0.70, 1.24); // E5
  note(784.0,         0.09, 0.15,  0.90, 0.60, 1.24); // G5
  note(1046.5,        0.06, 0.20,  0.80, 0.55, 1.24); // C6 (molto quieto)
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
