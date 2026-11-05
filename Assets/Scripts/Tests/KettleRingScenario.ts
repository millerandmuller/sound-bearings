import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Criterion 1: ring with the tag "Kettle" while it sounds, gone when it stops. */
@component
export class KettleRingScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()
    await startAt(rig, 3.2)
    expect(rig.sources.get("kettle").active).toBe(true)
    const view = rig.bearings.getView("kettle")
    expect(view.mode).toBe("ring")
    expect(view.tag).toBe("Kettle")
    expect(view.alpha).toBeGreaterThan(BRIGHT_MIN)
    rig.sources.seek(13.2) // kettle stopped at 13 s
    await sleep(1200)
    expect(rig.sources.get("kettle").active).toBe(false)
    expect(rig.bearings.getView("kettle").alpha).toBeLessThan(0.05)
  }
}

