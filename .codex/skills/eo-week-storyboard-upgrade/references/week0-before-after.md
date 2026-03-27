# Week 0 Before / After

Use this as the concrete example of how EO lessons should be transformed.

## Before

Week 0 originally followed the old lesson pattern:

- graph-first presentation
- visible graph canvas under the header
- extra settings controls
- voice dropdown
- mute / sound toggle
- narration could read section titles
- weaker mobile framing for storyboard images
- story and questions were less tightly aligned

The older progression can be traced through these commits:

- `847dfc4` initial extracted course baseline
- `17c2f95` AJ / Nia / Malik plot introduced

## After

Week 0 is now the template:

- storyboard-first presentation
- top toolbar with only play plus slide dots
- Sage forced as the narrator
- narration goes straight into context instead of reading titles
- no student-facing voice chooser or mute controls
- no background music
- mobile media presentation aligned more closely to the workshop portal
- three activity sets updated to match the actual story beats

Relevant commits:

- `b686c6e` storyboard visuals added
- `11f6bf6` storyboard-first lesson mode introduced
- `8fea86e` narration regenerated without section titles
- `0565023` extra controls removed, mobile cleaned up
- `244832b` media presentation simplified

## Files that define the target state

- [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/index.html`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/index.html)
- [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/story.json`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/story.json)
- [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/audio/manifest.json`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/audio/manifest.json)
- [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/storyboards.json`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities/week0-intro/storyboards.json)
- [`/home/nate/autonateai-workspace/eo-course/courses/shared/css/lesson-interactive.css`](/home/nate/autonateai-workspace/eo-course/courses/shared/css/lesson-interactive.css)
- [`/home/nate/autonateai-workspace/eo-course/courses/shared/js/interactive/storytelling-diagram.js`](/home/nate/autonateai-workspace/eo-course/courses/shared/js/interactive/storytelling-diagram.js)
- [`/home/nate/autonateai-workspace/eo-course/scripts/generate-lesson-audio.mjs`](/home/nate/autonateai-workspace/eo-course/scripts/generate-lesson-audio.mjs)

## Transformation checklist

1. Keep the educational concept, but rewrite the page around AJ, Nia, and Malik.
2. Move the lesson to storyboard-first consumption.
3. Hard-force Sage unless there is a real reason not to.
4. Regenerate audio with `--omit-titles=true`.
5. Remove user-facing audio configuration controls.
6. Keep the page clean: storyboard, dots, play button, activities.
7. Update questions so they measure the story that is actually on the page.
