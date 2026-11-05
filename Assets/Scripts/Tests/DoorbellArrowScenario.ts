import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Criterion 2: doorbell arrow on the right edge, slides into a ring on turning right, stays right on turning left. */
@component
export class DoorbellArrowScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()

    await startAt(rig, 12.2)
    let view = rig.bearings.getView("doorbell")
    expect(view.mode).toBe("arrow")
    expect(view.tag).toBe("Doorbell")
    expect(rig.bearings.getBearing("doorbell").side).toBe(1)

    // Turn right to face it: the same element slides along the edge and becomes a ring.
    const toFace = yawOf(rig, "doorbell")
    const morphSeen: number[] = []
    await turnSmoothly(rig, 0, toFace, 8, () => {
      expect(rig.bearings.getBearing("doorbell").side).toBe(1)
      morphSeen.push(rig.bearings.getView("doorbell").morph)
    })
    await sleep(700)
    view = rig.bearings.getView("doorbell")
    expect(view.mode).toBe("ring")
    expect(view.tag).toBe("Doorbell")
    expect(Math.min(...morphSeen)).toBeGreaterThan(-0.001)
    expect(view.morph).toBeGreaterThan(0.95)

    // Replay the doorbell and turn the other way: the arrow never jumps to the left edge.
    await startAt(rig, 12.2)
    await turnSmoothly(rig, 0, -100, 10, () => {
      const b = rig.bearings.getBearing("doorbell")
      expect(b.mode).toBe("arrow")
      expect(b.side).toBe(1)
    })
  }
}

