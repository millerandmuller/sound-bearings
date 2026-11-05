import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Extra: with a source directly behind, the arrow stays on its side for 60 frames. */
@component
export class BehindStaysPutScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()
    await startAt(rig, 12.2)
    const side = rig.bearings.getBearing("doorbell").side
    expect(side).toBe(1)

    // Put the doorbell exactly behind: turn so its yaw is 180, then wobble 4 degrees each way.
    const turnLeft = 180 - Math.abs(yawOf(rig, "doorbell"))
    turnTo(rig, -turnLeft)
    await sleep(500)
    expect(Math.abs(Math.abs(yawOf(rig, "doorbell")) - 180)).toBeLessThan(2)

    let n = 0
    await frames(60, () => {
      n++
      turnTo(rig, -turnLeft + 4 * Math.sin((n / 60) * 2 * Math.PI)) // crosses straight-behind both ways
      const b = rig.bearings.getBearing("doorbell")
      expect(b.mode).toBe("arrow")
      expect(b.side).toBe(side)
    })
  }
}
