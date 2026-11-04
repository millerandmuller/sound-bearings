// Owns the scripted 45 second timeline of simulated sounds (design brief, "When things show").
// It starts each spatial AudioComponent on cue, exposes which sources are sounding with a
// loudness value 0..1 per frame, holds the Focus state (and the 30 percent volume that goes with
// it), and can replay from the first caption. No microphone, no detection: every sound is scripted.
export type SourceId = "kettle" | "doorbell" | "person" | "alarm"

export const FIRST_CAPTION = "Sounds are simulated in this preview; live detection is the next step."
export const ALARM_CAPTION = "Smoke alarm (simulated). Not a safety device."

const TIMELINE_END_S = 45
const FIRST_CAPTION_END_S = 3
const DIMMED_VOLUME = 0.3

export interface SourceState {
  readonly id: SourceId
  readonly audio: AudioComponent
  readonly object: SceneObject
  readonly ringTag: string // tag shown once the indicator is a ring on the source
  readonly arrowTag: string // caption shown while it is an arrow at the edge
  readonly windows: ReadonlyArray<readonly [number, number]> // seconds on the timeline
  active: boolean
  loudness: number // 0..1, scripted envelope
}

interface Cue {
  readonly id: SourceId
  readonly at: number
  fired: boolean
}

const bump = (x: number, length: number): number => (x >= 0 && x < length ? Math.sin((Math.PI * x) / length) : 0)

// Loudness envelopes, u = seconds since the window opened, d = window length.
const ENVELOPES: Record<SourceId, (u: number, d: number) => number> = {
  kettle: (u, d) => Math.min(1, u / 2) * (0.88 + 0.12 * Math.sin(u * 3)) * Math.min(1, (d - u) / 0.4),
  doorbell: (u) => Math.max(0.2, Math.exp(-0.9 * (u % 3))),
  person: (u) => 0.35 + 0.65 * Math.max(bump(u, 0.7), bump(u - 1.5, 0.7)), // calls "Mara?" twice
  alarm: (u) => {
    const c = u % 1.57 // three beeps then a pause, matching SmokeAlarm.wav
    return c % 0.34 < 0.22 && c < 1.02 ? 1 : 0.35
  }
}

// When each clip starts. "Mara?" is a short clip, so it is cued twice inside its window.
const CUES: ReadonlyArray<[SourceId, number]> = [
  ["kettle", 3],
  ["doorbell", 12],
  ["person", 24],
  ["person", 25.5],
  ["kettle", 30],
  ["alarm", 36]
]

@component
export class SoundSources extends BaseScriptComponent {
  @input
  @hint("Kettle, ahead-left. Spatial AudioComponent.")
  kettleAudio: AudioComponent
  @input
  @hint("Doorbell, behind-right. Spatial AudioComponent.")
  doorbellAudio: AudioComponent
  @input
  @hint("Person calling 'Mara?', behind-left. Spatial AudioComponent.")
  personAudio: AudioComponent
  @input
  @hint("Smoke alarm on the ceiling behind. Spatial AudioComponent.")
  alarmAudio: AudioComponent
  @input
  @hint("Root of the stand-in kitchen. At start it is moved to where the user stands and turned to face the way they face.")
  kitchen: SceneObject
  @input
  @hint("The Camera Object (the user's head).")
  camera: SceneObject
  @input
  @hint("Start over automatically after 45 s. Off by default so recordings and tests end cleanly; Replay restarts it.")
  loopTimeline: boolean = false

  readonly all: SourceState[] = []
  private cues: Cue[] = CUES.map(([id, at]) => ({id, at, fired: false}))
  private t = 0
  private focusedId: SourceId | null = null

