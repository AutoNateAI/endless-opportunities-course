import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';

const repoRoot = process.cwd();
const courseRoot = path.join(repoRoot, 'courses', 'endless-opportunities');

function createFakeElement() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    prepend() {},
    before() {},
    remove() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return createFakeElement(); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
    closest() { return createFakeElement(); },
    innerHTML: '',
    textContent: ''
  };
}

async function captureActivitiesFromPage(filePath) {
  const html = await fs.readFile(filePath, 'utf8');
  const lessonId = path.basename(path.dirname(filePath));
  const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

  const capturedCarousels = [];
  let domReadyHandler = null;

  class FakeActivityCarousel {
    constructor(id, config) {
      capturedCarousels.push({ id, config });
    }
    init() {}
  }

  class FakeStorytellingDiagram {
    constructor() {}
  }

  class FakeAudioNarrationEngine {
    async waitForManifest() {}
    setVoice() {}
  }

  const fakeWindow = {};
  const fakeFirebaseApp = { init() {}, getDb() { return null; } };
  const fakeAuthService = {
    init() {},
    async waitForAuthState() { return null; },
    getUser() { return null; }
  };
  const fakeActivityTracker = { init() {} };
  const fakeDataService = {};
  const fakeDiagramUtils = {
    initPageAnimations() {},
    setupBackToTop() {}
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    window: fakeWindow,
    document: {
      body: { dataset: { course: 'endless-opportunities', lesson: lessonId } },
      addEventListener(eventName, handler) {
        if (eventName === 'DOMContentLoaded') {
          domReadyHandler = handler;
        }
      },
      getElementById() { return createFakeElement(); },
      querySelector() { return createFakeElement(); },
      querySelectorAll() { return []; },
      createElement() { return createFakeElement(); },
      head: createFakeElement()
    },
    fetch: async (requestPath) => ({
      ok: true,
      async json() {
        if (String(requestPath).includes('storyboards')) return {};
        return { stories: [] };
      }
    }),
    FirebaseApp: fakeFirebaseApp,
    AuthService: fakeAuthService,
    ActivityTracker: fakeActivityTracker,
    DataService: fakeDataService,
    ActivityCarousel: FakeActivityCarousel,
    StorytellingDiagram: FakeStorytellingDiagram,
    AudioNarrationEngine: FakeAudioNarrationEngine,
    DiagramUtils: fakeDiagramUtils
  };

  Object.assign(fakeWindow, {
    FirebaseApp: fakeFirebaseApp,
    AuthService: fakeAuthService,
    ActivityTracker: fakeActivityTracker,
    DataService: fakeDataService,
    ActivityCarousel: FakeActivityCarousel,
    StorytellingDiagram: FakeStorytellingDiagram,
    AudioNarrationEngine: FakeAudioNarrationEngine,
    DiagramUtils: fakeDiagramUtils
  });

  vm.createContext(context);
  inlineScripts.forEach((script) => {
    vm.runInContext(script, context, { filename: filePath });
  });

  if (typeof domReadyHandler === 'function') {
    await domReadyHandler();
  }

  return { html, scriptSrcs, carousels: capturedCarousels };
}

function addFinding(findings, severity, file, message) {
  findings.push({ severity, file, message });
}

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function validateQuiz(activity, file, findings) {
  if (!Array.isArray(activity.options) || activity.options.length === 0) {
    addFinding(findings, 'error', file, `${activity.id}: quiz is missing options`);
    return;
  }
  if (!Number.isInteger(activity.correct) || activity.correct < 0 || activity.correct >= activity.options.length) {
    addFinding(findings, 'error', file, `${activity.id}: quiz correct index is out of range`);
  }
}

function validateTrueFalse(activity, file, findings) {
  if (typeof activity.correct !== 'boolean') {
    addFinding(findings, 'error', file, `${activity.id}: true-false activity must use a boolean correct value`);
  }
}

function validateFillBlank(activity, file, findings) {
  if (!Array.isArray(activity.correctAnswers) || activity.correctAnswers.length === 0) {
    addFinding(findings, 'error', file, `${activity.id}: fill-blank activity is missing correctAnswers`);
  }
}

function validateSequence(activity, file, findings) {
  const itemIds = (activity.items || []).map((item) => item.id);
  const correctOrder = activity.correctOrder || [];
  if (!itemIds.length) {
    addFinding(findings, 'error', file, `${activity.id}: sequence activity is missing items`);
    return;
  }
  if (correctOrder.length !== itemIds.length) {
    addFinding(findings, 'error', file, `${activity.id}: sequence correctOrder length does not match items length`);
  }
  const missing = itemIds.filter((id) => !correctOrder.includes(id));
  const invalid = correctOrder.filter((id) => !itemIds.includes(id));
  if (missing.length || invalid.length) {
    addFinding(findings, 'error', file, `${activity.id}: sequence correctOrder is not a permutation of item ids`);
  }
}

