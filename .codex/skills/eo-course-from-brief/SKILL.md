---
name: eo-course-from-brief
description: Use when creating a new premium narrated course from scratch for a client by cloning the EO baseline and rewriting it from a story brief, learning goals, voice choice, character arc, storyboard plan, and activity design.
---

# EO Course From Brief

Use this skill when the user wants a brand-new client course that should feel like the EO premium format but use different context, plot, skills, and activities.

## Read first

1. Read the user brief carefully.
2. Read [`/home/nate/autonateai-workspace/eo-course/.codex/skills/eo-course-from-brief/references/course-brief-template.md`](/home/nate/autonateai-workspace/eo-course/.codex/skills/eo-course-from-brief/references/course-brief-template.md) if the brief is incomplete.
3. Inspect the baseline course at [`/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities`](/home/nate/autonateai-workspace/eo-course/courses/endless-opportunities).
4. Use week 0 as the visual and UX reference for storyboard-first playback.

## What this skill is for

- cloning the EO baseline into a new course slug
- rewriting the course around a new client story and learning journey
- choosing or changing the narrator voice
- regenerating narration, storyboard images, and activity sets
- keeping the final result premium, mobile-safe, and production-ready

## Required workflow

1. Turn the user brief into a concrete course plan.
   - audience
   - promise
   - number of weeks or modules
   - named characters if any
   - voice choice
   - learning goals
   - required activities and mental models
2. Clone the baseline course shell.
   - Use:
   - `npm run course:clone -- --source-course=endless-opportunities --target-course=<new-course-slug>`
3. Scaffold the structured brief package.
   - Use:
   - `npm run course:brief -- --course=<new-course-slug> --title='<Course Title>' --client='<Client Name>' --voice=<voice> --weeks=5`
   - Fill in:
   - `briefs/<new-course-slug>/course-brief.json`
   - `briefs/<new-course-slug>/week-outline.json`
   - `briefs/<new-course-slug>/activity-map.json`
4. Rewrite each week from the brief.
   - update `story.json`
   - update `index.html`
   - align the questions and answers to the narrated story
5. Keep the premium playback pattern.
   - storyboard-first
   - one top play button
   - progress dots
   - no voice dropdowns or extra playback clutter unless explicitly requested
6. Regenerate narration for each lesson.
   - Use:
   - `npm run audio:lesson -- --lesson=<lesson-path> --voice=<voice> --label='<voice label>' --default=true --clean=true --omit-titles=true`
7. If the course uses recurring characters, create anchor portraits first, then generate storyboards from those anchors.
   - use the same reference-image pattern as EO week 0
   - generate PNG frames, not placeholder SVGs
8. Rebuild or replace activities so they teach the actual mental model from the brief.
   - comprehension
   - application
   - synthesis or transfer
9. Build with `npm run build`.

## Design rules

- Story first, not graph clutter.
- Narration should flow naturally and should not read section titles unless explicitly requested.
- Questions must match what the student just saw and heard.
- If the user names a voice, use it. If not, recommend one and keep it consistent.
- If the user wants characters, keep them visually consistent with anchor references across the whole course.
- If a lesson needs premium image generation, use reference-based prompts rather than generic placeholders.

## Deliverables

- new course directory under `courses/<slug>`
- structured brief package under `briefs/<slug>`
- rewritten weekly stories and activities
- regenerated narration
- storyboard manifests and images
- build-ready course output

## Verification

- run the course locally
- confirm narration plays from the top play button
- confirm slides advance with narration
- confirm activities submit and match the story
- confirm mobile presentation is clean
