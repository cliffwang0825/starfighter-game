const MUSIC_PATTERNS = [
  {
    tempo: 156,
    riff: [
      { note: 0, level: 1, sustain: 1 },
      { note: 5, level: 0.92, sustain: 1 },
      { note: 7, level: 0.96, sustain: 1 },
      { note: 5, level: 0.92, sustain: 1 },
    ],
    bass: [0, 0, 5, 0],
    lead: [
      { offset: 0.5, note: 12, length: 0.5, level: 0.36 },
      { offset: 2.5, note: 14, length: 0.5, level: 0.34 },
    ],
    detune: 0,
    drive: 3.4,
    bars: 4,
  },
  {
    tempo: 164,
    riff: [
      { note: 2, level: 1, sustain: 1 },
      { note: 7, level: 0.94, sustain: 1 },
      { note: 9, level: 0.98, sustain: 1 },
      { note: 7, level: 0.94, sustain: 1 },
    ],
    bass: [2, 2, 7, 2],
    lead: [
      { offset: 1, note: 14, length: 0.5, level: 0.32 },
      { offset: 3, note: 16, length: 0.5, level: 0.32 },
    ],
    detune: -5,
    drive: 3.8,
    bars: 4,
  },
  {
    tempo: 172,
    riff: [
      { note: 5, level: 1, sustain: 1 },
      { note: 7, level: 0.95, sustain: 1 },
      { note: 10, level: 0.98, sustain: 1 },
      { note: 7, level: 0.95, sustain: 1 },
    ],
    bass: [5, 5, 7, 5],
    lead: [
      { offset: 0.5, note: 12, length: 0.5, level: 0.34 },
      { offset: 2, note: 14, length: 0.5, level: 0.36 },
      { offset: 3.5, note: 17, length: 0.5, level: 0.32 },
    ],
    detune: 7,
    drive: 4.1,
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
    this.musicGain.gain.value = 0.48;
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
        const note = pattern.bass[beat % pattern.bass.length];
        if (note === null || note === undefined) continue;
        const startSample = Math.floor(beat * secondsPerBeat * ctx.sampleRate);
        const endSample = Math.min(
          data.length,
          Math.floor((beat + 1) * secondsPerBeat * ctx.sampleRate),
        );
        const length = Math.max(1, endSample - startSample);
        const freq = frequencyFor(note - 12, detune);
        for (let sample = startSample; sample < endSample; sample += 1) {
          const t = (sample - startSample) / length;
          const time = sample / ctx.sampleRate;
          let wave = Math.sin(2 * Math.PI * freq * time) * 0.8;
          wave += Math.sin(4 * Math.PI * freq * time) * 0.35;
          wave = Math.tanh(wave * 2.6);
          const envelope = 1 - Math.pow(t, 1.9);
          data[sample] += wave * envelope * 0.22;
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
        data[startSample + i] += noise * 0.08;
      }
    }

    const kickLength = Math.floor(ctx.sampleRate * 0.09);
    for (let bar = 0; bar < bars; bar += 1) {
      const barStart = Math.floor(bar * beatsPerBar * secondsPerBeat * ctx.sampleRate);
      for (let i = 0; i < kickLength && barStart + i < data.length; i += 1) {
        const t = i / kickLength;
        const freq = 100 - t * 50;
        const wave = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate);
        data[barStart + i] += wave * (1 - t) * 0.4;
      }
      const midBeat = barStart + Math.floor((beatsPerBar / 2) * secondsPerBeat * ctx.sampleRate);
      for (let i = 0; i < kickLength && midBeat + i < data.length; i += 1) {
        const t = i / kickLength;
        const freq = 140 - t * 60;
        const wave = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate);
        data[midBeat + i] += wave * (1 - t) * 0.28;
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
