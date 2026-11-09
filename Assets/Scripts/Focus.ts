// The control panel and the Focus rule.
// A small panel follows the view (child of the camera) at bottom centre, 60 cm away, a little below
// eye level: a Focus button (8 cm) and a smaller Replay button (4 cm) to its right. Both are UI Kit
// buttons on SIK, so they take hover, mouse-as-pinch in Interactive Preview, and LEAF.
//
// Focus: pinch while a ring is in view and its sound is playing -> that sound is held until the next
// pinch (SoundSources dims the others' volume, Bearings dims their indicators). If two rings are in
// view the one nearest the centre wins. If nothing is sounding in view the pinch only pulses the button.
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {addContentToElement} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContentFactory"
import {Bearings} from "./Bearings"
import {SoundSources, SourceId} from "./SoundSources"
import {createBackground, OUTLINE_COLOUR} from "./Label"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

const PANEL_DISTANCE_CM = 60
const PANEL_HEIGHT_CM = -16.2 // low in the view, clear of the caption line above it
const PAD_CM = 0.7
const GAP_CM = 0.9
// No dark fills (the display is additive): a faint light strip, and light plates under each button.
// The UI Kit button itself is the Ghost style (no fill of its own); its hit target is the button's size.
const PANEL_COLOUR = new vec4(0.953, 0.925, 0.867, 0.45)
const PLATE_IDLE = new vec4(0.953, 0.925, 0.867, 1)
const PLATE_HOVER = new vec4(0.98, 0.965, 0.925, 1)
const PLATE_ON = new vec4(1, 1, 1, 1) // Focus held
const LABEL_COLOUR = OUTLINE_COLOUR // warm ink, never black
const DIMMED_PANEL_ALPHA = 0.4 // the whole strip, while a ring is on screen and nothing is hovered
const PANEL_FADE_RATE = 10
const PLATE_OVERSIZE_CM = 0.3
const PLATE_CORNER_CM = 0.3
const BUTTON_DEPTH_CM = 1
const BUTTON_Z_CM = 0.6
// The strip and plates have depth test off, so they are drawn by render order: the strip first, the
// button visual, then the light plate over it (hiding the Ghost hover fill), then the label on top.
const PANEL_RENDER_ORDER = 5
const BUTTON_RENDER_ORDER = 6
const PLATE_RENDER_ORDER = 7
const LABEL_RENDER_ORDER = 8
const PULSE_SECONDS = 0.3
const PULSE_SCALE = 0.18

@component
export class Focus extends BaseScriptComponent {
  @input
  sources: SoundSources
  @input
  bearings: Bearings
  @input
  @hint("The Camera Object. The panel is parented to it so it follows the view.")
  camera: SceneObject

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Width of the Focus button in cm.")
  focusWidth: number = 8
  @input
  @hint("Height of the Focus button in cm.")
  focusHeight: number = 4.5
  @input
  @hint("Width and height of the smaller Replay button in cm.")
  replaySize: number = 4
  @ui.group_end

