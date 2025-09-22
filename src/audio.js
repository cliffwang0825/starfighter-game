const MUSIC_PATTERNS = [
  {
    tempo: 168,
    riff: [
      { note: 0, level: 1.1, sustain: 0.5 },
      { note: 7, level: 0.96, sustain: 0.5 },
      { note: 5, level: 1.04, sustain: 0.5 },
      { note: 7, level: 0.94, sustain: 0.5 },
      { note: 3, level: 1, sustain: 0.5 },
      { note: 7, level: 0.94, sustain: 0.5 },
      { note: 5, level: 1.06, sustain: 0.5 },
      { note: 3, level: 0.92, sustain: 0.5 },
    ],
    bass: [
      { note: 0, sustain: 1.5, level: 1.25 },
      null,
      { note: 0, sustain: 0.5, level: 0.9 },
      null,
      { note: 5, sustain: 1, level: 1.18 },
      null,
      { note: 3, sustain: 1, level: 1.04 },
      null,
    ],
    lead: [
      { offset: 0.5, note: 12, length: 0.5, level: 0.4 },
      { offset: 2.5, note: 14, length: 0.5, level: 0.38 },
      { offset: 5.5, note: 15, length: 0.5, level: 0.36 },
    ],
    snareBeats: [2, 6],
    detune: -2,
    drive: 4.3,
    bars: 4,
  },
  {
    tempo: 176,
    riff: [
      { note: 2, level: 1.08, sustain: 0.5 },
      { note: 9, level: 0.96, sustain: 0.5 },
      { note: 7, level: 1.02, sustain: 0.5 },
      { note: 9, level: 0.96, sustain: 0.5 },
      { note: 4, level: 1.02, sustain: 0.5 },
      { note: 9, level: 0.94, sustain: 0.5 },
      { note: 7, level: 1.06, sustain: 0.5 },
      { note: 4, level: 0.92, sustain: 0.5 },
    ],
    bass: [
      { note: 2, sustain: 1.5, level: 1.2 },
      null,
      { note: 2, sustain: 0.5, level: 0.92 },
      null,
      { note: 7, sustain: 1, level: 1.18 },
      null,
      { note: 4, sustain: 1, level: 1.05 },
      null,
    ],
    lead: [
      { offset: 1, note: 14, length: 0.5, level: 0.38 },
      { offset: 3.5, note: 16, length: 0.5, level: 0.36 },
      { offset: 6.5, note: 19, length: 0.5, level: 0.34 },
    ],
    snareBeats: [2, 6],
    detune: -5,
    drive: 4.4,
    bars: 4,
  },
  {
    tempo: 184,
    riff: [
      { note: 5, level: 1.12, sustain: 0.5 },
      { note: 12, level: 0.98, sustain: 0.5 },
      { note: 10, level: 1.06, sustain: 0.5 },
      { note: 12, level: 0.98, sustain: 0.5 },
      { note: 7, level: 1.04, sustain: 0.5 },
      { note: 12, level: 0.96, sustain: 0.5 },
      { note: 10, level: 1.08, sustain: 0.5 },
      { note: 7, level: 0.94, sustain: 0.5 },
    ],
    bass: [
      { note: 5, sustain: 1, level: 1.22 },
      null,
      { note: 5, sustain: 0.5, level: 0.94 },
      null,
      { note: 10, sustain: 1, level: 1.16 },
      null,
      { note: 7, sustain: 1, level: 1.1 },
      { note: 12, sustain: 0.5, level: 0.9 },
    ],
    lead: [
      { offset: 0.5, note: 17, length: 0.5, level: 0.38 },
      { offset: 2.5, note: 19, length: 0.5, level: 0.36 },
      { offset: 4.5, note: 21, length: 0.5, level: 0.34 },
      { offset: 7, note: 24, length: 0.5, level: 0.32 },
    ],
    snareBeats: [2, 6, 7.5],
    detune: 4,
    drive: 4.6,
    bars: 4,
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
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicVolume = 0.48;
    this.sfxVolume = 0.8;
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
    this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
    this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
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

  toggleMusicMute() {
    this.initContext();
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
    }
    if (this.musicEnabled) {
      if (this.musicStage >= 0) {
        const stage = this.musicStage;
        this.musicStage = -1;
        this.setMusicStage(stage);
      }
    } else if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (_) {
        // ignore
      }
      this.musicSource = null;
    }
    return this.musicEnabled;
  }

  toggleSfxMute() {
    this.initContext();
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
    }
    return this.sfxEnabled;
  }

  playShot() {
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    this.initContext();
    if (this.musicStage === stageIndex) return;
    this.musicStage = stageIndex;
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (_) {
        // ignore
      }
      this.musicSource = null;
    }

    if (!this.musicEnabled) {
      return;
    }
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
    const beatsPerBar = pattern.riff.length;
    const bars = Math.max(1, pattern.bars ?? 4);
    const secondsPerBeat = 60 / pattern.tempo;
    const totalBeats = beatsPerBar * bars;
    const duration = secondsPerBeat * totalBeats;
    const buffer = ctx.createBuffer(1, Math.ceil(duration * ctx.sampleRate), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const detune = Math.pow(2, (pattern.detune ?? 0) / 12);
    const drive = pattern.drive ?? 3.2;

    for (let beat = 0; beat < totalBeats; beat += 1) {
      const step = pattern.riff[beat % beatsPerBar];
      if (!step) continue;
      const sustain = Math.max(0.5, step.sustain ?? 1);
      const level = step.level ?? 1;
      const baseNote = step.note;
      const startSample = Math.floor(beat * secondsPerBeat * ctx.sampleRate);
      const endSample = Math.min(
        data.length,
        Math.floor((beat + sustain) * secondsPerBeat * ctx.sampleRate),
      );
      const length = Math.max(1, endSample - startSample);
      const baseFreq = frequencyFor(baseNote, detune);
      const fifthFreq = frequencyFor(baseNote + 7, detune);
      const octaveFreq = frequencyFor(baseNote + 12, detune);
      for (let sample = startSample; sample < endSample; sample += 1) {
        const t = (sample - startSample) / length;
        const time = sample / ctx.sampleRate;
        let wave = Math.sin(2 * Math.PI * baseFreq * time) * 0.75;
        wave += Math.sin(2 * Math.PI * fifthFreq * time) * 0.55;
        wave += Math.sin(2 * Math.PI * octaveFreq * time) * 0.35;
        wave = Math.tanh(wave * drive);
        const envelope = Math.pow(1 - t, 2.4);
        data[sample] += wave * envelope * level * 0.24;
      }
    }

    if (pattern.bass?.length) {
      for (let beat = 0; beat < totalBeats; beat += 1) {
        const step = pattern.bass[beat % pattern.bass.length];
        if (step === null || step === undefined) continue;
        const noteValue = typeof step === "object" ? step.note : step;
        if (noteValue === null || noteValue === undefined) continue;
        const sustain = Math.max(0.5, typeof step === "object" && step.sustain ? step.sustain : 1);
        const level = typeof step === "object" && step.level !== undefined ? step.level : 1;
        const startSample = Math.floor(beat * secondsPerBeat * ctx.sampleRate);
        const endSample = Math.min(
          data.length,
          Math.floor((beat + sustain) * secondsPerBeat * ctx.sampleRate),
        );
        const length = Math.max(1, endSample - startSample);
        const freq = frequencyFor(noteValue - 12, detune);
        for (let sample = startSample; sample < endSample; sample += 1) {
          const t = (sample - startSample) / length;
          const time = sample / ctx.sampleRate;
          let wave = Math.sin(2 * Math.PI * freq * time) * 0.85;
          wave += Math.sin(4 * Math.PI * freq * time) * 0.4;
          wave += Math.sin(2 * Math.PI * (freq / 2) * time) * 0.3;
          wave = Math.tanh(wave * 3.2);
          const envelope = 1 - Math.pow(t, 1.7);
          data[sample] += wave * envelope * 0.3 * level;
        }
      }
    }

    if (pattern.lead?.length) {
      for (let bar = 0; bar < bars; bar += 1) {
        for (const lick of pattern.lead) {
          const lengthBeats = Math.max(0.25, lick.length ?? 0.5);
          const startBeat = bar * beatsPerBar + (lick.offset ?? 0);
          const startSample = Math.floor(startBeat * secondsPerBeat * ctx.sampleRate);
          const endSample = Math.min(
            data.length,
            Math.floor((startBeat + lengthBeats) * secondsPerBeat * ctx.sampleRate),
          );
          const length = Math.max(1, endSample - startSample);
          const freq = frequencyFor(lick.note ?? 12, detune);
          for (let sample = startSample; sample < endSample; sample += 1) {
            const t = (sample - startSample) / length;
            const time = sample / ctx.sampleRate;
            let wave = Math.sin(2 * Math.PI * freq * time) * 0.7;
            wave += Math.sin(4 * Math.PI * freq * time) * 0.28;
            wave = Math.tanh(wave * 2.8);
            const envelope = Math.sin(Math.PI * Math.min(1, 1 - t));
            data[sample] += wave * envelope * (lick.level ?? 0.32) * 0.5;
          }
        }
      }
    }

    const hiHatInterval = secondsPerBeat / 2;
    const hiHatLength = Math.floor(ctx.sampleRate * 0.032);
    for (let startTime = 0; startTime < duration; startTime += hiHatInterval) {
      const startSample = Math.floor(startTime * ctx.sampleRate);
      for (let i = 0; i < hiHatLength && startSample + i < data.length; i += 1) {
        const decay = 1 - i / hiHatLength;
        const noise = (Math.random() * 2 - 1) * decay;
        data[startSample + i] += noise * 0.1;
      }
    }

    if (pattern.snareBeats?.length) {
      const snareLength = Math.floor(ctx.sampleRate * 0.11);
      for (let bar = 0; bar < bars; bar += 1) {
        for (const beatOffset of pattern.snareBeats) {
          const startBeat = bar * beatsPerBar + beatOffset;
          const startSample = Math.floor(startBeat * secondsPerBeat * ctx.sampleRate);
          for (let i = 0; i < snareLength && startSample + i < data.length; i += 1) {
            const t = i / snareLength;
            const envelope = Math.pow(1 - t, 1.6);
            const tone = Math.sin((2 * Math.PI * (180 - t * 90) * i) / ctx.sampleRate) * (0.35 + 0.15 * envelope);
            const noise = (Math.random() * 2 - 1) * envelope * 0.45;
            data[startSample + i] += (tone + noise) * 0.6;
          }
        }
      }
    }

    const kickLength = Math.floor(ctx.sampleRate * 0.09);
    for (let bar = 0; bar < bars; bar += 1) {
      const barStart = Math.floor(bar * beatsPerBar * secondsPerBeat * ctx.sampleRate);
      for (let i = 0; i < kickLength && barStart + i < data.length; i += 1) {
        const t = i / kickLength;
        const freq = 100 - t * 50;
        const wave = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate);
        data[barStart + i] += wave * (1 - t) * 0.55;
      }
      const midBeat = barStart + Math.floor((beatsPerBar / 2) * secondsPerBeat * ctx.sampleRate);
      for (let i = 0; i < kickLength && midBeat + i < data.length; i += 1) {
        const t = i / kickLength;
        const freq = 140 - t * 60;
        const wave = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate);
        data[midBeat + i] += wave * (1 - t) * 0.34;
      }
    }

    let max = 0;
    for (let i = 0; i < data.length; i += 1) {
      max = Math.max(max, Math.abs(data[i]));
    }
    if (max > 1) {
      const scale = 1 / max;
      for (let i = 0; i < data.length; i += 1) {
        data[i] *= scale;
      }
    }

    return buffer;
  }
}

function frequencyFor(noteIndex, detune = 1) {
  const baseCount = NOTE_FREQUENCIES.length;
  const wrappedIndex = ((noteIndex % baseCount) + baseCount) % baseCount;
  const octave = Math.floor(noteIndex / baseCount);
  return NOTE_FREQUENCIES[wrappedIndex] * Math.pow(2, octave) * detune;
}
