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
import {createBackground} from "./Label"

const PANEL_DISTANCE_CM = 60
const PANEL_HEIGHT_CM = -14.5 // a little below eye level, clear of the caption line above it
const PANEL_SIZE = new vec2(16.5, 8)
// Deep blue, not black: the buttons carry white labels from the theme, so the plate must be darker
// than them or they wash out. Black would vanish on an additive display; this stays visible.
const PANEL_COLOUR = new vec4(0.18, 0.34, 0.6, 0.85)
const BUTTON_DEPTH_CM = 1
const BUTTON_Z_CM = 0.6
// The plate has depth test off (so nothing in the room hides it), so it is drawn by render order:
// after the room (0), before the buttons and their labels, which would otherwise be painted over.
const PLATE_RENDER_ORDER = 5
const BUTTON_RENDER_ORDER = 6
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
  focusHeight: number = 5
  @input
  @hint("Width and height of the smaller Replay button in cm.")
  replaySize: number = 4
  @ui.group_end

  private focusButton: Button
  private replayButton: Button
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
    createBackground(this.panel, "PanelPlate", PANEL_SIZE, PANEL_COLOUR, PLATE_RENDER_ORDER)

    const pad = 1.5
    const focusX = -PANEL_SIZE.x / 2 + pad + this.focusWidth / 2
    const replayX = PANEL_SIZE.x / 2 - pad - this.replaySize / 2
    this.focusButton = this.makeButton("FocusButton", "Primary", new vec3(this.focusWidth, this.focusHeight, BUTTON_DEPTH_CM), focusX, "Focus", 48, true)
    this.replayButton = this.makeButton("ReplayButton", "Secondary", new vec3(this.replaySize, this.replaySize, BUTTON_DEPTH_CM), replayX, "Replay", 28, false)
    // A toggle button reports a completed pinch through onFinished(explicit). It also fires when this
    // script sets isOn to keep the look in sync, with explicit=false, which must not count as a pinch.
    this.focusButton.onFinished.add((explicit: boolean) => {
      if (explicit) this.pinchFocus()
    })
    this.replayButton.onTriggerUp.add(() => this.pinchReplay())
  }

  private makeButton(
    name: string,
    style: string,
    size: vec3,
    x: number,
    label: string,
    textSize: number,
    toggleable: boolean
  ): Button {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.panel)
    obj.layer = this.panel.layer
    obj.getTransform().setLocalPosition(new vec3(x, 0, BUTTON_Z_CM))
    const button = obj.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style})
    button.size = size
    button.setIsToggleable(toggleable) // must precede initialize()
    button.initialize()
    button.renderOrder = BUTTON_RENDER_ORDER
    const content = addContentToElement(obj, {text: label, textSize, contentAlignment: "center"})
    content.renderOrder = BUTTON_RENDER_ORDER
    return button
  }

  private tick(dt: number): void {
    if (!this.focusButton) return
    const holding = this.sources.focused !== null
    if (this.focusButton.isOn !== holding) this.focusButton.isOn = holding // Replay can clear Focus
    this.pulse = Math.max(0, this.pulse - dt)
    const k = 1 + PULSE_SCALE * Math.sin((Math.PI * (PULSE_SECONDS - this.pulse)) / PULSE_SECONDS) * (this.pulse > 0 ? 1 : 0)
    this.focusButton.sceneObject.getTransform().setLocalScale(new vec3(k, k, k))
  }
}
