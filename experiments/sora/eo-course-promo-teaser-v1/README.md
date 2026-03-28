# EO Course Promo Teaser V1

This experiment creates a short dramatic promo for Endless Opportunities without changing the live course experience.

Concept:

- Use Week 0 story art as visual reference for AJ, Nia, and Malik.
- Build a 24-second teaser in four scenes: `4s / 8s / 8s / 4s`.
- Use expressive OpenAI narration with a dramatic trailer-style read.
- Reuse the procedural `autonateai-portal-bed.mp3` music bed pattern from the Remotion workflow as background music.
- Save all prompts, references, generated shots, narration, and final output inside this folder.

Outputs:

- `manifest.json`: scene metadata, prompts, source references, and final artifact paths
- `refs/`: resized EO still images used as Sora input references
- `voice/`: raw and duration-fit voiceover clips
- `shots/`: raw and normalized scene renders plus per-scene metadata
- `audio/`: narration stem, reused music bed copy, and final mixed audio
- `final/eo-course-promo-teaser-v1.mp4`: final stitched promo video

Generation:

```bash
node scripts/generate-eo-course-promo-teaser.mjs
```

Notes:

- The current Sora API accepts `4`, `8`, or `12` second scene lengths, so this teaser is intentionally built around `4/8/8/4`.
- The promo is stored only as an experiment asset and does not replace the existing EO promo.
