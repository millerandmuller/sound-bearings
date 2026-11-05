import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Criterion 4: a real press on Focus keeps the kettle bright and dims the rest; a second press releases. */
@component
export class FocusScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()
    const interactor = new DefaultLeafInteractor()
    await startAt(rig, 10.2) // kettle sounds to 13 s, doorbell joins at 12 s

    await interactor.trigger(findInteractableByName("FocusButton"))
    await sleep(300)
    expect(rig.sources.focused).toBe("kettle")
    while (rig.sources.time < 12.5) await sleep(50) // doorbell has joined, kettle still sounds
    expect(rig.sources.get("kettle").active).toBe(true)
    expect(rig.sources.get("doorbell").active).toBe(true)
    expect(rig.bearings.getView("kettle").alpha).toBeGreaterThan(BRIGHT_MIN)
    expect(rig.bearings.getView("doorbell").alpha).toBeLessThan(DIM_MAX)
    expect(rig.bearings.getView("doorbell").alpha).toBeGreaterThan(0.2)
    expect(rig.sources.get("doorbell").audio.volume).toBeCloseTo(0.3, 2)

    await interactor.trigger(findInteractableByName("FocusButton"))
    await sleep(900)
    expect(rig.sources.focused).toBeNull()
    expect(rig.bearings.getView("doorbell").alpha).toBeGreaterThan(BRIGHT_MIN)
  }
}

