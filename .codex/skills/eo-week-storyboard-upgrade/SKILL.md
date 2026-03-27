---
name: eo-week-storyboard-upgrade
description: Use when updating an Endless Opportunities lesson to the new storyboard-first AJ/Nia/Malik format, especially when multiple agents need to upgrade different weeks in parallel while preserving one continuous plot and matching the week 0 transformation.
---

# EO Week Storyboard Upgrade

Use this skill when converting an EO lesson into the cleaned-up narrated storyboard format established in week 0.

## Read first

1. Read [`/home/nate/autonateai-workspace/eo-course/EO_STORY_ARC.md`](/home/nate/autonateai-workspace/eo-course/EO_STORY_ARC.md).
2. Read [`references/week0-before-after.md`](references/week0-before-after.md).
3. Inspect the target week's:
   - `index.html`
   - `story.json`
   - `audio/manifest.json`
   - `storyboards.json` if it exists

## Goal

Turn a lesson from the old graph-heavy interactive format into the current EO format:

- AJ / Nia / Malik story beats
- Sage narration
- storyboard-first visual experience
- one top play button plus slide dots
- no student-facing voice or mute controls
- no spoken section titles
- three activity sets that match the story precisely

## The week 0 pattern is the baseline

Use [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/index.html`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/index.html) and [`/home/nate/autonateai-workspace/eo-course/courses/shared/css/lesson-interactive.css`](/home/nate/autonateai-workspace/eo-course/courses/shared/css/lesson-interactive.css) as the source of truth for the target student experience.

Do not preserve old controls just because they existed before.

## Required workflow

1. Align the story to the shared five-week arc in `EO_STORY_ARC.md`.
2. Rewrite each lesson segment so AJ, Nia, and Malik each have a role in the beat.
3. Keep Sage as the guided narrator voice.
4. Regenerate narration with section titles omitted.
   - Use:
   - `npm run audio:lesson -- --lesson=<lesson-path> --voice=sage --label='Sage Story Guide' --default=true --clean=true --omit-titles=true`
5. If the lesson uses storyboard mode, regenerate continuous `full.mp3` tracks from the step MP3s.
6. Storyboard images must reuse the week 0 anchor characters.
   - Use the week 0 anchor refs:
   - `courses/endless-opportunities/week0-intro/storyboards/anchors/aj-anchor.png`
   - `courses/endless-opportunities/week0-intro/storyboards/anchors/nia-anchor.png`
   - `courses/endless-opportunities/week0-intro/storyboards/anchors/malik-anchor.png`
   - Generate PNG storyboards, not placeholder SVGs.
   - Use:
   - `npm run storyboards:lesson -- --lesson=<lesson-path>`
   - Then render the generated batch config in `tmp/storyboard-batches/<lesson>.json` with the portal batch image script so every frame keeps AJ/Nia/Malik continuity.
7. Keep the student-facing UI minimal:
   - storyboard stage
   - progress dots
   - one play button
   - activities
8. Remove:
   - voice dropdowns
   - mute/sound toggles
   - microphone labels/icons
   - decorative background music unless explicitly requested
   - spoken section titles
9. Rework activities so comprehension, application, and synthesis questions all match the updated narration.
10. Build with `npm run build`.

## Parallelization rules

When multiple agents split weeks:

- Every agent must read `EO_STORY_ARC.md` first.
- Week-specific rewrites should preserve the same character voices and progression.
- Do not invent new main characters.
- Do not reintroduce graph-first UX or extra playback chrome.
- If one week needs a new shared pattern, update shared files intentionally and tell the other agents.

## Deliverable expectations

- `story.json` rewritten to fit the arc
- narration regenerated with Sage and no title reads
- storyboard images generated from week 0 AJ/Nia/Malik anchors and wired cleanly
- page controls simplified to the week 0 pattern
- activities updated to reflect the actual story

## Verification

- Check the lesson locally on desktop and mobile width.
- Confirm narration starts from the top play button.
- Confirm the slide deck advances with the narration instead of racing ahead.
- Confirm no hidden fallback voice UI remains.
