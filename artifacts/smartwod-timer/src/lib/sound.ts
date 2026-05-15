let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  volume = 0.6,
  type: OscillatorType = "square",
  delay = 0,
): void {
  const ctx = getCtx();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay);

  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + 0.01);
}

export function playBeep(): void {
  playTone(880, 0.12, 0.5, "square");
}

export function playCountdownBeep(): void {
  playTone(660, 0.15, 0.55, "square");
}

export function playTripleBeep(): void {
  playTone(880, 0.1, 0.5, "square", 0);
  playTone(880, 0.1, 0.5, "square", 0.15);
  playTone(880, 0.1, 0.5, "square", 0.3);
}

export function playStartBuzzer(): void {
  playTone(440, 0.08, 0.6, "sawtooth", 0);
  playTone(550, 0.08, 0.6, "sawtooth", 0.1);
  playTone(660, 0.08, 0.6, "sawtooth", 0.2);
  playTone(880, 0.4, 0.7, "sawtooth", 0.3);
}

export function playEndBuzzer(): void {
  playTone(880, 0.08, 0.6, "sawtooth", 0);
  playTone(660, 0.08, 0.6, "sawtooth", 0.1);
  playTone(440, 0.08, 0.6, "sawtooth", 0.2);
  playTone(220, 0.6, 0.7, "sawtooth", 0.3);
}

export function playRestBeep(): void {
  playTone(440, 0.2, 0.5, "sine");
}

export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}
