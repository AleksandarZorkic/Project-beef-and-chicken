export type DeliveryRushSound =
  | "lane-whoosh"
  | "jump"
  | "landing"
  | "collision"
  | "collision"
  | "car-horn"
  | "car-collision"
  | "pothole-hit"
  | "life-lost"
  | "life-lost"
  | "countdown-tick"
  | "countdown-go"
  | "obstacle-pass"
  | "difficulty-up"
  | "rush-hour"
  | "game-over"
  | "new-record"
  | "ui-click";

export interface DeliveryRushSoundOptions {
  pan?: number;
  playbackRate?: number;
  volume?: number;
}

const soundEnabledStorageKey = "delivery-rush-sound-enabled";

const baseUrl = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const audioRoot = `${baseUrl}audio/delivery-rush`;

const soundFiles: Record<DeliveryRushSound, string> = {
  "lane-whoosh": `${audioRoot}/sfx/lane-whoosh.wav`,
  jump: `${audioRoot}/sfx/jump.wav`,
  landing: `${audioRoot}/sfx/landing.wav`,

  collision: `${audioRoot}/sfx/collision.wav`,
  "car-horn": `${audioRoot}/sfx/car-horn.wav`,
  "car-collision": `${audioRoot}/sfx/car-collision.wav`,
  "pothole-hit": `${audioRoot}/sfx/pothole-hit.wav`,
  "life-lost": `${audioRoot}/sfx/life-lost.wav`,
  "countdown-tick": `${audioRoot}/sfx/countdown-tick.wav`,
  "countdown-go": `${audioRoot}/sfx/countdown-go.wav`,
  "obstacle-pass": `${audioRoot}/sfx/obstacle-pass.wav`,
  "difficulty-up": `${audioRoot}/sfx/difficulty-up.wav`,
  "rush-hour": `${audioRoot}/sfx/rush-hour.wav`,
  "game-over": `${audioRoot}/sfx/game-over.wav`,
  "new-record": `${audioRoot}/sfx/new-record.wav`,
  "ui-click": `${audioRoot}/sfx/ui-click.wav`,
};

const musicFile = `${audioRoot}/music/delivery-rush-underground-night-loop.wav`;

const defaultSoundVolumes: Record<DeliveryRushSound, number> = {
  "lane-whoosh": 0.5,
  jump: 0.66,
  landing: 0.54,
  collision: 0.92,
  "car-horn": 0.42,
  "car-collision": 0.86,
  "pothole-hit": 0.78,
  "life-lost": 0.62,
  "countdown-tick": 0.52,
  "countdown-go": 0.78,
  "obstacle-pass": 0,
  "difficulty-up": 0.62,
  "rush-hour": 0.84,
  "game-over": 0.82,
  "new-record": 0.88,
  "ui-click": 0.34,
};

const minimumSoundGaps: Partial<Record<DeliveryRushSound, number>> = {
  "lane-whoosh": 25,
  jump: 80,
  landing: 80,
  collision: 100,
  "car-horn": 700,
  "car-collision": 120,
  "pothole-hit": 120,
  "life-lost": 100,
  "countdown-tick": 150,
  "countdown-go": 250,
  "obstacle-pass": 70,
  "difficulty-up": 250,
  "rush-hour": 500,
  "game-over": 500,
  "new-record": 500,
  "ui-click": 45,
};

type EnabledListener = (isEnabled: boolean) => void;

class DeliveryRushAudioManager {
  private audioContext: AudioContext | null = null;

  private readonly soundBuffers = new Map<
    DeliveryRushSound,
    Promise<AudioBuffer | null>
  >();

  private musicBuffer: Promise<AudioBuffer | null> | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaybackRate = 1;
  private musicRequestId = 0;

  private readonly listeners = new Set<EnabledListener>();
  private readonly lastSoundRequestTimes = new Map<DeliveryRushSound, number>();

  private enabled = readStoredSoundPreference();

  isEnabled(): boolean {
    return this.enabled;
  }

