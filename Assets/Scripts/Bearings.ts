// Shows where each sounding source is, relative to where the user is looking.
// Per frame, for each active source: yaw and pitch offset from the camera forward.
//  - Inside the view cone: a light ring anchored on the source, with a tag.
//  - Outside: an arrow at the edge of the view on one side, pulsing with loudness, tag attached,
//    tilted up or down for sources above or below (the ceiling alarm).
// Arrow and ring are ONE element per source: as the user turns, the arrow slides along the edge
// and morphs into the ring (arrow shrinks while the ring grows), it is never swapped.
import {SoundSources, SourceId, SourceState, TIMELINE_END_S} from "./SoundSources"
import {Label, OUTLINE_COLOUR, STYLE_FOCUS, STYLE_LIGHT, STYLE_WARNING} from "./Label"

const DEG = 180 / Math.PI
const RAD = Math.PI / 180
const MORPH_SECONDS = 0.25
const FOLLOW_RATE = 25 // 1/s, how quickly the element settles on its target
const FAINT_ALPHA = 0.3 // held ring after its sound goes silent
const MIN_RING_TAN = Math.tan((4.5 * Math.PI) / 180) // a ring never looks smaller than ~4.5 degrees across, so far sources still read
const DIMMED_ALPHA = 0.3 // rings and arrows of everything but the focused sound
const DIMMED_TAG_ALPHA = 0.5 // their tag text stays readable
const SIDE_FLIP_MIN_YAW = 5 // degrees; ignore sign noise right at the centre
const SIDE_FLIP_MAX_YAW = 90 // a source behind the user never flips the arrow to the other side
const MAX_TILT = 60 // degrees the arrow may tilt up or down
// The arrow is a thin chevron outline with the same stroke as the rings (about 0.9 cm at 110 cm), so
// ring and arrow read as one element. Size in cm; the mesh is a unit chevron.
const ARROW_SIZE_CM = 7
const ARROW_PULSE = 0.3 // extra size at full loudness
const TAG_GAP_CM = 0.8
// The control strip (Focus.ts defaults: 60 cm ahead, centred 16.2 cm below eye level, 14.3 x 5.9 cm).
// Tags never overlap it, and a ring in the lower part of the view puts its tag above itself.
const STRIP_TOP_TAN = (16.2 - 2.95) / 60
const STRIP_HALF_TAN = 7.15 / 60
const STRIP_MARGIN_CM = 0.5
const TAG_ABOVE_BELOW_TAN = 0.09 // ring more than ~5 degrees below the view centre: tag goes above
const TAG_ABOVE_BACK_TAN = 0.05 // and returns under the ring once it is back above ~3 degrees
// The focused, sounding ring is the brightest thing on screen: pure white, larger, with a halo.
const FOCUS_COLOUR = new vec4(1, 1, 1, 1)
const FOCUS_RING_SCALE = 1.15
const HALO_SCALE = 1.22
const HALO_ALPHA = 0.55
// Caption line: same distance as the control panel (60 cm) and just above it, so it sits at the
// bottom of the view. Scaled by 60/110 so the text keeps the angular size it is tuned for at 110 cm.
const CAPTION_HEIGHT_CM = -8.5
const CAPTION_DISTANCE_CM = 60
const CAPTION_SCALE = CAPTION_DISTANCE_CM / 110

export interface Bearing {
  yaw: number // degrees, positive to the right of where the camera looks
  pitch: number // degrees, positive up
  angle: number // degrees between camera forward and the source
  mode: "ring" | "arrow"
  side: -1 | 1 // edge the arrow sits on
}

interface Element {
  readonly id: SourceId
  readonly root: SceneObject
  readonly ring: SceneObject
  readonly pivot: SceneObject
  readonly ringBase: number // cm, authored ring size
  readonly ringMat: Material
  readonly arrowMat: Material
  readonly outline: SceneObject // dark-blue outline behind the arrow
  readonly outlineMat: Material
  readonly halo: SceneObject
  readonly haloMat: Material
  readonly baseColor: vec4
  readonly tag: Label
  mode: "ring" | "arrow"
  side: -1 | 1
  morph: number // 0 arrow .. 1 ring
  vis: number // 0..1, fades over fadeSeconds
  loud: number // smoothed loudness
  wasActive: boolean
  overStrip: boolean // the ring overlaps the control strip
  tagAbove: boolean // ring tag sits above the ring (ring is low in the view); has hysteresis
  pos: vec3
  phi: number // degrees, direction the arrow points on screen
  bearing: Bearing
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const moveToward = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step)

