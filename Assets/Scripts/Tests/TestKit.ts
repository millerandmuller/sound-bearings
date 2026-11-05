// Shared helpers for the LEAF scenarios. A plain module, not a component.
// Turning the user: in the preview the camera pose belongs to the preview, so the tests turn the
// kitchen instead, about the camera position (the kitchen root already sits there). Turning the room
// left by N degrees is the same view as the user turning right by N degrees.
import {findSceneObjectByName, sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {Bearings} from "../Bearings"
import {SoundSources, SourceId} from "../SoundSources"

export interface Rig {
  sources: SoundSources
  bearings: Bearings
  kitchen: SceneObject
  baseRotation: quat
}

export async function getRig(): Promise<Rig> {
  await sleep(1500) // Focus builds its panel and Bearings its indicators in OnStart
  const host = findSceneObjectByName("SoundBearings")
  const kitchen = findSceneObjectByName("Kitchen")
  const rig: Rig = {
    sources: host.getComponent(SoundSources.getTypeName()) as SoundSources,
    bearings: host.getComponent(Bearings.getTypeName()) as Bearings,
    kitchen,
    baseRotation: baseRotationOf(kitchen),
  }
  return rig
}

// Scenarios share one live Lens: remember the authored heading the first time, reuse it after.
let remembered: quat | null = null
function baseRotationOf(kitchen: SceneObject): quat {
  if (remembered === null) remembered = kitchen.getTransform().getWorldRotation()
  return remembered
}

/** Turn the user to the right by `degrees` from the start heading (negative turns left). */
export function turnTo(rig: Rig, degrees: number): void {
  const rad = (degrees * Math.PI) / 180
  rig.kitchen.getTransform().setWorldRotation(quat.angleAxis(rad, vec3.up()).multiply(rig.baseRotation))
}

/** Jump the timeline to a time, face front, and let the indicators settle. */
export async function startAt(rig: Rig, seconds: number, headingDeg: number = 0): Promise<void> {
  turnTo(rig, headingDeg)
  rig.sources.seek(seconds)
  await sleep(700)
}

/** Yaw of a source from where the user looks now, degrees, positive right. */
export function yawOf(rig: Rig, id: SourceId): number {
  return rig.bearings.getBearing(id).yaw
}

export async function frames(count: number, each: () => void): Promise<void> {
  for (let i = 0; i < count; i++) {
    await nextFrame()
    each()
  }
}

export const DIM_MAX = 0.4 // "about 30 percent"
export const BRIGHT_MIN = 0.9

export async function turnSmoothly(rig: Rig, fromDeg: number, toDeg: number, steps: number, afterEach: () => void): Promise<void> {
  for (let i = 1; i <= steps; i++) {
    turnTo(rig, fromDeg + ((toDeg - fromDeg) * i) / steps)
    await sleep(120)
    afterEach()
  }
}