  subscribe(listener: EnabledListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async unlock(): Promise<void> {
    const context = this.getAudioContext();

    if (!context || context.state === "running") {
      return;
    }

    try {
      await context.resume();
    } catch {
      // A later user gesture can retry the browser audio unlock.
    }
  }

  preload(): void {
    if (!this.getAudioContext()) {
      return;
    }

    for (const sound of Object.keys(soundFiles) as DeliveryRushSound[]) {
      void this.loadSound(sound);
    }

    void this.loadMusic();
  }

  playSound(
    sound: DeliveryRushSound,
    options: DeliveryRushSoundOptions = {},
  ): void {
    this.queueSound(sound, options, false);
  }

  toggleEnabled(): boolean {
    const nextEnabled = !this.enabled;

    if (this.enabled) {
      this.queueSound("ui-click", {}, true);
    }

    this.enabled = nextEnabled;
    writeStoredSoundPreference(nextEnabled);

    if (!nextEnabled) {
      this.stopMusic(0.08);
    } else {
      void this.unlock();
      this.queueSound("ui-click", {}, true);
      this.preload();
    }

    for (const listener of this.listeners) {
      listener(nextEnabled);
    }

    return nextEnabled;
  }

  startMusic(playbackRate = 1): void {
    this.musicPlaybackRate = clamp(playbackRate, 0.75, 1.5);

    if (!this.enabled) {
      return;
    }

    if (this.musicSource) {
      this.setMusicPlaybackRate(this.musicPlaybackRate);
      return;
    }

    const requestId = ++this.musicRequestId;

    void this.startMusicAsync(requestId);
  }

  setMusicPlaybackRate(playbackRate: number): void {
    this.musicPlaybackRate = clamp(playbackRate, 0.75, 1.5);

    const context = this.audioContext;

    if (!context || !this.musicSource) {
      return;
    }

    this.musicSource.playbackRate.setTargetAtTime(
      this.musicPlaybackRate,
      context.currentTime,
      0.12,
    );
  }

  stopMusic(fadeSeconds = 0.24): void {
    this.musicRequestId++;

    const context = this.audioContext;
    const source = this.musicSource;
    const gain = this.musicGain;

    this.musicSource = null;
    this.musicGain = null;

    if (!context || !source || !gain) {
      return;
    }

    const now = context.currentTime;
    const stopAt = now + Math.max(0.02, fadeSeconds);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    try {
      source.stop(stopAt + 0.02);
    } catch {
      // The source may already have stopped during component cleanup.
    }
  }

  private queueSound(
    sound: DeliveryRushSound,
    options: DeliveryRushSoundOptions,
    allowAfterDisable: boolean,
  ): void {
    if (!this.enabled && !allowAfterDisable) {
      return;
    }

    const now = getCurrentTimeMilliseconds();
    const lastRequestTime = this.lastSoundRequestTimes.get(sound) ?? -Infinity;
    const minimumGap = minimumSoundGaps[sound] ?? 0;

    if (now - lastRequestTime < minimumGap) {
      return;
    }

    this.lastSoundRequestTimes.set(sound, now);

    void this.playSoundAsync(sound, options, allowAfterDisable);
  }

  private async playSoundAsync(
    sound: DeliveryRushSound,
    options: DeliveryRushSoundOptions,
    allowAfterDisable: boolean,
  ): Promise<void> {
    await this.unlock();

    const context = this.audioContext;
    const buffer = await this.loadSound(sound);

    if (!context || !buffer || (!this.enabled && !allowAfterDisable)) {
      return;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.playbackRate.value = clamp(options.playbackRate ?? 1, 0.5, 2);
    gain.gain.value = clamp(
      (options.volume ?? 1) * defaultSoundVolumes[sound],
      0,
      1,
    );

    source.connect(gain);

    if (typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();

      panner.pan.value = clamp(options.pan ?? 0, -1, 1);
      gain.connect(panner);
      panner.connect(context.destination);

      source.addEventListener(
        "ended",
        () => {
          source.disconnect();
          gain.disconnect();
          panner.disconnect();
        },
        { once: true },
      );
    } else {
      gain.connect(context.destination);

      source.addEventListener(
        "ended",
        () => {
          source.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
    }

    source.start();
  }

  private async startMusicAsync(requestId: number): Promise<void> {
    await this.unlock();

    const context = this.audioContext;
    const buffer = await this.loadMusic();

    if (
      !context ||
      !buffer ||
      !this.enabled ||
      requestId !== this.musicRequestId ||
      this.musicSource
    ) {
      return;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;

    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = this.musicPlaybackRate;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.35);

    source.connect(gain);
    gain.connect(context.destination);

    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        gain.disconnect();

        if (this.musicSource === source) {
          this.musicSource = null;
          this.musicGain = null;
        }
      },
      { once: true },
    );

    this.musicSource = source;
    this.musicGain = gain;

    source.start();
  }

  private loadSound(sound: DeliveryRushSound): Promise<AudioBuffer | null> {
    const existingBuffer = this.soundBuffers.get(sound);

    if (existingBuffer) {
      return existingBuffer;
    }

    const buffer = this.loadAudioBuffer(soundFiles[sound]);

    this.soundBuffers.set(sound, buffer);

    return buffer;
  }

  private loadMusic(): Promise<AudioBuffer | null> {
    if (!this.musicBuffer) {
      this.musicBuffer = this.loadAudioBuffer(musicFile);
    }

    return this.musicBuffer;
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    const context = this.getAudioContext();

    if (!context || typeof fetch !== "function") {
      return null;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      return await context.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    if (
      typeof window === "undefined" ||
      typeof window.AudioContext !== "function"
    ) {
      return null;
    }

    this.audioContext = new window.AudioContext();

    return this.audioContext;
  }
}

function readStoredSoundPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(soundEnabledStorageKey) !== "false";
  } catch {
    return true;
  }
}

function writeStoredSoundPreference(isEnabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(soundEnabledStorageKey, String(isEnabled));
  } catch {
    // Sound still works when storage is unavailable.
  }
}

function getCurrentTimeMilliseconds(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export const deliveryRushAudio = new DeliveryRushAudioManager();