  private focusButton: Button
  private replayButton: Button
  private panelPlate: RoundedRectangle
  private focusPlate: RoundedRectangle
  private labels: unknown[] = []
  private panelAlpha = 1
  private replayPlate: RoundedRectangle
  private paintedHolding = false
  private focusHover = false
  private replayHover = false
  private panel: SceneObject
  private pulse = 0 // seconds left on the "nothing to focus on" pulse

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.buildPanel())
    this.createEvent("UpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  /** The Focus button's action. Public so the tests can pinch without a hand. */
  pinchFocus(): void {
    if (this.sources.focused !== null) {
      this.sources.setFocus(null)
      return
    }
    const target = this.nearestRingInView()
    if (target === null) {
      this.pulse = PULSE_SECONDS
      return
    }
    this.sources.setFocus(target)
  }

  /** The Replay button's action. */
  pinchReplay(): void {
    this.sources.replay()
  }

  /** Sounding source whose ring is in view, nearest the centre of the view; null if none. */
  private nearestRingInView(): SourceId | null {
    let best: SourceId | null = null
    let bestAngle = Infinity
    this.sources.active.forEach((s) => {
      const b = this.bearings.getBearing(s.id)
      if (b.mode === "ring" && b.angle < bestAngle) {
        best = s.id
        bestAngle = b.angle
      }
    })
    return best
  }

  private buildPanel(): void {
    this.panel = global.scene.createSceneObject("ControlPanel")
    this.panel.setParent(this.camera)
    this.panel.layer = this.camera.layer
    this.panel.getTransform().setLocalPosition(new vec3(0, PANEL_HEIGHT_CM, -PANEL_DISTANCE_CM))
    const height = Math.max(this.focusHeight, this.replaySize)
    const size = new vec2(this.focusWidth + this.replaySize + GAP_CM + 2 * PAD_CM, height + 2 * PAD_CM)
    this.panelPlate = createBackground(this.panel, "PanelPlate", size, PANEL_COLOUR, PANEL_RENDER_ORDER)

    const focusX = -size.x / 2 + PAD_CM + this.focusWidth / 2
    const replayX = size.x / 2 - PAD_CM - this.replaySize / 2
    const focus = this.makeButton("FocusButton", new vec2(this.focusWidth, this.focusHeight), focusX, "Focus", 48)
    const replay = this.makeButton("ReplayButton", new vec2(this.replaySize, this.replaySize), replayX, "Replay", 28)
    this.focusButton = focus.button
    this.focusPlate = focus.plate
    this.replayButton = replay.button
    this.replayPlate = replay.plate
    // Plain buttons: Focus's on-state is the white plate below, not the UI Kit toggle fill (a dark
    // "selected" fill would show on this additive display).
    this.focusButton.onTriggerUp.add(() => this.pinchFocus())
    this.replayButton.onTriggerUp.add(() => this.pinchReplay())
    // Hover highlight is the plate brightening (the Ghost style's own hover fill is hidden under it).
    this.focusButton.onHoverEnter.add(() => this.setHover(true, true))
    this.focusButton.onHoverExit.add(() => this.setHover(true, false))
    this.replayButton.onHoverEnter.add(() => this.setHover(false, true))
    this.replayButton.onHoverExit.add(() => this.setHover(false, false))
    this.paintPlates()
  }

  private makeButton(
    name: string,
    size: vec2,
    x: number,
    label: string,
    textSize: number
  ): {button: Button; plate: RoundedRectangle} {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.panel)
    obj.layer = this.panel.layer
    obj.getTransform().setLocalPosition(new vec3(x, 0, BUTTON_Z_CM))
    const button = obj.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style: "Ghost"})
    button.size = new vec3(size.x, size.y, BUTTON_DEPTH_CM)
    button.initialize()
    button.renderOrder = BUTTON_RENDER_ORDER
    // Slightly larger than the button with tighter corners, so no part of the button's own fill shows.
    const plate = createBackground(obj, name + "Plate", size.add(new vec2(PLATE_OVERSIZE_CM, PLATE_OVERSIZE_CM)), PLATE_IDLE, PLATE_RENDER_ORDER)
    plate.cornerRadius = PLATE_CORNER_CM
    const content = addContentToElement(obj, {text: label, textSize, contentAlignment: "center"})
    content.renderOrder = LABEL_RENDER_ORDER
    this.useLabelColour(content, 1)
    this.labels.push(content)
    return {button, plate}
  }

  /** UI Kit's per-instance text colour override (an inspector field on ElementContent, no public setter). */
  private useLabelColour(content: unknown, alpha: number): void {
    const c = content as {_useTextColorOverride: boolean; _textColorOverride: vec4; _colorsDirty: boolean; _opacityFactor: number; applyResolvedColors?: () => void}
    c._useTextColorOverride = true
    c._textColorOverride = LABEL_COLOUR
    c._opacityFactor = alpha // the label's alpha comes from this multiplier, not from the override colour
    c._colorsDirty = true
    if (c.applyResolvedColors) c.applyResolvedColors()
  }

  private setHover(isFocus: boolean, on: boolean): void {
    if (isFocus) this.focusHover = on
    else this.replayHover = on
    this.paintPlates()
  }

  private paintPlates(): void {
    const holding = this.sources.focused !== null
    this.paintedHolding = holding
    this.focusPlate.backgroundColor = holding ? PLATE_ON : this.focusHover ? PLATE_HOVER : PLATE_IDLE
    this.replayPlate.backgroundColor = this.replayHover ? PLATE_HOVER : PLATE_IDLE
  }

  /** Dim the whole strip to 40 percent while any ring is on screen, so the ring stays readable; full while a button is hovered. */
  private fadePanel(dt: number): void {
    const hovered = this.focusHover || this.replayHover
    const target = this.bearings.ringOnScreen && !hovered ? DIMMED_PANEL_ALPHA : 1
    const next = this.panelAlpha + (target - this.panelAlpha) * (1 - Math.exp(-PANEL_FADE_RATE * dt))
    if (next === this.panelAlpha) return
    this.panelAlpha = Math.abs(next - target) < 0.005 ? target : next
    this.panelPlate.opacity = this.panelAlpha
    this.focusPlate.opacity = this.panelAlpha
    this.replayPlate.opacity = this.panelAlpha
    this.labels.forEach((l) => this.useLabelColour(l, this.panelAlpha))
  }

  private tick(dt: number): void {
    if (!this.focusButton) return
    const holding = this.sources.focused !== null
    if (holding !== this.paintedHolding) this.paintPlates() // Replay can clear Focus
    this.fadePanel(dt)
    this.pulse = Math.max(0, this.pulse - dt)
    const k = 1 + PULSE_SCALE * Math.sin((Math.PI * (PULSE_SECONDS - this.pulse)) / PULSE_SECONDS) * (this.pulse > 0 ? 1 : 0)
    this.focusButton.sceneObject.getTransform().setLocalScale(new vec3(k, k, k))
  }
}
