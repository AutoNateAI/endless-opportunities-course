# Week 0 Story 1 Sora Experiment

This folder holds an isolated video experiment for `week0-intro` story 1 (`problem-game-story`).

Scope:

- No lesson UI changes
- Original narration preserved from `courses/endless-opportunities/week0-intro/audio/sage/problem-game-story`
- One Sora-generated shot per story step
- Final stitched MP4 saved locally in `final/`

Primary outputs:

- `manifest.json`: run metadata and per-shot prompts
- `refs/`: resized reference frames used as Sora input images
- `shots/`: raw, timed, and muxed per-step clips
- `final/week0-story1-sora-experiment.mp4`: stitched review asset

Regenerate with:

```bash
node scripts/generate-sora-week0-story1.mjs
```
