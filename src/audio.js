const MUSIC_PATTERNS = [
  {
    tempo: 110,
    sequence: [
      [0, 0.9],
      [3, 0.6],
      [5, 0.7],
      [7, 0.6],
    ],
    detune: 0,
  },
  {
    tempo: 124,
    sequence: [
      [0, 0.8],
      [2, 0.6],
      [4, 0.9],
      [7, 0.7],
    ],
    detune: -12,
  },
  {
    tempo: 136,
    sequence: [
      [0, 0.85],
      [2, 0.75],
      [5, 0.9],
      [7, 0.8],
    ],
    detune: 12,
  },
];

const NOTE_FREQUENCIES = [
  220,
  233.08,
  246.94,
  261.63,
  277.18,
  293.66,
  311.13,
  329.63,
];

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicSource = null;
    this.musicStage = -1;
    this.enabled = true;
    this.lastShotTime = 0;
  }

  initContext() {
    if (this.context || typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.context = new AudioCtx();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.gain.value = 0.4;
    this.sfxGain.gain.value = 0.8;
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  async resume() {
    this.initContext();
    if (!this.context) return;
    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Audio resume failed", error);
      }
    }
  }

  toggleMute() {
    if (!this.masterGain) {
      this.enabled = !this.enabled;
      return this.enabled;
    }
    this.enabled = !this.enabled;
    this.masterGain.gain.value = this.enabled ? 1 : 0;
    return this.enabled;
  }

  playShot() {
    if (!this.enabled) return;
    const now = this.context?.currentTime ?? 0;
    if (now - this.lastShotTime < 0.04) return;
    this.lastShotTime = now;
    const ctx = this.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playExplosion(power = 1) {
    if (!this.enabled) return;
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, power * 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.6 * power;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  playHit() {
    if (!this.enabled) return;
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playBomb() {
    if (!this.enabled) return;
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.9);
    gain.gain.value = 0.45;
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1);
  }

  playPowerUp() {
    if (!this.enabled) return;
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.2);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playBossWarning() {
    if (!this.enabled) return;
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.6);
    gain.gain.value = 0.3;
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  setMusicStage(stageIndex) {
    if (!this.enabled) return;
    if (this.musicStage === stageIndex) return;
    this.musicStage = stageIndex;
    const ctx = this.context;
    if (!ctx) return;
    const pattern = MUSIC_PATTERNS[stageIndex % MUSIC_PATTERNS.length];
    const buffer = this._createMusicBuffer(pattern);
    if (!buffer) return;
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (_) {
        // ignore
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
    this.musicSource = source;
  }

  _createMusicBuffer(pattern) {
    const ctx = this.context;
    if (!ctx) return null;
    const beatsPerBar = pattern.sequence.length;
    const secondsPerBeat = 60 / pattern.tempo;
    const duration = secondsPerBeat * beatsPerBar;
    const buffer = ctx.createBuffer(1, Math.ceil(duration * ctx.sampleRate), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const detune = Math.pow(2, pattern.detune / 12);
    for (let bar = 0; bar < 2; bar += 1) {
      for (let i = 0; i < pattern.sequence.length; i += 1) {
        const [noteIndex, level] = pattern.sequence[i];
        const frequency = NOTE_FREQUENCIES[noteIndex] * detune;
        const startTime = (bar * beatsPerBar + i) * secondsPerBeat;
        const startSample = Math.floor(startTime * ctx.sampleRate);
        const endSample = startSample + Math.floor(secondsPerBeat * ctx.sampleRate);
        for (let sample = startSample; sample < endSample && sample < data.length; sample += 1) {
          const t = (sample - startSample) / (endSample - startSample);
          const envelope = Math.pow(1 - t, 3);
          data[sample] += Math.sin((sample / ctx.sampleRate) * Math.PI * 2 * frequency) * envelope * level * 0.2;
        }
      }
    }
    return buffer;
  }
}
