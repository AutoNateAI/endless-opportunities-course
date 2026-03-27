import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const briefsRoot = path.join(repoRoot, 'briefs');

function parseArgs(argv) {
  const args = {weeks: 5};
  for (const arg of argv) {
    if (arg.startsWith('--course=')) args.course = arg.slice('--course='.length);
    if (arg.startsWith('--title=')) args.title = arg.slice('--title='.length);
    if (arg.startsWith('--client=')) args.client = arg.slice('--client='.length);
    if (arg.startsWith('--voice=')) args.voice = arg.slice('--voice='.length);
    if (arg.startsWith('--weeks=')) args.weeks = Number(arg.slice('--weeks='.length));
  }
  return args;
}

function validateSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug || '');
}

function buildWeekEntries(weeks) {
  return Array.from({length: weeks}, (_, index) => {
    const weekNumber = index;
    return {
      week: weekNumber,
      slug: `week${weekNumber}-${weekNumber === 0 ? 'intro' : 'module'}`,
      title: '',
      narrativePurpose: '',
      mentalModels: [],
      learnerOutcome: '',
      storyBeats: [],
      activities: [
        {
          type: 'comprehension',
          goal: '',
          prompts: [],
        },
        {
          type: 'application',
          goal: '',
          prompts: [],
        },
        {
          type: 'synthesis',
          goal: '',
          prompts: [],
        },
      ],
    };
  });
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, {recursive: true});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!validateSlug(args.course)) {
    throw new Error('Pass --course=<slug> using lowercase letters, digits, or hyphens.');
  }
  if (!args.title) {
    throw new Error('Pass --title="<Course Title>".');
  }
  if (!Number.isInteger(args.weeks) || args.weeks < 1 || args.weeks > 12) {
    throw new Error('Pass --weeks=<1-12>.');
  }

  const courseDir = path.join(briefsRoot, args.course);
  await ensureDir(courseDir);

  const courseBrief = {
    client: args.client || '',
    courseSlug: args.course,
    courseTitle: args.title,
    audience: '',
    mainPromise: '',
    narratorVoice: args.voice || 'sage',
    narratorLabel: args.voice ? `${args.voice} narrator` : 'Sage Story Guide',
    visualDirection: '',
    premiumExperienceNotes: [
      'storyboard-first narrated slides',
      'one top play button',
      'mobile-safe media framing',
      'three activity sets per story block',
    ],
    characters: [
      {
        name: '',
        role: 'lead',
        description: '',
      },
      {
        name: '',
        role: 'friend-1',
        description: '',
      },
      {
        name: '',
        role: 'friend-2',
        description: '',
      },
    ],
    courseArc: '',
    successOutcome: '',
    constraints: [],
  };

  const weekOutline = {
    courseSlug: args.course,
    totalWeeks: args.weeks,
    weeks: buildWeekEntries(args.weeks),
  };

  const activityMap = {
    courseSlug: args.course,
    assessmentStrategy: 'Each week should include comprehension, application, and synthesis/transfer activities.',
    dataCaptureGoals: [
      'record answer submission success',
      'store selected answers and optional explanations',
      'capture completion state per story block',
      'make the work feel meaningful and tied to the narrative',
    ],
    weeks: buildWeekEntries(args.weeks).map((week) => ({
      week: week.week,
      title: '',
      activityNotes: [],
    })),
  };

  await fs.writeFile(path.join(courseDir, 'course-brief.json'), `${JSON.stringify(courseBrief, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(courseDir, 'week-outline.json'), `${JSON.stringify(weekOutline, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(courseDir, 'activity-map.json'), `${JSON.stringify(activityMap, null, 2)}\n`, 'utf8');

  console.log(`Scaffolded brief package: ${courseDir}`);
  console.log('Files: course-brief.json, week-outline.json, activity-map.json');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
