import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lessonDir = path.join(rootDir, "courses", "endless-opportunities", "week0-intro");
const experimentId = "eo-course-promo-teaser-v2";
const outputDir = path.join(rootDir, "experiments", "sora", experimentId);
const refsDir = path.join(outputDir, "refs");
const voiceDir = path.join(outputDir, "voice");
const shotsDir = path.join(outputDir, "shots");
const audioDir = path.join(outputDir, "audio");
const finalDir = path.join(outputDir, "final");
const ffmpegBin = process.env.FFMPEG_BIN || "ffmpeg";
const ffprobeBin = process.env.FFPROBE_BIN || "ffprobe";

const sceneDefs = [
  {
    id: "scene-1",
    title: "Attention Grabber",
    seconds: 4,
    src: "storyboards/generated/problem-game-story-step-0.png",
    voiceover:
      "Three students saw the game hiding in plain sight.",
    prompt: [
      "Attention-grabbing opening shot for a vertical Endless Opportunities promo teaser.",
      "Use the reference image only as the visual anchor for AJ, Nia, and Malik and preserve their identity, age, wardrobe, facial traits, hair, and vibe.",
      "AJ is a smooth cool Black teenage boy and natural leader. Nia is a brilliant stylish Black teenage girl with precise judgment. Malik is a clever observant Black teenage boy with technical curiosity.",
      "Stylized animated film look, premium graphic-novel animation, polished 3D family-film aesthetic, richly illustrated textures, expressive animated faces, no photorealistic skin, not live action, not documentary realism.",
      "Vertical 9:16 composition designed for mobile, clear center framing, strong silhouette readability, no text, no subtitles, no logos, no watermarks.",
      "The trio stands in a charged city-school environment where everyday problems feel physically present around them: flickering storefronts, overloaded boards, stressed motion in the background, energy everywhere.",
      "Start with a dramatic push-in and animated cinematic urgency. AJ scans the scene like a strategist, Nia clocks the pattern with sharp focus, Malik notices the systems underneath the chaos.",
      "The feeling should be: this world is intense, full of pressure, and these three are about to read it differently than everyone else.",
      "Keep the image stylized and animated the whole time. Avoid realistic human-film skin rendering or uncanny live-action drift.",
    ].join(" "),
  },
  {
    id: "scene-2",
    title: "AI Changes The Path",
    seconds: 8,
    src: "storyboards/generated/ai-revolution-story-step-2.png",
    voiceover:
      "AJ, Nia, and Malik turned AI into leverage, and pressure into possibility.",
    prompt: [
      "Second promo shot for Endless Opportunities, directly continuing the same three recurring animated characters from the reference image.",
      "Preserve strict character continuity for AJ, Nia, and Malik: same clothing family, same facial structure, same hair, same age, same emotional chemistry.",
      "Stylized animated film look, premium illustrated animation, cinematic family-film energy, expressive surfaces, not photorealistic, not live action, no text, no user interface labels, no watermarks.",
      "Vertical 9:16 composition designed for mobile viewing with layered depth and strong central action.",
      "Set the trio inside a vivid problem-solving environment where AI feels like an invisible force multiplier rather than a gimmick: glowing screens, rapid idea testing, sketches, notes, and prototypes coming to life around them.",
      "AJ should look energized and ready to move. Nia should look intellectually locked in, recognizing the leverage immediately. Malik should look fascinated by the build process and toolchain opening up in front of him.",
      "Camera movement should feel confident and escalating, with a sense that the old limits are collapsing and a faster path is opening.",
      "The emotion is revelation, momentum, and the feeling that the future suddenly became reachable.",
      "Keep the visuals firmly animated and graphic-novel styled. Avoid realistic human-film rendering.",
    ].join(" "),
  },
  {
    id: "scene-3",
    title: "Go Deeper",
    seconds: 8,
    src: "storyboards/generated/six-levels-story-step-5.png",
    voiceover:
      "They went deeper, thought sharper, and started building what actually matters.",
    prompt: [
      "Third promo shot for Endless Opportunities featuring the exact same AJ, Nia, and Malik from the reference image, with strong continuity.",
      "Stylized animated feature-film look, premium graphic-novel animation, emotionally clear body language, no text, no subtitles, no logos, no overlays, not live action.",
      "Vertical 9:16 composition with dramatic depth and decisive central framing.",
      "Show the trio in the middle of a deep-thinking breakthrough: layered notes, branching diagrams, physical movement between ideas, clear collaboration, and a visible sense that they are cutting through surface-level noise.",
      "AJ should feel like the leader spotting the opening. Nia should feel like the one slicing through weak reasoning with confidence. Malik should feel like the builder seeing the practical toolchain and implementation path.",
      "The environment should imply real-world stakes: a struggling business, a community challenge, or a project that matters, without turning into generic corporate imagery.",
      "Use richer camera movement than a still tableau: arc around the trio, show one or two decisive gestures, make the moment feel like insight becoming action.",
      "The emotional target is intensity, intelligence, and the rush of finally finding the real problem underneath the obvious one.",
      "Keep the imagery fully animated and stylized. Avoid realistic human skin, live-action lighting behavior, or documentary texture.",
    ].join(" "),
  },
  {
    id: "scene-4",
    title: "Hero Wrap",
    seconds: 4,
    src: "storyboards/generated/six-levels-story-step-6.png",
    voiceover:
      "Endless Opportunities. Join the journey now.",
    prompt: [
      "Final hero shot for an Endless Opportunities promo teaser, using the reference image to preserve exact continuity for AJ, Nia, and Malik.",
      "Stylized animated hero shot with premium family-film finish, bold illustrated framing, no text, no subtitle cards, no logos, no watermarks, not live action.",
      "Vertical 9:16 mobile-first composition with bold central framing and clean top-to-bottom readability.",
      "The trio should feel transformed by the journey: composed, confident, and moving forward together with purpose.",
      "Use a clean, dramatic final composition with strong forward motion, noble posture, premium lighting, and a sense that a bigger future just opened in front of them.",
      "AJ should feel decisive, Nia should feel sharp and unstoppable, Malik should feel energized and ready to build.",
      "Make the final moment emotionally persuasive and trailer-ready, as if the audience is being invited into something powerful that they should not wait to join.",
      "Keep the result visibly animated and stylized to match the course art direction. Avoid realistic human-film drift.",
    ].join(" "),
  },
];

