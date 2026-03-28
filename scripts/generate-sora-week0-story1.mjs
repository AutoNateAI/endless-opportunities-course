import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lessonDir = path.join(rootDir, "courses", "endless-opportunities", "week0-intro");
const storyId = "problem-game-story";
const outputDir = path.join(rootDir, "experiments", "sora", "week0-story1");
const refsDir = path.join(outputDir, "refs");
const shotsDir = path.join(outputDir, "shots");
const audioDir = path.join(outputDir, "audio");
const finalDir = path.join(outputDir, "final");
const ffmpegBin = process.env.FFMPEG_BIN || "ffmpeg";

function parseArgs(argv) {
  const args = {
    model: "sora-2",
    size: "1280x720",
    maxSeconds: 20,
    pollMs: 15000,
    concurrency: 3,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rest.join("=") || "true";

    if (key === "force") args.force = value === "true";
    if (key === "model") args.model = value;
    if (key === "size") args.size = value;
    if (key === "max-seconds") args.maxSeconds = Number(value);
    if (key === "poll-ms") args.pollMs = Number(value);
    if (key === "concurrency") args.concurrency = Number(value);
  }

  return args;
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
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

function buildShotPrompt(step, stepIndex, totalSteps) {
  return [
    "Cinematic coming-of-age educational short film.",
    "Three recurring Black teenage characters: AJ, Nia, and Malik.",
    "Keep all three characters consistent with the opening frame reference image in clothing, age, facial features, hairstyle, and overall vibe.",
    "Naturalistic acting, expressive faces, grounded body language, premium live-action look, no captions, no text, no logos, no watermarks.",
    `Story beat ${stepIndex + 1} of ${totalSteps}: ${step.title}.`,
    `Narrative context: ${step.narration}`,
    "Show the characters physically acting out the idea in a clear, visually readable way for an educational story sequence.",
    "Maintain coherent geography and believable motion. Avoid surreal transformations or extra characters dominating the frame.",
  ].join(" ");
}

function chooseShotSeconds(audioSeconds) {
  if (audioSeconds <= 4) return 4;
  if (audioSeconds <= 8) return 8;
  return 12;
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Video retrieve failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function downloadVideo({ apiKey, videoId, outputPath }) {
  const response = await fetch(`https://api.openai.com/v1/videos/${videoId}/content?variant=video`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Video download failed: ${response.status} ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function waitForCompletion({ apiKey, videoId, pollMs }) {
  for (;;) {
    const video = await retrieveVideoJob({ apiKey, videoId });
    const progress = video.progress ?? 0;
    console.log(`[${videoId}] status=${video.status} progress=${progress}`);

    if (video.status === "completed") {
      return video;
    }

    if (video.status === "failed" || video.status === "expired" || video.status === "cancelled") {
      throw new Error(`Video job ${videoId} ended with status=${video.status}: ${JSON.stringify(video.error || {})}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function writeConcatFile(entries, outputPath) {
  const lines = entries.map((entry) => `file '${entry.replace(/'/g, "'\\''")}'`);
  await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function extendVideoToDuration(inputVideoPath, outputVideoPath, targetSeconds) {
  await execFile(ffmpegBin, [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    inputVideoPath,
    "-t",
    String(targetSeconds),
    "-an",
    "-vf",
    "fps=24,format=yuv420p",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputVideoPath,
  ]);
}

async function muxVideoAndAudio(videoPath, audioPath, durationSeconds, outputPath) {
  await execFile(ffmpegBin, [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-t",
    String(durationSeconds),
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]);
}

async function concatSegments(concatFilePath, outputPath) {
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

async function mapLimit(items, limit, iterator) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await iterator(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = ensure(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");

  await ensureDir(outputDir);
  await ensureDir(refsDir);
  await ensureDir(shotsDir);
  await ensureDir(audioDir);
  await ensureDir(finalDir);

  const storyPath = path.join(lessonDir, "story.json");
  const storyboardPath = path.join(lessonDir, "storyboards.json");
  const audioManifestPath = path.join(lessonDir, "audio", "manifest.json");

  const [storyData, storyboardData, audioManifest] = await Promise.all([
    readJson(storyPath),
    readJson(storyboardPath),
    readJson(audioManifestPath),
  ]);

  const story = ensure(
    (storyData.stories || []).find((entry) => entry.id === storyId),
    `Story ${storyId} not found in ${storyPath}`
  );

  const storyboardEntries = ensure(storyboardData[storyId], `No storyboard entries found for ${storyId}`);
  const audioEntries = ensure(audioManifest?.sage?.[storyId], `No sage audio entries found for ${storyId}`);

  const shotInputs = [];

  for (const [index, step] of story.steps.entries()) {
    const storyboardEntry = storyboardEntries[index];
    const audioEntry = audioEntries[index];
    const stepId = `step-${index}`;
    const sourceImagePath = path.join(lessonDir, storyboardEntry.src);
    const sourceAudioPath = path.join(lessonDir, "audio", "sage", storyId, `${stepId}.mp3`);
    const resizedReferencePath = path.join(refsDir, `${stepId}-ref.png`);
    const rawVideoPath = path.join(shotsDir, `${stepId}-raw.mp4`);
    const timedVideoPath = path.join(shotsDir, `${stepId}-timed.mp4`);
    const muxedSegmentPath = path.join(shotsDir, `${stepId}-segment.mp4`);
    const copiedAudioPath = path.join(audioDir, `${stepId}.mp3`);
    const prompt = buildShotPrompt(step, index, story.steps.length);
    const audioSeconds = Number(audioEntry.duration?.toFixed?.(3) || audioEntry.duration || 0);
    const requestedSeconds = Math.min(args.maxSeconds, chooseShotSeconds(audioSeconds));

    await resizeReferenceImage(sourceImagePath, resizedReferencePath, args.size);
    await fs.copyFile(sourceAudioPath, copiedAudioPath);

    let metadata = {
      stepId,
      title: step.title,
      prompt,
      requestedSeconds,
      audioSeconds,
      sourceImage: path.relative(outputDir, sourceImagePath),
      resizedReference: path.relative(outputDir, resizedReferencePath),
      rawVideo: path.relative(outputDir, rawVideoPath),
      timedVideo: path.relative(outputDir, timedVideoPath),
      segmentVideo: path.relative(outputDir, muxedSegmentPath),
      sourceAudio: path.relative(outputDir, copiedAudioPath),
    };

    const metadataPath = path.join(shotsDir, `${stepId}.json`);

    shotInputs.push({
      stepId,
      title: step.title,
      prompt,
      requestedSeconds,
      audioSeconds,
      resizedReferencePath,
      rawVideoPath,
      timedVideoPath,
      muxedSegmentPath,
      copiedAudioPath,
      metadataPath,
      metadata,
    });
  }

  const shots = await mapLimit(shotInputs, args.concurrency, async (shot) => {
    if (!args.force && (await exists(shot.rawVideoPath)) && (await exists(shot.muxedSegmentPath))) {
      console.log(`Skipping existing ${shot.stepId}`);
      return readJson(shot.metadataPath);
    }

    console.log(`Creating video for ${shot.stepId}: ${shot.title}`);
    const { video: job, uploadedReference } = await createVideoJob({
      apiKey,
      model: args.model,
      prompt: shot.prompt,
      size: args.size,
      seconds: shot.requestedSeconds,
      inputReferencePath: shot.resizedReferencePath,
    });

    const completed = await waitForCompletion({
      apiKey,
      videoId: job.id,
      pollMs: args.pollMs,
    });

    await downloadVideo({
      apiKey,
      videoId: completed.id,
      outputPath: shot.rawVideoPath,
    });

    await extendVideoToDuration(shot.rawVideoPath, shot.timedVideoPath, shot.audioSeconds);
    await muxVideoAndAudio(shot.timedVideoPath, shot.copiedAudioPath, shot.audioSeconds, shot.muxedSegmentPath);

    const metadata = {
      ...shot.metadata,
      referenceFileId: uploadedReference.id,
      videoId: completed.id,
      model: completed.model || args.model,
      size: completed.size || args.size,
      status: completed.status,
      progress: completed.progress ?? 100,
      createdAt: completed.created_at ?? null,
    };

    await fs.writeFile(shot.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    return metadata;
  });

  const concatFilePath = path.join(finalDir, "segments.txt");
  const stitchedVideoPath = path.join(finalDir, "week0-story1-sora-experiment.mp4");
  const relativeSegments = shots.map((shot) => path.relative(finalDir, path.join(outputDir, shot.segmentVideo)));

  await writeConcatFile(relativeSegments, concatFilePath);
  await concatSegments(concatFilePath, stitchedVideoPath);

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        storyId,
        lesson: "week0-intro",
        model: args.model,
        size: args.size,
        generatedAt: new Date().toISOString(),
        finalVideo: path.relative(outputDir, stitchedVideoPath),
        shots,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Wrote ${stitchedVideoPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
