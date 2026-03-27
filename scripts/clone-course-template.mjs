import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const coursesRoot = path.join(repoRoot, 'courses');
const courseAssetsRoot = path.join(coursesRoot, 'assets', 'courses');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith('--source-course=')) args.sourceCourse = arg.slice('--source-course='.length);
    if (arg.startsWith('--target-course=')) args.targetCourse = arg.slice('--target-course='.length);
    if (arg.startsWith('--target-title=')) args.targetTitle = arg.slice('--target-title='.length);
  }
  return args;
}

function validateSlug(slug, label) {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`${label} must be lowercase letters, digits, or hyphens.`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(sourceDir, targetDir) {
  await fs.mkdir(targetDir, {recursive: true});
  const entries = await fs.readdir(sourceDir, {withFileTypes: true});
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function rewriteStoryJsons(dirPath, sourceCourse, targetCourse, targetTitle) {
  const entries = await fs.readdir(dirPath, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await rewriteStoryJsons(fullPath, sourceCourse, targetCourse, targetTitle);
      continue;
    }
    if (entry.isFile() && entry.name === 'story.json') {
      const story = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      story.courseId = targetCourse;
      if (targetTitle && story.pageId === 'week0-intro' && story.chapterMeta?.title) {
        story.chapterMeta.title = story.chapterMeta.title;
      }
      await fs.writeFile(fullPath, `${JSON.stringify(story, null, 2)}\n`, 'utf8');
      continue;
    }
    if (entry.isFile() && /\.html$/i.test(entry.name)) {
      const html = await fs.readFile(fullPath, 'utf8');
      const rewritten = html.replaceAll(`/courses/${sourceCourse}/`, `/courses/${targetCourse}/`);
      if (rewritten !== html) {
        await fs.writeFile(fullPath, rewritten, 'utf8');
      }
    }
  }
}

async function copyCourseCard(sourceCourse, targetCourse) {
  const sourceImage = path.join(courseAssetsRoot, `course-${sourceCourse}.png`);
  const targetImage = path.join(courseAssetsRoot, `course-${targetCourse}.png`);
  if (await fileExists(sourceImage)) {
    await fs.copyFile(sourceImage, targetImage);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateSlug(args.sourceCourse, 'source-course');
  validateSlug(args.targetCourse, 'target-course');

  const sourceDir = path.join(coursesRoot, args.sourceCourse);
  const targetDir = path.join(coursesRoot, args.targetCourse);

  if (!(await fileExists(sourceDir))) {
    throw new Error(`Source course not found: ${sourceDir}`);
  }
  if (await fileExists(targetDir)) {
    throw new Error(`Target course already exists: ${targetDir}`);
  }

  await copyDir(sourceDir, targetDir);
  await rewriteStoryJsons(targetDir, args.sourceCourse, args.targetCourse, args.targetTitle);
  await copyCourseCard(args.sourceCourse, args.targetCourse);

  console.log(`Cloned ${args.sourceCourse} -> ${args.targetCourse}`);
  console.log(`Course directory: ${targetDir}`);
  console.log(`Next step: rewrite the week story/content from the client brief, then regenerate audio and storyboards.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