function validateDragDrop(activity, file, findings) {
  const itemIds = new Set((activity.items || []).map((item) => item.id));
  if (!itemIds.size) {
    addFinding(findings, 'error', file, `${activity.id}: drag-drop activity is missing items`);
    return;
  }

  const assignedItems = [];
  (activity.zones || []).forEach((zone) => {
    const expected = normalizeToArray(zone.correct);
    if (!expected.length) {
      addFinding(findings, 'error', file, `${activity.id}: zone "${zone.id}" is missing correct answers`);
      return;
    }
    expected.forEach((itemId) => {
      assignedItems.push(itemId);
      if (!itemIds.has(itemId)) {
        addFinding(findings, 'error', file, `${activity.id}: zone "${zone.id}" references unknown item "${itemId}"`);
      }
    });
  });

  const duplicates = assignedItems.filter((itemId, index) => assignedItems.indexOf(itemId) !== index);
  if (duplicates.length) {
    addFinding(findings, 'error', file, `${activity.id}: drag-drop answer key duplicates item ids (${[...new Set(duplicates)].join(', ')})`);
  }

  const missingAssignments = [...itemIds].filter((itemId) => !assignedItems.includes(itemId));
  if (missingAssignments.length) {
    addFinding(findings, 'error', file, `${activity.id}: drag-drop answer key does not place every item (${missingAssignments.join(', ')})`);
  }
}

function validateConnectEdges(activity, file, findings) {
  const nodeIds = new Set((activity.nodes || []).map((node) => node.id));
  const edges = activity.solution?.edges || [];
  if (!nodeIds.size || !edges.length) {
    addFinding(findings, 'error', file, `${activity.id}: connect-edges activity is missing nodes or solution edges`);
    return;
  }

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      addFinding(findings, 'error', file, `${activity.id}: connect-edges solution references unknown node (${edge.source} -> ${edge.target})`);
    }
  });
}

function validateGraphBuilder(activity, file, findings) {
  const nodeTypes = new Set((activity.nodeTypes || []).map((nodeType) => nodeType.type));
  const requiredNodes = activity.validation?.requiredNodes || [];
  const requiredEdges = activity.validation?.requiredEdges || [];

  requiredNodes.forEach((type) => {
    if (!nodeTypes.has(type)) {
      addFinding(findings, 'error', file, `${activity.id}: graph-builder validation references unknown node type "${type}"`);
    }
  });

  requiredEdges.forEach((edge) => {
    if (!nodeTypes.has(edge.from) || !nodeTypes.has(edge.to)) {
      addFinding(findings, 'error', file, `${activity.id}: graph-builder validation references unknown edge types (${edge.from} -> ${edge.to})`);
    }
  });
}

function validateDependencies(file, scriptSrcs, activities, findings) {
  const types = new Set(activities.map((activity) => activity.type));
  const hasCytoscape = scriptSrcs.some((src) => src.includes('cytoscape'));

  if (types.has('connect-edges') && !scriptSrcs.some((src) => src.includes('challenge-puzzle.js'))) {
    addFinding(findings, 'error', file, 'page uses connect-edges activities but does not load challenge-puzzle.js');
  }

  if ((types.has('connect-edges') || types.has('graph-builder')) && !hasCytoscape) {
    addFinding(findings, 'error', file, 'page uses Cytoscape-based activities but does not load Cytoscape');
  }
}

async function main() {
  const weekDirs = (await fs.readdir(courseRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('week'))
    .map((entry) => entry.name)
    .sort();

  const findings = [];

  for (const weekDir of weekDirs) {
    const file = path.join(courseRoot, weekDir, 'index.html');
    const { scriptSrcs, carousels } = await captureActivitiesFromPage(file);
    const activities = carousels.flatMap((carousel) => carousel.config?.activities || []);

    validateDependencies(file, scriptSrcs, activities, findings);

    activities.forEach((activity) => {
      switch (activity.type) {
        case 'quiz':
          validateQuiz(activity, file, findings);
          break;
        case 'true-false':
          validateTrueFalse(activity, file, findings);
          break;
        case 'fill-blank':
          validateFillBlank(activity, file, findings);
          break;
        case 'sequence':
          validateSequence(activity, file, findings);
          break;
        case 'drag-drop':
          validateDragDrop(activity, file, findings);
          break;
        case 'connect-edges':
          validateConnectEdges(activity, file, findings);
          break;
        case 'graph-builder':
          validateGraphBuilder(activity, file, findings);
          break;
        default:
          break;
      }
    });
  }

  if (!findings.length) {
    console.log('EO activity validation passed with no findings.');
    return;
  }

  findings.forEach((finding) => {
    console.log(`[${finding.severity.toUpperCase()}] ${path.relative(repoRoot, finding.file)}: ${finding.message}`);
  });

  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  process.exitCode = errorCount ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
