// Shared UI helpers (not a component): a light rounded background built from the
// UI Kit RoundedRectangle, and a Label (background + text) built on top of it.
// Used by the indicator tags and caption line (Bearings.ts) and by the panel (Focus.ts),
// so the look and the opacity handling live in one place.
import {
  RoundedRectangle,
  RoundedRectBlendMode
} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

// Text.size is the em-square height; em cm = size / 43.886 at the 110 cm focal plane (UI Kit type scale).
const CM_PER_SIZE_UNIT = 1 / 43.886
const AVG_CHAR_EM = 0.58
const PAD_X_EM = 0.9
const PAD_Y_EM = 0.55
const LINE_HEIGHT_EM = 1.25
// Drawn above the indicator rings (render order 0); the text sits one step above its own background.
const LABEL_RENDER_ORDER = 10

export interface LabelStyle {
  background: vec4 // light fill; alpha is kept at 1 and faded through opacity
  foreground: vec4 // text colour, deep but not black so it never disappears on an additive display
  outline: vec4 // thin edge so the tag reads when it crosses a light object
}

// Colours are chosen for emitted light. The Specs display adds light to the world, so a dark channel is
// see-through; the preview simulates this. Cream and ink display close to their values, the red is at
// full light because the wall shows through its green and blue.
/** Warm ink, never black (dark is see-through on the glasses): the outline of tags and arrows and the colour of the button labels. */
export const OUTLINE_COLOUR = new vec4(0.18, 0.157, 0.133, 1)
/** The alarm's edge is red: the arrow and ring are one solid red shape. */
export const ALARM_OUTLINE = new vec4(1.0, 0.11, 0.08, 1)
const OUTLINE_CM = 0.14

export const STYLE_LIGHT: LabelStyle = {
  background: new vec4(0.953, 0.925, 0.867, 1),
  foreground: new vec4(0.18, 0.157, 0.133, 1),
  outline: OUTLINE_COLOUR
}
// The focused, sounding source: the brightest thing on screen.
export const STYLE_FOCUS: LabelStyle = {
  background: new vec4(1.0, 1.0, 1.0, 1),
  foreground: new vec4(0.12, 0.1, 0.08, 1),
  outline: OUTLINE_COLOUR
}
// Cream plate, ink text, red edge: the safety sentence stays legible on any wall; the red lives on the arrow and ring.
export const STYLE_WARNING: LabelStyle = {
  background: new vec4(0.953, 0.925, 0.867, 1),
  foreground: new vec4(0.18, 0.157, 0.133, 1),
  outline: ALARM_OUTLINE // the alarm keeps its own colour
}

/** Light rounded plate. No collider, so it never steals a pinch. */
export function createBackground(
  parent: SceneObject,
  name: string,
  size: vec2,
  color: vec4,
  renderOrder: number
): RoundedRectangle {
  const obj = global.scene.createSceneObject(name)
  obj.setParent(parent)
  obj.layer = parent.layer
  const rect = obj.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
  rect.initialize()
  rect.size = size
  rect.cornerRadius = Math.min(size.x, size.y) * 0.25
  rect.backgroundColor = color
  rect.blendMode = RoundedRectBlendMode.Normal
  rect.renderOrder = renderOrder
  const pass = rect.renderMeshVisual.mainPass
  pass.depthTest = false
  pass.depthWrite = false
  return rect
}

/** Greedy word wrap to at most maxChars per line. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const candidate = line ? line + " " + word : word
    if (candidate.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

export class Label {
  readonly root: SceneObject
  private readonly textObject: SceneObject
  private readonly text: Text
  private readonly textSize: number
  private readonly maxChars: number
  private plate: RoundedRectangle | null = null
  private style: LabelStyle
  private alpha = 1
  private shown = ""
  private plateSize = new vec2(1, 1)

  constructor(parent: SceneObject, name: string, textSize: number, maxChars: number, style: LabelStyle) {
    this.textSize = textSize
    this.maxChars = maxChars
    this.style = style
    this.root = global.scene.createSceneObject(name)
    this.root.setParent(parent)
    this.root.layer = parent.layer

    this.textObject = global.scene.createSceneObject(name + "Text")
    this.textObject.setParent(this.root)
    this.textObject.layer = parent.layer
    this.textObject.getTransform().setLocalPosition(new vec3(0, 0, 0.2))
    this.text = this.textObject.createComponent("Component.Text") as Text
    this.text.size = textSize
    this.text.horizontalAlignment = HorizontalAlignment.Center
    this.text.verticalAlignment = VerticalAlignment.Center
    this.text.horizontalOverflow = HorizontalOverflow.Overflow
    this.text.verticalOverflow = VerticalOverflow.Overflow
    this.text.depthTest = false
    this.text.renderOrder = LABEL_RENDER_ORDER + 1
  }

  /** The logical string (no wrap breaks), used by tests and by callers deciding what to show. */
  get content(): string {
    return this.shown
  }

  /** Plate size in cm at scale 1, so callers can place the label against something. */
  get size(): vec2 {
    return this.plateSize
  }

  setText(content: string): void {
    if (content === this.shown) return
    this.shown = content
    const lines = wrap(content, this.maxChars)
    this.text.text = lines.join("\n")
    const em = this.textSize * CM_PER_SIZE_UNIT
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 1)
    const size = new vec2(
      longest * AVG_CHAR_EM * em + 2 * PAD_X_EM * em,
      lines.length * LINE_HEIGHT_EM * em + 2 * PAD_Y_EM * em
    )
    this.plateSize = size
    if (this.plate) {
      this.plate.size = size
      this.plate.cornerRadius = Math.min(size.x, size.y) * 0.25
    } else {
      this.plate = createBackground(this.root, this.root.name + "Plate", size, this.style.background, LABEL_RENDER_ORDER)
    }
    this.applyColours()
  }

  setStyle(style: LabelStyle): void {
    if (style === this.style) return
    this.style = style
    this.applyColours()
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha
    this.root.enabled = alpha > 0.01
    this.applyColours()
  }

  private applyColours(): void {
    const fg = this.style.foreground
    this.text.textFill.color = new vec4(fg.r, fg.g, fg.b, this.alpha)
    if (this.plate) {
      this.plate.backgroundColor = this.style.background
      this.plate.opacity = this.alpha
      const o = this.style.outline
      this.plate.border = true
      this.plate.borderSize = OUTLINE_CM
      this.plate.borderColor = new vec4(o.r, o.g, o.b, this.alpha)
    }
  }
}
