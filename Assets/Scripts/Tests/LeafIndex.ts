import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {KettleRingScenario} from "./KettleRingScenario"
import {DoorbellArrowScenario} from "./DoorbellArrowScenario"
import {PersonCallScenario} from "./PersonCallScenario"
import {FocusScenario} from "./FocusScenario"
import {AlarmAndReplayScenario} from "./AlarmAndReplayScenario"
import {BehindStaysPutScenario} from "./BehindStaysPutScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-kettle-ring", typename: KettleRingScenario.getTypeName()},
    {id: "c2-doorbell-arrow", typename: DoorbellArrowScenario.getTypeName()},
    {id: "c3-person-call", typename: PersonCallScenario.getTypeName()},
    {id: "c4-focus", typename: FocusScenario.getTypeName()},
    {id: "c5-alarm-replay", typename: AlarmAndReplayScenario.getTypeName()},
    {id: "x-behind-stays-put", typename: BehindStaysPutScenario.getTypeName()},
  ]
}
