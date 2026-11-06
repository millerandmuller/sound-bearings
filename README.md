# Sound Bearings

A Lens for Snap Spectacles (SPECS) that shows where a sound is coming from. It is built for the Devpost "Learn AR with SPECS" hackathon.

## What it does

Sound Bearings puts a visual marker on each sound the wearer cannot place by ear.

- **A ring on the sound, when it is in view.** If a sound comes from something you are looking at, a thin ring sits on that object with a short label, for example "Kettle". The ring pulses with the loudness of the sound.
- **An arrow at the edge, when it is beside or behind you.** If the sound comes from outside your view, an arrow sits at the edge of your view on the side of the shorter turn, with the label next to it. As you turn toward the sound, the arrow slides along the edge and becomes the ring. It is one element changing shape, not a swap. A sound directly behind you does not make the arrow jump from side to side. The smoke alarm on the ceiling tilts its arrow up.
- **One Focus pinch.** Pinch the Focus button while a ring is in view and sounding. That sound is held. The other sounds drop to 30 percent volume, and their rings and arrows drop to 30 percent brightness (their labels stay readable at 50 percent). Pinch again to release. If the held sound goes silent, its ring stays as a faint outline.
- **The smoke alarm always breaks through.** Focus never dims it. It uses its own orange colour, and a caption appears while it sounds.
- **Replay** restarts the 45-second kitchen scene, so it can be recorded or tested again.

A ring appears when a sound is within 14 degrees of the centre of your view. It turns back into an arrow once the sound is more than 19 degrees away (5 degrees of hysteresis, so it does not flicker at the border).

## Who it is for

A person who is hard of hearing. In the video this is "Mara". She is in her kitchen and cannot tell where the kettle, the doorbell or the person calling her name are. The Lens answers one question: where is that sound, and which way do I turn?

## How it was built

- **Planned** with the Devpost Learn skill pack: the `plan-lens` skill interviewed the idea against AR design practice and what the Lens Studio preview can do, and wrote [`devpost/design-brief.md`](devpost/design-brief.md).
- **Built** by CLAD (an AI coding agent) working through the Lens Studio MCP server, following that brief, with a person reviewing after each stage.
- **Tools:** Lens Studio 5.23.2, SPECS Base Template, Spectacles Interaction Kit (SIK) 2.0.0, Spectacles UI Kit 2.0.0, LEAF 2.0.2 for tests.
- **Code:** three scripts in `Assets/Scripts/`: `SoundSources.ts` (the 45-second timeline, loudness, focus state), `Bearings.ts` (the rings, arrows, tags and captions), `Focus.ts` (the control panel and the Focus rule). `Label.ts` is a small helper for tag and caption plates. The buttons are UI Kit buttons on SIK.

### Tests (LEAF)

Six scenarios live in `Assets/Scripts/Tests/`. They run in the Lens Studio preview, press Focus and Replay through the real SIK buttons, and all six pass.

| Scenario | What it asserts |
|---|---|
| `c1-kettle-ring` | While the kettle sounds, its indicator is a bright ring tagged "Kettle". When the kettle stops, the ring fades out. |
| `c2-doorbell-arrow` | The doorbell starts as an arrow on the right edge tagged "Doorbell". Turning right slides it into a ring without jumping. Turning left keeps the arrow on the right edge. |
| `c3-person-call` | "Mara?" shows as an arrow on the left edge that pulses with the voice. Facing the doorway turns it into a ring tagged "Someone called you". |
| `c4-focus` | A press on Focus holds the kettle: it stays bright, the doorbell drops below 40 percent brightness and to 30 percent volume. A second press releases both. |
| `c5-alarm-replay` | With the kettle held, the smoke alarm still shows at full brightness and full volume with its caption. Replay clears Focus and restarts at the first caption. |
| `x-behind-stays-put` | With a source directly behind the wearer, its arrow stays on the same side for 60 frames. |

What the tests do not cover: the alarm's orange colour, the exact size of the pulse (only that the loudness varies), whether a real hand can reach the buttons, and how the sound direction actually sounds.

## What is simulated

This is a demonstration of the response, not of detection.

- **Four scripted sound sources** play on a fixed 45-second timeline in a virtual kitchen (kettle, doorbell, a person calling "Mara?", smoke alarm). There is **no microphone input and no live sound detection**. The Lens does not listen to anything.
- **Sound effects:** the kettle, doorbell and smoke alarm were generated with ElevenLabs. The voice saying "Mara?" was recorded by a person.
- **3D assets:** the counter, upper cabinets, kettle and figure were generated inside Lens Studio (GenerateFast3DAssets) and simplified to about 8,000 vertices each. The doorway, walls, ceiling, doorbell and smoke alarm are plain shapes made in the scene.
- The sounds are positioned in 3D with Lens Studio spatial audio. This version was built and checked in the Lens Studio preview. It has not been tried on glasses.

| Time (s) | What happens |
|---|---|
| 0 to 3 | Caption explaining the scene |
| 3 to 13 and 30 to 40 | Kettle (ahead, to the left) |
| 12 to 18 | Doorbell (behind, to the right) |
| 24 to 27 | "Mara?" from the doorway (behind, to the left) |
| 27 to 29 | The "Someone called you" ring holds, then fades |
| 33 to 37 | Doorbell rings again (behind-right), dimmed under Focus |
| 36 to 44 | Smoke alarm (ceiling, behind) |

## Not a safety device

Sound Bearings is a demonstration. The smoke alarm in it is simulated and is not a smoke alarm. It does not detect real sound or real danger, and it must not be relied on to warn anyone of anything.

## What we learned

1. **The preview's field of view is narrow.** About 17 degrees to each side. A 20-degree ring cone put the ring off screen, so the cone and the edge arrow are 14 degrees.
2. **The display adds light.** Black shows as transparent, so every plate, label and indicator is light, and a dark outline is only a faint edge on glasses. We only judged this in the preview.
3. **What can be tested is the response.** Detection is faked, so the tests check what the Lens does with a sound it is told about: the ring, the arrow, the turn, Focus and the alarm. Real sound detection, real direction by ear and a real pinch are not tested.

## Run it in the preview

1. Open `SoundBearings.esproj` in Lens Studio 5.23.2.
2. In the Preview panel, use the Interactive preview and press **Reset**.
3. Face the counter. The kettle ring appears at 3 seconds.
4. **Right-drag** to turn. At 12 seconds the doorbell arrow appears on the right edge. Turn toward it and it becomes a ring. At 24 seconds "Mara?" appears as an arrow on the left edge.
5. **Click Focus** (the mouse acts as the pinch) while a ring is in view and sounding. Click it again to release.
6. **Click Replay** to restart the scene.

To run the tests, open the LEAF panel in Lens Studio (the LEAF package is already in the project) and run the six scenarios one at a time.

## License

MIT. See [LICENSE](LICENSE).
