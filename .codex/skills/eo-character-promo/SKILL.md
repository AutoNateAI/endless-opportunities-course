---
name: eo-character-promo
description: Build short promotional videos for narrated course projects using existing character slide art as references, OpenAI expressive voiceover, Sora scene generation, ffmpeg music/assembly, and isolated experiment folders. Use when a user wants a vertical or horizontal promo teaser for a course without changing the live lesson pages.
---

# EO Character Promo

Use this skill when the goal is to turn narrated course characters and slide art into a short promo teaser.

## Workflow

1. Keep the promo isolated.
   Save all promo work into `experiments/` and do not replace live lesson or site assets unless the user explicitly asks.

2. Find the character anchors first.
   Use the course `story.json`, `storyboards.json`, and generated storyboard images as the visual source of truth for recurring characters and scene continuity.

3. Use fixed scene timing.
   Default to short teaser structures such as `4/8/8/4` when the user wants a high-energy promo.
   Build the voiceover and scene generation around those timings instead of hoping timing works out afterward.

4. Keep the visuals stylized.
   When generating promo scenes, explicitly instruct Sora to stay in a premium animated / graphic-novel / family-film look.
   State clearly: not live action, not photorealistic, no realistic human-film drift.

5. Slow the narration by writing tighter copy.
   Do not cram long lecture sentences into short promo scenes.
   Write shorter trailer lines and keep the TTS instructions measured and deliberate.
   Only time-stretch narration when it exceeds the scene duration; otherwise preserve the natural read and pad with silence if needed.

6. Build or reuse music deliberately.
   Prefer procedural ffmpeg-generated beds when the user wants a specific style or when you need something reusable without licensing friction.
   Keep bass-forward beds under the narration with ducking.

7. Render scenes in parallel.
   If the shots are independent and already have reference images, submit them in bounded parallelism.

8. Verify the final artifact.
   Use `ffprobe` on the final MP4 and confirm duration, resolution, and audio stream before pushing.

## Files In This Workspace

- Promo generator example:
  `scripts/generate-eo-course-promo-teaser.mjs`
- Existing EO experiments:
  `experiments/sora/`

## Prompt Rules

- Always specify whether the promo is `9:16` or `16:9`.
- Reassert exact character continuity in every scene prompt.
- State the style twice if necessary: animated, stylized, premium illustrated, not photorealistic.
- Ban text, logos, watermarks, subtitles, and UI labels unless the user explicitly wants them.
- Make the camera direction explicit: push-in, arc, hero lock-off, handheld energy, etc.

## Output Rule

The final deliverable should include:

- experiment README
- scene prompts in metadata
- source refs
- voice stems
- music bed
- final mixed audio
- final MP4

Push only the experiment assets and scripts you added. Ignore unrelated repo changes.
