import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    args[key] = rest.join("=") || "true";
  }
  return args;
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function buildStepText(step, { omitTitles = false } = {}) {
  const parts = omitTitles ? [step.narration] : [step.title, step.narration];
  return parts.filter(Boolean).join(". ").replace(/\s+/g, " ").trim();
}

async function createSpeech({ apiKey, text, voice, instructions }) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      response_format: "mp3",
      input: text,
      instructions,
    }),
  });

  if (!response.ok) {
    throw new Error(`Speech generation failed: ${response.status} ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function transcribeSpeech({ apiKey, audioBuffer, filename }) {
  const form = new FormData();
  form.set("model", "whisper-1");
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.set("file", new Blob([audioBuffer], { type: "audio/mpeg" }), filename);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lessonPath = ensure(args.lesson, "Missing --lesson=<relative lesson path>");
  const voice = args.voice || "sage";
  const voiceLabel = args.label || "Captivating Storyteller";
  const setDefault = args.default === "true";
  const clean = args.clean === "true";
  const omitTitles = args["omit-titles"] === "true";
  const instructions =
    args.instructions ||
    "Speak like an authentic, well-educated, captivating storyteller with warm authority, emotional intelligence, and clear explanation. Sound grounded, articulate, and compelling. Do not sound robotic. Make each lesson feel alive and easy to follow.";

  const apiKey = ensure(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  const lessonDir = path.resolve(rootDir, lessonPath);
  const storyJsonPath = path.join(lessonDir, "story.json");
  const audioDir = path.join(lessonDir, "audio");
  const manifestPath = path.join(audioDir, "manifest.json");

  const pageData = JSON.parse(await readFile(storyJsonPath, "utf8"));
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = {};
  }

  manifest.voices = manifest.voices || {};
  manifest.voices[voice] = {
    name: voice,
    label: voiceLabel,
  };
  manifest.stories = pageData.stories.map((story) => story.id);
  if (setDefault || !manifest.defaultVoice) {
    manifest.defaultVoice = voice;
  }

  const voiceDir = path.join(audioDir, voice);
  if (clean) {
    await rm(voiceDir, { recursive: true, force: true });
  }
  await mkdir(voiceDir, { recursive: true });

  const voiceManifest = {};

  for (const story of pageData.stories) {
    const storyDir = path.join(voiceDir, story.id);
    await mkdir(storyDir, { recursive: true });

    voiceManifest[story.id] = [];

    for (const [index, step] of story.steps.entries()) {
      const text = buildStepText(step, { omitTitles });
      const stepId = `step-${index}`;
      const mp3Buffer = await createSpeech({
        apiKey,
        text,
        voice,
        instructions,
      });
      const transcript = await transcribeSpeech({
        apiKey,
        audioBuffer: mp3Buffer,
        filename: `${stepId}.mp3`,
      });

      const stepData = {
        storyId: story.id,
        stepId,
        voice,
        voiceLabel,
        text,
        duration: transcript.duration,
        words: transcript.words || [],
      };

      await writeFile(path.join(storyDir, `${stepId}.mp3`), mp3Buffer);
      await writeFile(path.join(storyDir, `${stepId}.json`), `${JSON.stringify(stepData, null, 2)}\n`, "utf8");
      voiceManifest[story.id].push(stepData);

      console.log(`generated ${voice}/${story.id}/${stepId}`);
    }
  }

  manifest[voice] = voiceManifest;
  manifest.generatedAt = new Date().toISOString();

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`updated manifest ${manifestPath}`);
}

await main();