@component
export class Bearings extends BaseScriptComponent {
  @input
  sources: SoundSources
  @input
  @hint("The Camera Object (the user's head).")
  camera: SceneObject
  @input
  @hint("Ind_Kettle, with children Ring and ArrowPivot.")
  kettleIndicator: SceneObject
  @input
  @hint("Ind_Doorbell, with children Ring and ArrowPivot.")
  doorbellIndicator: SceneObject
  @input
  @hint("Ind_Person, with children Ring and ArrowPivot.")
  personIndicator: SceneObject
  @input
  @hint("Ind_Alarm, with children Ring and ArrowPivot.")
  alarmIndicator: SceneObject

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Half-angle of the view cone in degrees. Inside it the indicator is a ring on the source.")
  coneHalfAngle: number = 14
  @input
  @hint("Extra degrees past the cone before a ring turns back into an arrow (stops flicker at the edge).")
  hysteresis: number = 5
  @input
  @hint("Angular distance from the view centre where the arrow sits, in degrees. Equal to the cone so the arrow and ring meet.")
  edgeAngle: number = 14
  @input
  @hint("How far from the eye the edge arrow floats, in cm.")
  edgeDistance: number = 110
  @input
  @hint("Seconds an indicator takes to fade in and out.")
  fadeSeconds: number = 0.5
  @ui.group_end