function parseArgs(argv) {
  const args = {
    model: "sora-2",
    size: "720x1280",
    concurrency: 4,
    voice: "sage",
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rest.join("=") || "true";

    if (key === "force") args.force = value === "true";
    if (key === "model") args.model = value;
    if (key === "size") args.size = value;
    if (key === "concurrency") args.concurrency = Number(value);
    if (key === "voice") args.voice = value;
  }

  return args;
}

function ensure(value, message) {
  if (!value) throw new Error(message);
  return value;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function resizeReferenceImage(inputPath, outputPath, size) {
  const [width, height] = size.split("x");
  await execFile(ffmpegBin, [
    "-y",
    "-i",
    inputPath,
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
    "-frames:v",
    "1",
    outputPath,
  ]);
}

async function uploadFile({ apiKey, filePath, mimeType }) {
  const form = new FormData();
  const buffer = await fs.readFile(filePath);
  const blob = new Blob([buffer], { type: mimeType });
  form.set("purpose", "user_data");
  form.set("file", blob, path.basename(filePath));

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`File upload failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function createVideoJob({ apiKey, model, prompt, size, seconds, inputReferencePath }) {
  const uploadedReference = await uploadFile({
    apiKey,
    filePath: inputReferencePath,
    mimeType: "image/png",
  });

  const response = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      seconds: String(seconds),
      input_reference: {
        file_id: uploadedReference.id,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Video create failed: ${response.status} ${await response.text()}`);
  }

  return {
    uploadedReference,
    video: await response.json(),
  };
}

