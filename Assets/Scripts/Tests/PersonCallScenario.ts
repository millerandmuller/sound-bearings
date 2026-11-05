import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Criterion 3: "Mara?" arrow on the left edge pulses; facing the doorway makes a ring "Someone called you". */
@component
export class PersonCallScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()
    await startAt(rig, 24.1)
    let view = rig.bearings.getView("person")
    expect(view.mode).toBe("arrow")
    expect(view.tag).toBe("Mara?")
    expect(rig.bearings.getBearing("person").side).toBe(-1)

    const loud: number[] = []
    await frames(90, () => loud.push(rig.sources.get("person").loudness))
    expect(Math.max(...loud) - Math.min(...loud)).toBeGreaterThan(0.2) // it pulses

    rig.sources.seek(24.8) // keep the call going while turning
    const toFace = yawOf(rig, "person")
    await turnSmoothly(rig, 0, toFace, 5, () => {})
    await sleep(600)
    view = rig.bearings.getView("person")
    expect(view.mode).toBe("ring")
    expect(view.tag).toBe("Someone called you")
  }
}