  private elements: Element[] = []
  private caption: Label
  private captionAlpha = 0

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.build())
    this.createEvent("UpdateEvent").bind(() => this.tick(getDeltaTime()))
  }

  /** Latest bearing for a source (used by Focus to find the ring in view, and by the tests). */
  getBearing(id: SourceId): Bearing {
    return this.element(id).bearing
  }

  /** True while any visible ring overlaps the control strip (Focus dims the strip then). */
  get ringOverStrip(): boolean {
    return this.elements.some((e) => e.overStrip && e.root.enabled)
  }

  /** The indicator's current visual state: used by the tests and by Focus. */
  getView(id: SourceId): {mode: "ring" | "arrow"; alpha: number; morph: number; tag: string; position: vec3} {
    const e = this.element(id)
    return {mode: e.mode, alpha: this.alphaOf(e), morph: e.morph, tag: e.tag.content, position: e.pos}
  }

  get captionText(): string {
    return this.caption.content
  }

  private element(id: SourceId): Element {
    return this.elements.find((e) => e.id === id)
  }

  private build(): void {
    const roots: Record<SourceId, SceneObject> = {
      kettle: this.kettleIndicator,
      doorbell: this.doorbellIndicator,
      person: this.personIndicator,
      alarm: this.alarmIndicator
    }
    this.sources.all.forEach((s) => this.elements.push(this.makeElement(s.id, roots[s.id])))
    this.caption = new Label(this.camera, "CaptionLine", 54, 46, STYLE_LIGHT)
    this.caption.root.getTransform().setLocalPosition(new vec3(0, CAPTION_HEIGHT_CM, -CAPTION_DISTANCE_CM))
    this.caption.root.getTransform().setLocalScale(new vec3(CAPTION_SCALE, CAPTION_SCALE, CAPTION_SCALE))
    this.caption.setAlpha(0)
  }

  private makeElement(id: SourceId, root: SceneObject): Element {
    const ring = this.child(root, "Ring")
    const pivot = this.child(root, "ArrowPivot")
    const ringVisual = ring.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const arrowVisual = this.child(pivot, "Arrow").getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    // Own materials, so each indicator fades independently.
    const baseColor = ringVisual.mainMaterial.mainPass.baseColor
    ringVisual.mainMaterial = ringVisual.mainMaterial.clone()
    arrowVisual.mainMaterial = arrowVisual.mainMaterial.clone()
    const arrow = this.child(pivot, "Arrow")
    arrow.getTransform().setLocalRotation(quat.quatIdentity())
    arrow.getTransform().setLocalScale(new vec3(ARROW_SIZE_CM, ARROW_SIZE_CM, ARROW_SIZE_CM))
    // Outline: a slightly heavier chevron drawn just behind the arrow, in the button-label blue.
    const outline = this.child(pivot, "ArrowOutline")
    outline.getTransform().setLocalRotation(quat.quatIdentity())
    outline.getTransform().setLocalScale(new vec3(ARROW_SIZE_CM, ARROW_SIZE_CM, ARROW_SIZE_CM))
    const outlineVisual = this.visualUnder(outline)
    outlineVisual.mainMaterial = arrowVisual.mainMaterial.clone()
    arrowVisual.setRenderOrder(1)
    outlineVisual.setRenderOrder(0)
    // Halo: a second, slightly larger copy of the ring, shown only while this source is held.
    const halo = global.scene.createSceneObject("Halo")
    halo.setParent(root)
    halo.layer = ring.layer
    const haloVisual = halo.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    haloVisual.mesh = ringVisual.mesh
    haloVisual.mainMaterial = ringVisual.mainMaterial.clone()
    halo.enabled = false
    const tag = new Label(root, "Tag", 48, 24, id === "alarm" ? STYLE_WARNING : STYLE_LIGHT)
    return {
      id,
      root,
      ring,
      pivot,
      ringBase: ring.getTransform().getLocalScale().x,
      ringMat: ringVisual.mainMaterial,
      arrowMat: arrowVisual.mainMaterial,
      outline,
      outlineMat: outlineVisual.mainMaterial,
      halo,
      haloMat: haloVisual.mainMaterial,
      baseColor,
      tag,
      mode: "arrow",
      side: 1,
      morph: 0,
      vis: 0,
      loud: 0,
      wasActive: false,
      tagAbove: false,
      overStrip: false,
      pos: root.getTransform().getWorldPosition(),
      phi: 0,
      bearing: {yaw: 0, pitch: 0, angle: 180, mode: "arrow", side: 1}
    }
  }

  /** The RenderMeshVisual on an object or on one of its descendants (an instantiated mesh prefab nests it). */
  private visualUnder(obj: SceneObject): RenderMeshVisual {
    const own = obj.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (own) return own
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const found = this.visualUnder(obj.getChild(i))
      if (found) return found
    }
    return null
  }

  private child(parent: SceneObject, name: string): SceneObject {
    for (let i = 0; i < parent.getChildrenCount(); i++) {
      if (parent.getChild(i).name === name) return parent.getChild(i)
    }
    throw new Error("Bearings: " + parent.name + " has no child named " + name)
  }

  private tick(dt: number): void {
    if (this.elements.length === 0) return
    const camT = this.camera.getTransform()
    const camPos = camT.getWorldPosition()
    const camRot = camT.getWorldRotation()
    const toCamera = camT.getInvertedWorldTransform()
    const focusId = this.sources.focused
    this.sources.all.forEach((s) => {
      this.updateElement(this.element(s.id), s, {camPos, camRot, toCamera}, focusId, dt)
    })
    this.updateCaption(dt)
  }

  private updateElement(
    e: Element,
    s: SourceState,
    cam: {camPos: vec3; camRot: quat; toCamera: mat4},
    focusId: SourceId | null,
    dt: number
  ): void {
    const srcPos = s.object.getTransform().getWorldPosition()
    const local = cam.toCamera.multiplyPoint(srcPos) // camera space: +X right, +Y up, -Z forward
    const horizontal = Math.sqrt(local.x * local.x + local.z * local.z)
    e.bearing.yaw = Math.atan2(local.x, -local.z) * DEG
    e.bearing.pitch = Math.atan2(local.y, horizontal) * DEG
    e.bearing.angle = Math.acos(clamp(-local.z / Math.max(local.length, 0.0001), -1, 1)) * DEG

    const heldSilent = focusId === s.id && !s.active && this.sources.time < TIMELINE_END_S
    if (s.active && !e.wasActive) this.startElement(e, local)
    e.wasActive = s.active

    this.updateMode(e, heldSilent)
    this.updateSide(e)

    // Where it should be: on the source (ring) or on the edge of the view (arrow).
    e.phi = this.edgeDirection(e, local)
    const target = e.mode === "ring" ? srcPos : this.edgePosition(cam, e.phi)
    e.pos = e.vis <= 0.001 ? target : e.pos.add(target.sub(e.pos).uniformScale(1 - Math.exp(-FOLLOW_RATE * dt)))
    e.root.getTransform().setWorldPosition(e.pos)
    e.root.getTransform().setWorldRotation(cam.camRot) // parallel to the view, so rings and tags face the user
    e.bearing.mode = e.mode
    e.bearing.side = e.side

    const targetVis = s.active ? 1 : heldSilent && e.mode === "ring" ? FAINT_ALPHA : 0
    e.vis = moveToward(e.vis, targetVis, dt / this.fadeSeconds)
    e.morph = moveToward(e.morph, e.mode === "ring" ? 1 : 0, dt / MORPH_SECONDS)
    e.loud += (s.loudness - e.loud) * Math.min(1, dt * 12)

    this.draw(e, focusId === s.id, cam.camPos)
  }

  private startElement(e: Element, local: vec3): void {
    const angle = e.bearing.angle
    e.mode = angle < this.coneHalfAngle ? "ring" : "arrow"
    e.side = local.x >= 0 ? 1 : -1
    e.morph = e.mode === "ring" ? 1 : 0
    e.vis = 0
  }

  /** Ring inside the cone, arrow outside it; 5 degrees of hysteresis at the cone edge. */
  private updateMode(e: Element, heldSilent: boolean): void {
    const angle = e.bearing.angle
    if (e.mode === "arrow" && angle < this.coneHalfAngle) e.mode = "ring"
    else if (e.mode === "ring" && angle > this.coneHalfAngle + this.hysteresis) e.mode = "arrow"
    if (heldSilent && e.mode === "arrow") e.vis = 0 // a held sound that is out of view shows nothing
  }

  /**
   * The arrow stays on its side. It only changes sides when the source is clearly in front on the
   * other side, so a source directly behind (or sliding past behind) never makes it jump across.
   */
  private updateSide(e: Element): void {
    const yaw = e.bearing.yaw
    const clearlyInFront = Math.abs(yaw) > SIDE_FLIP_MIN_YAW && Math.abs(yaw) < SIDE_FLIP_MAX_YAW
    if (clearlyInFront) e.side = yaw > 0 ? 1 : -1
  }

  /** Direction (degrees, 0 = right, 90 = up) the arrow points and sits at on the edge circle. */
  private edgeDirection(e: Element, local: vec3): number {
    const inFront = local.z < 0
    if (inFront) return Math.atan2(local.y, local.x) * DEG
    const tilt = clamp(e.bearing.pitch, -MAX_TILT, MAX_TILT)
    return e.side > 0 ? tilt : 180 - tilt
  }

  private edgePosition(cam: {camPos: vec3; camRot: quat}, phiDeg: number): vec3 {
    const edge = this.edgeAngle * RAD
    const phi = phiDeg * RAD
    const dir = new vec3(Math.sin(edge) * Math.cos(phi), Math.sin(edge) * Math.sin(phi), -Math.cos(edge))
    return cam.camPos.add(cam.camRot.multiplyVec3(dir).uniformScale(this.edgeDistance))
  }

  private alphaOf(e: Element): number {
    const isAlarm = e.id === "alarm" // the alarm always breaks through at full brightness
    const focus = this.sources.focused
    const dim = focus !== null && focus !== e.id && !isAlarm ? DIMMED_ALPHA : 1
    return e.vis * dim
  }

  private draw(e: Element, focused: boolean, camPos: vec3): void {
    const alpha = this.alphaOf(e)
    e.root.enabled = alpha > 0.01
    if (!e.root.enabled) {
      e.overStrip = false
      return
    }
    const state = this.sources.get(e.id)
    const held = focused && state.active // the focused sound is sounding right now
    const pulse = 1 + ARROW_PULSE * e.loud
    const distance = e.pos.distance(camPos)
    const ringBase = Math.max(e.ringBase, distance * MIN_RING_TAN)
    const ringScale = ringBase * (0.4 + 0.6 * e.morph) * (held ? FOCUS_RING_SCALE : 1) * (1 + 0.06 * e.loud)
    e.ring.enabled = e.morph > 0.02
    e.ring.getTransform().setLocalScale(new vec3(ringScale, ringScale, ringScale))
    const arrowScale = (1 - e.morph) * pulse
    e.pivot.enabled = e.morph < 0.98
    e.pivot.getTransform().setLocalScale(new vec3(arrowScale, arrowScale, arrowScale))
    e.pivot.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, e.phi * RAD))
    e.outlineMat.mainPass.baseColor = new vec4(OUTLINE_COLOUR.r, OUTLINE_COLOUR.g, OUTLINE_COLOUR.b, alpha)
    const c = held && e.id !== "alarm" ? FOCUS_COLOUR : e.baseColor
    e.ringMat.mainPass.baseColor = new vec4(c.r, c.g, c.b, alpha)
    e.arrowMat.mainPass.baseColor = new vec4(c.r, c.g, c.b, alpha)
    const haloOn = held && e.mode === "ring" && e.morph > 0.5
    e.halo.enabled = haloOn
    if (haloOn) {
      const h = ringScale * HALO_SCALE
      e.halo.getTransform().setLocalScale(new vec3(h, h, h))
      e.haloMat.mainPass.baseColor = new vec4(c.r, c.g, c.b, alpha * HALO_ALPHA)
    }

    // Tag, attached to the element and moving with it: under the ring, or just inside the view edge
    // next to the arrow (on the line from the arrow towards the centre of the view). Scaled with
    // distance so it stays readable.
    e.tag.setText(e.mode === "ring" ? state.ringTag : state.arrowTag)
    const dimmed = focused === false && this.sources.focused !== null && e.id !== "alarm"
    e.tag.setAlpha(dimmed ? e.vis * DIMMED_TAG_ALPHA : alpha)
    e.tag.setStyle(e.id === "alarm" ? STYLE_WARNING : held ? STYLE_FOCUS : STYLE_LIGHT)
    const tagScale = clamp(distance / 110, 1, 3.5) * (focused ? 1.3 : 1)
    const halfW = (e.tag.size.x / 2) * tagScale
    const halfH = (e.tag.size.y / 2) * tagScale
    const ringRadius = (ringScale / 2) * (haloOn ? HALO_SCALE : 1)
    const underRing = new vec2(0, -(ringRadius + halfH + TAG_GAP_CM * tagScale))
    const dx = Math.cos(e.phi * RAD)
    const dy = Math.sin(e.phi * RAD)
    const inward = (ARROW_SIZE_CM * 0.5 * pulse) + Math.abs(dx) * halfW + Math.abs(dy) * halfH + TAG_GAP_CM
    const besideArrow = new vec2(-dx * inward, -dy * inward)
    // View-space position of the element (the root is parallel to the camera, so offsets add directly).
    const rel = this.camera.getTransform().getInvertedWorldTransform().multiplyPoint(e.pos)
    const depth = Math.max(1, -rel.z)
    const lowTan = -rel.y / depth
    if (e.morph > 0.5) e.tagAbove = lowTan > (e.tagAbove ? TAG_ABOVE_BACK_TAN : TAG_ABOVE_BELOW_TAN)
    const ringBottom = rel.y - ringRadius
    e.overStrip =
      e.mode === "ring" && e.morph > 0.5 && ringBottom < -STRIP_TOP_TAN * depth && Math.abs(rel.x) < STRIP_HALF_TAN * depth + ringRadius
    const abovePos = new vec2(0, ringRadius + halfH + TAG_GAP_CM * tagScale)
    const ringTagPos = e.tagAbove ? abovePos : underRing
    const at = besideArrow.add(ringTagPos.sub(besideArrow).uniformScale(e.morph))
    // Keep the tag clear of the control strip: lift it if its bottom edge would sit inside the strip.
    const stripTop = -STRIP_TOP_TAN * depth + STRIP_MARGIN_CM * tagScale
    const overlapsX = Math.abs(rel.x + at.x) < STRIP_HALF_TAN * depth + halfW
    if (overlapsX && rel.y + at.y - halfH < stripTop) at.y = stripTop + halfH - rel.y
    e.tag.root.getTransform().setLocalScale(new vec3(tagScale, tagScale, tagScale))
    e.tag.root.getTransform().setLocalPosition(new vec3(at.x, at.y, 0.3))
  }

  private updateCaption(dt: number): void {
    const text = this.sources.caption
    if (text !== "") {
      this.caption.setText(text)
      this.caption.setStyle(this.sources.get("alarm").active ? STYLE_WARNING : STYLE_LIGHT)
    }
    this.captionAlpha = moveToward(this.captionAlpha, text !== "" ? 1 : 0, dt / this.fadeSeconds)
    this.caption.setAlpha(this.captionAlpha)
  }
}