  onAwake(): void {
    const make = (
      id: SourceId,
      audio: AudioComponent,
      ringTag: string,
      arrowTag: string,
      windows: Array<readonly [number, number]>
    ): SourceState => ({
      id,
      audio,
      object: audio.getSceneObject(),
      ringTag,
      arrowTag,
      windows,
      active: false,
      loudness: 0
    })
    this.all.push(
      make("kettle", this.kettleAudio, "Kettle", "Kettle", [[3, 13], [30, 40]]),
      make("doorbell", this.doorbellAudio, "Doorbell", "Doorbell", [[12, 18]]),
      make("person", this.personAudio, "Someone called you", "Mara?", [[24, 27]]),
      make("alarm", this.alarmAudio, "Smoke alarm", "Smoke alarm", [[36, 44]])
    )
    this.createEvent("OnStartEvent").bind(() => {
      this.placeKitchen()
      // playbackMode is script-only on Specs; written in OnStart per the Specs audio guidance.
      this.all.forEach((s) => (s.audio.playbackMode = Audio.PlaybackMode.LowLatency))
    })
    this.createEvent("UpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  get time(): number {
    return this.t
  }

  get focused(): SourceId | null {
    return this.focusedId
  }

  /** The caption line: the first caption at 0 to 3 s, the alarm caption while the alarm sounds, else empty. */
  get caption(): string {
    if (this.get("alarm").active) return ALARM_CAPTION
    return this.t < FIRST_CAPTION_END_S ? FIRST_CAPTION : ""
  }

  get(id: SourceId): SourceState {
    return this.all.find((s) => s.id === id)
  }

  /** Sources sounding right now. */
  get active(): SourceState[] {
    return this.all.filter((s) => s.active)
  }

  /** Hold Focus on one source (null releases). Others drop to 30 percent volume; the alarm never does. */
  setFocus(id: SourceId | null): void {
    this.focusedId = id
    this.all.forEach((s) => (s.audio.volume = id !== null && s.id !== id && s.id !== "alarm" ? DIMMED_VOLUME : 1))
  }

  /** Restart the whole timeline from the first caption. */
  replay(): void {
    this.seek(0)
  }

  /** Jump to a point on the timeline (used by Replay and by the tests). Clears Focus. */
  seek(seconds: number): void {
    this.all.forEach((s) => {
      s.audio.stop(false)
      s.active = false
      s.loudness = 0
    })
    this.setFocus(null)
    this.t = seconds
    // Cues well in the past stay silent; one just passed (inside its clip) plays at once.
    this.cues.forEach((c) => (c.fired = c.at < seconds - 1))
  }

  /**
   * The kitchen is authored with the user at the origin facing -Z. The user's real start pose is
   * wherever the device begins (arbitrary in the preview), so move the kitchen there: same
   * position, and turned about the vertical axis only so the counter is straight ahead.
   */
  private placeKitchen(): void {
    const cam = this.camera.getTransform()
    const forward = cam.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const heading = Math.atan2(-forward.x, -forward.z) // rotation about +Y that turns -Z onto the camera's heading
    const root = this.kitchen.getTransform()
    root.setWorldPosition(cam.getWorldPosition())
    root.setWorldRotation(quat.angleAxis(heading, vec3.up()))
  }

  private tick(dt: number): void {
    this.t += dt
    if (this.t >= TIMELINE_END_S) {
      this.all.forEach((s) => {
        if (s.active) s.audio.stop(true)
        s.active = false
        s.loudness = 0
      })
      if (this.loopTimeline) this.seek(0)
      return
    }
    this.all.forEach((s) => this.updateSource(s))
    this.cues.forEach((c) => {
      if (c.fired || this.t < c.at) return
      c.fired = true
      const audio = this.get(c.id).audio
      audio.stop(false)
      audio.play(1)
    })
  }

  private updateSource(s: SourceState): void {
    const window = s.windows.find(([from, to]) => this.t >= from && this.t < to)
    const wasActive = s.active
    s.active = window !== undefined
    s.loudness = window ? ENVELOPES[s.id](this.t - window[0], window[1] - window[0]) : 0
    if (wasActive && !s.active) s.audio.stop(true)
  }
}
