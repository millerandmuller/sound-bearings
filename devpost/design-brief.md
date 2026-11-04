---
status: approved
---

# Design brief: Sound Bearings (name from the project file, default)

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
Mara is at the kitchen counter with her hands in the dough, her back to the room, looking at the counter and the kettle ahead of her. The kettle starts: a light ring appears on the kettle with a small tag "Kettle", then fades when it stops. Then someone at the doorway behind her, on her left, calls "Mara?". She cannot tell where it came from. On the glasses, an arrow pulses at the left edge of her view with the word "Mara?" on it. She turns left, the arrow slides along the edge and turns into a ring on the person at the doorway, with the tag "Someone called you". That turn is the moment.

## Why it belongs on glasses
- Uses: shares your view (the arrow lives at the edge of what she is already looking at), draws in the world (the ring sits on the person or object in the room, not on a screen), leaves your body free (her hands never leave the dough).
- Why it's better than the phone or laptop version: a phone screen would need her to stop, wash her hands and look down. On the glasses the direction of a sound is shown in the room, where the sound is.

## Product or overlay
- Type: overlay. It responds to sounds in the real kitchen.
- What the real version would sense: the direction of real sounds (kettle, doorbell, a voice calling her name, a smoke alarm). Live detection is the next step and is not part of this Lens.
- Stand-in for the preview: four scripted, simulated sound sources in a virtual kitchen built from primitives. Each stand-in carries its own spatial sound source and exists only so the ring has something to sit on. No real objects are recognised. The first caption says so.

The stand-ins:
- Counter: in front of the user.
- Kettle: a small simple model or a box on the counter, ahead-left, about 1.2 m away.
- Person: a faceless figure (a capsule with a head) standing in the doorway behind-left, about 2.5 m away, chest height.
- Doorbell: a small box on the wall behind-right, 3 m away.
- Smoke alarm: a disc on the ceiling behind the user, 2.5 m away.
- Doorway: behind-left.

## Where things live
- Where the user is looking during the main task: at the counter and the kettle ahead of her, at start. Then wherever she turns toward a sound.
- Ring: sits on the sound source when the source is in front of her (in view). Light ring with a small tag naming the sound. Ring size fits the source, for example roughly 20 cm across on the kettle and about 40 cm on the person (default).
- Arrow: when the source is behind or beside her (out of view), an arrow sits at the edge of her view on the side the sound is on, with a short caption. As she turns toward the source, the arrow slides along the edge and becomes a ring on the source. If she turns the other way, the arrow stays on its own edge and never jumps to the other side.
- Control panel: a small panel that follows her view, at the bottom centre, about 60 cm from her, a little below eye level, so it is in the same place whether she faces the counter or the doorway.
  - Focus button: on the panel, about 8 cm wide.
  - Replay button: on the same panel, to the right of Focus, smaller, about 4 cm, visually quiet.
- Caption line: one short caption line near the bottom of her view, above the panel (default). Used for the first caption and the smoke alarm caption.

## Hands and input
- Focus: pinch the Focus button (SIK button). One pinch turns Focus on, a second pinch releases it.
- Replay: pinch the Replay button. It restarts the whole 45-second timeline from the first caption. It is for the learner, to record the video and run the tests from the same starting point every time.
- Targets are big and highlight when aimed at. Both are SIK buttons with hover highlight.
- Voice: none. No voice commands.

How Focus chooses a sound:
- Focus picks the source whose ring is in view and sounding at the moment of the pinch. If two are in view, it picks the one nearest the centre of the view.
- If nothing is sounding, the pinch does nothing except a short pulse on the button.
- Once focused, Focus holds until the next pinch.
- While the focused sound plays: its ring is bright and its tag is larger. All other rings and arrows are dimmed to about 30 percent and their volume is lowered (to about 30 percent, default).
- When the focused sound goes silent: its ring stays as a faint outline on the source so she can see what she is holding, and the others stay dimmed.
- Exception: the smoke alarm always breaks through at full brightness in its own colour, with the caption "Smoke alarm (simulated). Not a safety device.", with or without Focus.

## When things show
The timeline is a fixed 45-second loop that plays on its own after the Lens opens:

| Time | What happens |
|---|---|
| 0 to 3 s | Caption: "Sounds are simulated in this preview; live detection is the next step." |
| 3 to 13 s | Kettle sounds. Ring and tag "Kettle" on the kettle when in view; arrow at the edge when not. |
| 12 to 18 s | Doorbell sounds, behind-right. Arrow with tag "Doorbell" on the right edge, becomes a ring when she faces it. |
| 24 to 27 s | The person calls "Mara?" from the doorway, behind-left. Arrow pulses on the left edge with the caption "Mara?", becomes a ring with the tag "Someone called you" when she faces the doorway. |
| 27 to 30 s | Quiet gap. |
| 30 to 40 s | Kettle sounds again. In the demo, Focus is pinched while the kettle sounds, at about 32 s. |
| 36 to 44 s | Smoke alarm fires while Focus is on. It breaks through at full brightness in its own colour with its caption. |
| 45 s | End. |

- Each ring or arrow shows only while its sound is playing, then fades (fade time about 0.5 s, default).
- Focus panel: always visible, follows her view.
- If something needs attention out of view: an arrow at the edge of her view on the side the sound is on, with a caption. The spatial sound also comes from the source.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Facing the counter while the kettle sounds, one ring appears on the kettle with the tag "Kettle", and it fades when the kettle stops.
2. While the doorbell sounds behind-right, an arrow with the tag "Doorbell" sits on the right edge of my view. Turning right makes it slide along the edge and become a ring on the doorbell. Turning left instead keeps the arrow on the right edge; it never jumps to the other side.
3. When the person calls "Mara?" from the doorway behind-left, the arrow on the left edge pulses with the caption "Mara?", and when I face the doorway it becomes a ring on the figure with the tag "Someone called you".
4. Pinching Focus while the kettle's ring is in view keeps that ring bright and dims every other ring and arrow to about 30 percent. Pinching Focus again releases them.
5. When the smoke alarm fires during Focus, its indicator shows at full brightness in its own colour with the caption "Smoke alarm (simulated). Not a safety device.", and pressing Replay restarts the whole 45-second sequence from the first caption.

## Out of scope
- Live sound detection or any real microphone use. Sounds are scripted.
- Recognising real objects or real people.
- Voice commands.
- Any sounds beyond the four sources (kettle, doorbell, person calling, smoke alarm).
- Use as a safety device. The smoke alarm caption says so.

## Risks and open questions
- Feel unproven: whether the edge arrow is comfortable to notice on real glasses, and how it feels to turn and follow it. Only real glasses can answer this.
- Real direction finding of sound is not proven here. The preview only shows what happens after a direction is already known.
- The Replay button is small (about 4 cm), below the usual habit of big targets. Kept on purpose, because it is for the learner and not for Mara.
- Spatial sound direction in the preview may be hard to judge by ear. The visual rings and arrows carry the criteria.
- Mara is hard of hearing, so the Lens must not depend on hearing the sounds. Sound playback in the preview is there for the video, and every sound also has a visual indicator.
- The person stand-in is a faceless figure. No one is recorded, identified or followed.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