async function retrieveVideoJob({ apiKey, videoId }) {
  const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Video retrieve failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function waitForCompletion({ apiKey, videoId, pollMs = 15000 }) {
  for (;;) {
    const video = await retrieveVideoJob({ apiKey, videoId });
    console.log(`[${videoId}] status=${video.status} progress=${video.progress ?? 0}`);

    if (video.status === "completed") return video;
    if (["failed", "expired", "cancelled"].includes(video.status)) {
      throw new Error(`Video job ${videoId} ended with status=${video.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function downloadVideo({ apiKey, videoId, outputPath }) {
  const response = await fetch(`https://api.openai.com/v1/videos/${videoId}/content?variant=video`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Video download failed: ${response.status} ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
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

async function probeDuration(filePath) {
  const { stdout } = await execFile(ffprobeBin, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return Number(stdout.trim());
}

function buildAtempoChain(ratio) {
  const factors = [];
  let remaining = ratio;

  while (remaining > 2) {
    factors.push(2);
    remaining /= 2;
  }

  while (remaining < 0.5) {
    factors.push(0.5);
    remaining /= 0.5;
  }

  factors.push(Number(remaining.toFixed(5)));
  return factors.map((factor) => `atempo=${factor}`).join(",");
}

async function fitAudioToDuration(inputPath, outputPath, targetSeconds) {
  const actualDuration = await probeDuration(inputPath);
  const filter =
    actualDuration <= targetSeconds
      ? `apad=pad_dur=${targetSeconds},atrim=0:${targetSeconds}`
      : `${buildAtempoChain(actualDuration / targetSeconds)},apad=pad_dur=${targetSeconds},atrim=0:${targetSeconds}`;

  await execFile(ffmpegBin, [
    "-y",
    "-i",
    inputPath,
    "-filter:a",
    filter,
    "-ar",
    "24000",
    outputPath,
  ]);

  return {
    actualDuration,
    targetSeconds,
  };
}

async function generateDetroitWestBeat(outputPath, totalSeconds) {
  const beatSeconds = Math.max(24, Math.ceil(totalSeconds));
  await execFile(ffmpegBin, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=if(lt(mod(t\\,0.5)\\,0.09)\\,0.95*sin(2*PI*48*t)*exp(-32*mod(t\\,0.5))\\,0)+if(lt(mod(t\\,1.0)\\,0.14)\\,0.38*sin(2*PI*96*t)*exp(-22*mod(t\\,1.0))\\,0):s=48000:d=${beatSeconds}`,
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=(0.28*sin(2*PI*(if(lt(mod(t\\,4)\\,1)\\,46\\,if(lt(mod(t\\,4)\\,2)\\,58\\,if(lt(mod(t\\,4)\\,3)\\,52\\,65))))*t))+(0.12*sin(2*PI*(if(lt(mod(t\\,4)\\,1)\\,23\\,if(lt(mod(t\\,4)\\,2)\\,29\\,if(lt(mod(t\\,4)\\,3)\\,26\\,32))))*t)):s=48000:d=${beatSeconds}`,
    "-f",
    "lavfi",
    "-i",
    `anoisesrc=color=white:amplitude=0.22:d=${beatSeconds}:r=48000`,
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=if(lt(mod(t+0.125\\,0.25)\\,0.018)\\,0.22*sin(2*PI*8200*t)*exp(-120*mod(t+0.125\\,0.25))\\,0)+if(between(mod(t\\,1.0)\\,0.5\\,0.53)\\,0.17*sin(2*PI*2200*t)*exp(-55*(mod(t\\,1.0)-0.5))\\,0):s=48000:d=${beatSeconds}`,
    "-filter_complex",
    [
      "[0:a]lowpass=f=150,acompressor=threshold=0.12:ratio=3.5:attack=5:release=80[kick]",
      "[1:a]lowpass=f=240,highpass=f=28,chorus=0.5:0.7:40:0.3:0.25:1.8,volume=1.1[bass]",
      "[2:a]highpass=f=6500,lowpass=f=11000,volume='if(lt(mod(t,0.25),0.02),0.22,0.035)',aecho=0.8:0.88:18:0.18[hats]",
      "[3:a]highpass=f=1400,lowpass=f=4200,volume=0.8[perc]",
      "[kick][bass][hats][perc]amix=inputs=4:normalize=0,alimiter=limit=0.9,loudnorm=I=-17:LRA=7:TP=-1.2[out]",
    ].join(";"),
    "-map",
    "[out]",
    "-t",
    String(beatSeconds),
    "-ar",
    "48000",
    outputPath,
  ]);
}

async function normalizeSceneVideo(inputPath, outputPath, durationSeconds, size) {
  await execFile(ffmpegBin, [
    "-y",
    "-i",
    inputPath,
    "-t",
    String(durationSeconds),
    "-vf",
    `fps=24,scale=${size.split("x")[0]}:${size.split("x")[1]}`,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

async function writeConcatFile(entries, outputPath) {
  const lines = entries.map((entry) => `file '${entry.replace(/'/g, "'\\''")}'`);
  await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function concatVideos(concatFilePath, outputPath) {
  await execFile(ffmpegBin, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFilePath,
    "-c",
    "copy",
    outputPath,
  ]);
}

async function concatAudios(concatFilePath, outputPath) {
  await execFile(ffmpegBin, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFilePath,
    "-c",
    "copy",
    outputPath,
  ]);
}

async function mixNarrationAndMusic({ narrationPath, musicPath, outputPath, totalSeconds }) {
  const fadeOutStart = Math.max(0, totalSeconds - 2.5);
  await execFile(ffmpegBin, [
    "-y",
    "-i",
    narrationPath,
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
    "-filter_complex",
    `[1:a]atrim=start=0:end=${totalSeconds},volume=0.20,afade=t=in:st=0:d=0.9,afade=t=out:st=${fadeOutStart}:d=2,aresample=24000[music];[music][0:a]sidechaincompress=threshold=0.018:ratio=20:attack=8:release=320[ducked];[ducked][0:a]amix=inputs=2:normalize=0,alimiter=limit=0.9[aout]`,
    "-map",
    "[aout]",
    "-t",
    String(totalSeconds),
    outputPath,
  ]);
}

async function muxVideoAndAudio(videoPath, audioPath, outputPath) {
  await execFile(ffmpegBin, [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]);
}

async function mapLimit(items, limit, iterator) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await iterator(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = ensure(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");

  await ensureDir(outputDir);
  await ensureDir(refsDir);
  await ensureDir(voiceDir);
  await ensureDir(shotsDir);
  await ensureDir(audioDir);
  await ensureDir(finalDir);

  const instructions =
    "Deliver this like a dramatic cinematic trailer narrator with warmth, control, and rising anticipation. Speak in a measured, deliberate pace with clean pauses between phrases. Sound persuasive and emotionally intelligent, but never rushed.";

  const scenePlan = [];

  for (const scene of sceneDefs) {
    const sourceImagePath = path.join(lessonDir, scene.src);
    const resizedReferencePath = path.join(refsDir, `${scene.id}-ref.png`);
    const voiceRawPath = path.join(voiceDir, `${scene.id}-raw.mp3`);
    const voiceFitPath = path.join(voiceDir, `${scene.id}.mp3`);
    const rawVideoPath = path.join(shotsDir, `${scene.id}-raw.mp4`);
    const normalizedVideoPath = path.join(shotsDir, `${scene.id}.mp4`);
    const metadataPath = path.join(shotsDir, `${scene.id}.json`);

    await resizeReferenceImage(sourceImagePath, resizedReferencePath, args.size);

    const speechBuffer = await createSpeech({
      apiKey,
      text: scene.voiceover,
      voice: args.voice,
      instructions,
    });
    await fs.writeFile(voiceRawPath, speechBuffer);
    const voiceFit = await fitAudioToDuration(voiceRawPath, voiceFitPath, scene.seconds);

    scenePlan.push({
      ...scene,
      sourceImagePath,
      resizedReferencePath,
      voiceRawPath,
      voiceFitPath,
      rawVideoPath,
      normalizedVideoPath,
      metadataPath,
      voiceFit,
    });
  }

  const renderedScenes = await mapLimit(scenePlan, args.concurrency, async (scene) => {
    if (!args.force && (await exists(scene.normalizedVideoPath)) && (await exists(scene.metadataPath))) {
      return readJson(scene.metadataPath);
    }

    console.log(`Creating ${scene.id}: ${scene.title}`);
    const { uploadedReference, video: job } = await createVideoJob({
      apiKey,
      model: args.model,
      prompt: scene.prompt,
      size: args.size,
      seconds: scene.seconds,
      inputReferencePath: scene.resizedReferencePath,
    });

    const completed = await waitForCompletion({
      apiKey,
      videoId: job.id,
      pollMs: 15000,
    });

    await downloadVideo({
      apiKey,
      videoId: completed.id,
      outputPath: scene.rawVideoPath,
    });

    await normalizeSceneVideo(scene.rawVideoPath, scene.normalizedVideoPath, scene.seconds, args.size);

    const metadata = {
      id: scene.id,
      title: scene.title,
      seconds: scene.seconds,
      voiceover: scene.voiceover,
      prompt: scene.prompt,
      model: completed.model || args.model,
      size: completed.size || args.size,
      referenceFileId: uploadedReference.id,
      videoId: completed.id,
      sourceImage: path.relative(outputDir, scene.sourceImagePath),
      resizedReference: path.relative(outputDir, scene.resizedReferencePath),
      voiceRaw: path.relative(outputDir, scene.voiceRawPath),
      voiceFinal: path.relative(outputDir, scene.voiceFitPath),
      rawVideo: path.relative(outputDir, scene.rawVideoPath),
      normalizedVideo: path.relative(outputDir, scene.normalizedVideoPath),
      voiceFit: scene.voiceFit,
    };

    await writeJson(scene.metadataPath, metadata);
    return metadata;
  });

  const voiceConcatPath = path.join(audioDir, "voice-scenes.txt");
  const videoConcatPath = path.join(finalDir, "video-scenes.txt");
  const narrationPath = path.join(audioDir, "narration.mp3");
  const mixedAudioPath = path.join(audioDir, "final-audio.wav");
  const generatedMusicPath = path.join(audioDir, "detroit-west-promo-bed.mp3");
  const videoOnlyPath = path.join(finalDir, `${experimentId}-video.mp4`);
  const finalVideoPath = path.join(finalDir, `${experimentId}.mp4`);
  const totalSeconds = sceneDefs.reduce((sum, scene) => sum + scene.seconds, 0);

  await generateDetroitWestBeat(generatedMusicPath, totalSeconds);

  await writeConcatFile(
    scenePlan.map((scene) => path.relative(audioDir, scene.voiceFitPath)),
    voiceConcatPath
  );
  await concatAudios(voiceConcatPath, narrationPath);

  await mixNarrationAndMusic({
    narrationPath,
    musicPath: generatedMusicPath,
    outputPath: mixedAudioPath,
    totalSeconds,
  });

  await writeConcatFile(
    scenePlan.map((scene) => path.relative(finalDir, scene.normalizedVideoPath)),
    videoConcatPath
  );
  await concatVideos(videoConcatPath, videoOnlyPath);
  await muxVideoAndAudio(videoOnlyPath, mixedAudioPath, finalVideoPath);

  await writeJson(path.join(outputDir, "manifest.json"), {
    experiment: experimentId,
    generatedAt: new Date().toISOString(),
    totalSeconds,
    voice: args.voice,
    model: args.model,
    size: args.size,
    sourceMusic: path.relative(outputDir, generatedMusicPath),
    finalAudio: path.relative(outputDir, mixedAudioPath),
    finalVideo: path.relative(outputDir, finalVideoPath),
    scenes: renderedScenes,
  });

  console.log(`Wrote ${finalVideoPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
