class KitchenAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.lastSizzleAt = 0;
  }

  unlock() {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.noiseBuffer = this._createNoiseBuffer(this.ctx);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Headless or restricted audio environments fail silently
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  isMuted() {
    return this.muted;
  }

  _createNoiseBuffer(ctx) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _ready() {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return false;
    return true;
  }

  _tone(freqStart, freqEnd, duration, type = 'sine', volume = 0.14, delay = 0) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPickup() {
    this.unlock();
    this._tone(420, 620, 0.09, 'triangle', 0.11);
  }

  playPlace() {
    this.unlock();
    this._tone(340, 240, 0.08, 'triangle', 0.11);
  }

  playChop() {
    this.unlock();
    if (!this._ready()) return;
    this._tone(210, 95, 0.06, 'square', 0.08);
    if (this.noiseBuffer) {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(2.5, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
      src.stop(now + 0.06);
    }
  }

  playSizzleTick(intensity = 0.6) {
    if (!this._ready() || !this.noiseBuffer) return;
    const nowMs = performance.now();
    if (nowMs - this.lastSizzleAt < 230) return;
    this.lastSizzleAt = nowMs;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3400 + Math.random() * 1400, now);
    const gain = this.ctx.createGain();
    const vol = Math.min(0.055, 0.024 + intensity * 0.028);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now, Math.random() * 0.15, 0.23);
  }

  playPerfectChime() {
    this.unlock();
    this._tone(784, 784, 0.14, 'sine', 0.12, 0);
    this._tone(1046.5, 1046.5, 0.24, 'triangle', 0.13, 0.07);
  }

  playBurnAlert() {
    this.unlock();
    this._tone(220, 175, 0.14, 'sawtooth', 0.09, 0);
    this._tone(185, 140, 0.18, 'sawtooth', 0.08, 0.16);
  }

  playDishComplete() {
    this.unlock();
    this._tone(523.25, 523.25, 0.14, 'triangle', 0.11, 0);
    this._tone(659.25, 659.25, 0.14, 'triangle', 0.11, 0.06);
    this._tone(783.99, 783.99, 0.22, 'triangle', 0.12, 0.12);
  }

  playBellServe() {
    this.unlock();
    // Classic warm brass pass bell partials
    this._tone(1318.5, 1318.5, 0.72, 'sine', 0.15, 0);
    this._tone(2637.0, 2637.0, 0.48, 'sine', 0.07, 0);
    this._tone(3951.0, 3951.0, 0.28, 'sine', 0.04, 0);
    this._tone(1046.5, 1567.98, 0.22, 'triangle', 0.09, 0.09);
  }

  playTrash() {
    this.unlock();
    this._tone(170, 82, 0.14, 'triangle', 0.1);
  }

  playOrderExpired() {
    this.unlock();
    this._tone(320, 220, 0.22, 'triangle', 0.09, 0);
    this._tone(220, 165, 0.26, 'triangle', 0.08, 0.14);
  }

  playShiftEnd() {
    this.unlock();
    this._tone(523.25, 523.25, 0.16, 'triangle', 0.11, 0);
    this._tone(659.25, 659.25, 0.16, 'triangle', 0.11, 0.09);
    this._tone(783.99, 783.99, 0.18, 'triangle', 0.12, 0.18);
    this._tone(1046.5, 1046.5, 0.45, 'sine', 0.14, 0.27);
  }
}

export const audio = new KitchenAudio();
