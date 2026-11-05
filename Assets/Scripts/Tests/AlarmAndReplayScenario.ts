import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {ALARM_CAPTION, FIRST_CAPTION} from "../SoundSources"
import {BRIGHT_MIN, DIM_MAX, frames, getRig, startAt, turnSmoothly, turnTo, yawOf} from "./TestKit"

/** Criterion 5: the alarm breaks through Focus with its caption; Replay restarts from the first caption. */
@component
export class AlarmAndReplayScenario extends Scenario {
  async run(): Promise<void> {
    const rig = await getRig()
    const interactor = new DefaultLeafInteractor()
    await startAt(rig, 34) // kettle sounds 30 to 40 s

    await interactor.trigger(findInteractableByName("FocusButton"))
    await sleep(300)
    expect(rig.sources.focused).toBe("kettle")
    await sleep(2600) // alarm fires at 36 s
    expect(rig.sources.get("alarm").active).toBe(true)
    expect(rig.bearings.getView("alarm").alpha).toBeGreaterThan(BRIGHT_MIN)
    expect(rig.bearings.getView("alarm").tag).toBe("Smoke alarm")
    expect(rig.bearings.captionText).toBe(ALARM_CAPTION)
    expect(rig.sources.get("alarm").audio.volume).toBe(1)

    await interactor.trigger(findInteractableByName("ReplayButton"))
    await sleep(600)
    expect(rig.sources.time).toBeLessThan(2)
    expect(rig.sources.focused).toBeNull()
    expect(rig.sources.active.length).toBe(0)
    expect(rig.bearings.captionText).toBe(FIRST_CAPTION)
    await sleep(3200) // the kettle comes back at 3 s: the sequence really restarted
    expect(rig.sources.get("kettle").active).toBe(true)
  }
}

