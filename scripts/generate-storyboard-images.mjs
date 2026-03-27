import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const courseRoot = path.join(repoRoot, 'courses', 'endless-opportunities');
const tmpRoot = path.join(repoRoot, 'tmp', 'storyboard-batches');

const storyboardStyle =
  'High-fidelity animated graphic-novel storybook illustration, premium family-film look, bright cinematic lighting, emotionally specific facial acting, strong continuity with the anchor characters, dynamic but readable action, no text, no words, no letters, landscape composition.';

const recurringCharacters =
  'AJ is a smooth cool Black teenage boy and natural leader. Nia is a brilliant stylish Black teenage girl with precise judgment. Malik is a clever observant Black teenage boy with technical curiosity.';

const anchorReferences = [
  path.join(courseRoot, 'week0-intro', 'storyboards', 'anchors', 'aj-anchor.png'),
  path.join(courseRoot, 'week0-intro', 'storyboards', 'anchors', 'nia-anchor.png'),
  path.join(courseRoot, 'week0-intro', 'storyboards', 'anchors', 'malik-anchor.png'),
];

function parseArgs(argv) {
  const args = {lessons: []};
  for (const arg of argv) {
    if (arg === '--all') {
      args.all = true;
      continue;
    }
    if (arg.startsWith('--lesson=')) {
      args.lessons.push(arg.slice('--lesson='.length));
      continue;
    }
  }
  return args;
}

function normalizeLesson(lesson) {
  return lesson
    .replace(/^\/+/, '')
    .replace(/^courses\/endless-opportunities\//, '')
    .replace(/\/+$/, '');
}

function buildPrompt(weekSlug, storyTitle, stepTitle, narration, stepIndex, totalSteps) {
  return [
    `Sequential narrated story frame for ${weekSlug.replace(/-/g, ' ')} of Endless Opportunities.`,
    `Recurring characters: ${recurringCharacters}`,
    `Story context: ${storyTitle}.`,
    `Frame ${stepIndex + 1} of ${totalSteps}.`,
    `Current beat: ${narration}`,
    `Visual emphasis: ${stepTitle}.`,
    'Keep AJ, Nia, and Malik visually consistent with the anchor references, including wardrobe, facial traits, hair, age, and overall vibe.',
    'Show the specific place, tools, emotional reaction, and plot movement happening in this beat so the image clearly advances the story.',
    storyboardStyle,
  ].join(' ');
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, {recursive: true});
}

async function generateLessonConfig(lesson) {
  const lessonSlug = normalizeLesson(lesson);
  const lessonDir = path.join(courseRoot, lessonSlug);
  const storyPath = path.join(lessonDir, 'story.json');
  const story = await loadJson(storyPath);

  const images = [];
  const runtimeManifest = {};

  for (const storyEntry of story.stories || []) {
    runtimeManifest[storyEntry.id] = [];
    const totalSteps = (storyEntry.steps || []).length;

    (storyEntry.steps || []).forEach((step, stepIndex) => {
      const filename = `${storyEntry.id}-step-${stepIndex}.png`;
      const relativeSrc = `storyboards/generated/${filename}`;
      const output = path.join(lessonDir, relativeSrc);

      images.push({
        prompt: buildPrompt(lessonSlug, storyEntry.title, step.title, step.narration, stepIndex, totalSteps),
        output,
        references: anchorReferences,
        size: '1536x1024',
        quality: 'high',
        fidelity: 'high',
      });

      runtimeManifest[storyEntry.id].push({
        src: relativeSrc,
        alt: `${step.title}. ${step.narration}`,
        title: step.title,
        caption: step.narration.split('. ')[0]?.trim() || step.narration,
      });
    });
  }

  await ensureDir(path.join(lessonDir, 'storyboards', 'generated'));
  await ensureDir(tmpRoot);

  const batchConfigPath = path.join(tmpRoot, `${lessonSlug}.json`);
  const batchConfig = {
    concurrency: 4,
    max_retries: 2,
    images,
  };

  await fs.writeFile(batchConfigPath, `${JSON.stringify(batchConfig, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(lessonDir, 'storyboards.json'), `${JSON.stringify(runtimeManifest, null, 2)}\n`, 'utf8');

  return {lessonSlug, batchConfigPath, imageCount: images.length};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lessons = args.all
    ? ['week1-questions', 'week2-data', 'week3-building', 'week4-portfolio']
    : args.lessons;

  if (!lessons.length) {
    throw new Error('Pass --lesson=<slug> or --all.');
  }

  for (const lesson of lessons) {
    const result = await generateLessonConfig(lesson);
    console.log(`${result.lessonSlug}: ${result.imageCount} frames -> ${result.batchConfigPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
