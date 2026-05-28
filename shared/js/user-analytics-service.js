/**
 * EO user analytics service.
 * Merges precomputed analytics with a client-side fallback derived from
 * live activity attempts so student dashboards stay meaningful even when the
 * analytics function has not run yet or has sparse data.
 */

const EO_LESSON_SKILLS = {
  'week0-intro': {
    title: 'Problem Framing',
    description: 'Seeing real problems as leverage points instead of random frustration.',
    sections: {
      'problem-game': { title: 'Problem Framing', description: 'Spotting where value hides inside recurring problems.' },
      'problem-game-story': { title: 'Problem Framing', description: 'Spotting where value hides inside recurring problems.' },
      'ai-revolution': { title: 'AI Leverage', description: 'Understanding how AI can expand what students can build.' },
      'ai-revolution-story': { title: 'AI Leverage', description: 'Understanding how AI can expand what students can build.' },
      'six-levels': { title: 'Root Cause Thinking', description: 'Moving beneath the first answer to the deeper cause.' },
      'six-levels-story': { title: 'Root Cause Thinking', description: 'Moving beneath the first answer to the deeper cause.' }
    }
  },
  'week1-questions': {
    title: 'Deeper Questioning',
    description: 'Interrogating surface answers until the real system becomes visible.',
    sections: {
      'curiosity': { title: 'Investigative Curiosity', description: 'Replacing snap judgments with grounded inquiry.' },
      'curiosity-story': { title: 'Investigative Curiosity', description: 'Replacing snap judgments with grounded inquiry.' },
      'six-levels': { title: 'Causal Reasoning', description: 'Tracing causes across multiple layers instead of stopping early.' },
      'six-levels-story': { title: 'Causal Reasoning', description: 'Tracing causes across multiple layers instead of stopping early.' },
      'comprehension': { title: 'Transfer of Understanding', description: 'Explaining, connecting, predicting, and applying ideas in new contexts.' },
      'comprehension-story': { title: 'Transfer of Understanding', description: 'Explaining, connecting, predicting, and applying ideas in new contexts.' }
    }
  },
  'week2-data': {
    title: 'Evidence-Based Reasoning',
    description: 'Using signals, patterns, and contradictions to make better claims.',
    sections: {
      'data-mindset': { title: 'Signal Detection', description: 'Noticing recurring patterns instead of passive scrolling.' },
      'data-mindset-story': { title: 'Signal Detection', description: 'Noticing recurring patterns instead of passive scrolling.' },
      algorithms: { title: 'Pattern Recognition', description: 'Reading how platforms shape what people see and do.' },
      'algorithms-story': { title: 'Pattern Recognition', description: 'Reading how platforms shape what people see and do.' },
      analysis: { title: 'Claim Checking', description: 'Testing claims with evidence before trusting the story.' },
      'analysis-story': { title: 'Claim Checking', description: 'Testing claims with evidence before trusting the story.' }
    }
  },
  'week3-building': {
    title: 'Solution Design',
    description: 'Turning insight into a buildable test, prompt, or prototype.',
    sections: {
      'builder-mindset': { title: 'Builder Mindset', description: 'Believing a useful solution can be made and improved.' },
      'builder-mindset-story': { title: 'Builder Mindset', description: 'Believing a useful solution can be made and improved.' },
      'art-of-building': { title: 'Prototyping', description: 'Shaping rough ideas into usable drafts.' },
      'art-of-building-story': { title: 'Prototyping', description: 'Shaping rough ideas into usable drafts.' },
      'clear-prompts': { title: 'Prompt Design', description: 'Giving AI clear instructions that produce stronger outputs.' },
      'clear-prompts-story': { title: 'Prompt Design', description: 'Giving AI clear instructions that produce stronger outputs.' }
    }
  },
  'week4-portfolio': {
    title: 'Reflection and Communication',
    description: 'Explaining the work, the process, and the evidence behind a project.',
    sections: {
      'problem-solving-process': { title: 'Process Thinking', description: 'Explaining how a solution moved from problem to proof.' },
      'problem-solving-process-story': { title: 'Process Thinking', description: 'Explaining how a solution moved from problem to proof.' },
      'capstone-journey': { title: 'Project Execution', description: 'Tracking iteration, revision, and momentum across a build.' },
      'capstone-journey-story': { title: 'Project Execution', description: 'Tracking iteration, revision, and momentum across a build.' },
      'portfolio-celebration': { title: 'Portfolio Communication', description: 'Showing what was built and why it matters.' },
      'portfolio-celebration-story': { title: 'Portfolio Communication', description: 'Showing what was built and why it matters.' }
    }
  }
};

const ACTIVITY_STYLE_MAP = {
  'drag-drop': 'visual',
  'connect-edges': 'visual',
  'graph-builder': 'visual',
  'sequence': 'kinesthetic',
  'scenario': 'kinesthetic',
  'prediction': 'kinesthetic',
  'challenge': 'kinesthetic',
  'demo': 'kinesthetic',
  'quiz': 'reading',
  'true-false': 'reading',
  'fill-blank': 'reading',
  'reflection': 'reading'
};

const CAROUSEL_TITLES = {
  comprehension: 'Comprehension',
  application: 'Application',
  synthesis: 'Synthesis'
};

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeScore(attempt) {
  if (typeof attempt?.score === 'number') return attempt.score;
  return attempt?.correct ? 1 : 0;
}

function safePercent(value) {
  return Math.max(0, Math.min(100, Math.round((value || 0) * 100)));
}

function estimateSessionCount(sortedAttempts) {
  if (!sortedAttempts.length) return 0;
  let sessions = 1;
  for (let index = 1; index < sortedAttempts.length; index++) {
    const previous = toDate(sortedAttempts[index - 1]?.createdAt || sortedAttempts[index - 1]?.completedAt);
    const current = toDate(sortedAttempts[index]?.createdAt || sortedAttempts[index]?.completedAt);
    if (!previous || !current) continue;
    if (current.getTime() - previous.getTime() > 30 * 60 * 1000) {
      sessions += 1;
    }
  }
  return sessions;
}

function computeStreakData(sortedAttempts) {
  const dates = [...new Set(sortedAttempts
    .map((attempt) => toDate(attempt.createdAt || attempt.completedAt))
    .filter(Boolean)
    .map((date) => date.toISOString().slice(0, 10))
  )].sort();

  if (!dates.length) {
    return { currentStreak: 0, streakRecord: 0 };
  }

  let streakRecord = 1;
  let running = 1;
  for (let index = 1; index < dates.length; index++) {
    const previous = new Date(`${dates[index - 1]}T00:00:00Z`);
    const current = new Date(`${dates[index]}T00:00:00Z`);
    const deltaDays = Math.round((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));
    if (deltaDays === 1) {
      running += 1;
      streakRecord = Math.max(streakRecord, running);
    } else {
      running = 1;
    }
  }

  const lastDate = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const deltaFromToday = Math.round((utcToday.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
  const currentStreak = deltaFromToday <= 1 ? running : 0;
  return { currentStreak, streakRecord };
}

function formatTopic(topic) {
  if (!topic) return 'This skill';
  return topic.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActivityType(type) {
  if (!type) return 'Activity';
  return type.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActivityLabel(activityId, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel;
  return activityId
    ? activityId.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Activity';
}

const UserAnalyticsService = {
  async getCurrentUserAnalytics() {
    const user = window.AuthService?.getUser();
    if (!user) return null;
    return this.getUserAnalytics(user.uid);
  },

  async getUserAnalytics(userId) {
    if (!userId) return null;

    const db = window.FirebaseApp?.getDb();
    if (!db) return null;

    try {
      const doc = await db.collection('userAnalytics').doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  },

  async getStudentSnapshot(userId, courseId, options = {}) {
    const recentLimit = options.recentLimit || 8;
    const [serverAnalytics, attempts, courseProgress] = await Promise.all([
      this.getUserAnalytics(userId),
      window.DataService?.getActivityAttempts?.({ courseId, limit: 200 }) || [],
      window.DataService?.getCourseProgress?.(courseId) || null
    ]);

    const localAnalytics = this.buildLocalAnalytics(attempts, courseProgress, courseId);
    const analytics = this.mergeAnalytics(serverAnalytics, localAnalytics);
    const decoratedAttempts = this.decorateAttempts(attempts, courseId).slice(0, recentLimit);
    const insights = this.buildInsights(analytics, courseId);
    const recommendations = this.buildRecommendations(analytics, insights, courseId);

    return {
      analytics,
      attempts,
      recentActivity: decoratedAttempts,
      courseProgress,
      insights,
      recommendations
    };
  },

  async getLearningInsights(userId, options = {}) {
    if (options.courseId) {
      const snapshot = await this.getStudentSnapshot(userId, options.courseId);
      return snapshot.insights;
    }

    const analytics = await this.getUserAnalytics(userId);
    if (!analytics) {
      return {
        analytics: null,
        learningStyle: this.formatLearningStyle(null),
        strengths: [],
        growthAreas: [],
        engagement: null
      };
    }

    return {
      analytics,
      learningStyle: this.formatLearningStyle(analytics.learningStyle?.primary),
      strengths: (analytics.strengthAreas || []).slice(0, 3),
      growthAreas: (analytics.growthAreas || []).slice(0, 3),
      engagement: analytics.engagementPatterns || null
    };
  },

  async getRecommendations(userId, options = {}) {
    if (options.courseId) {
      const snapshot = await this.getStudentSnapshot(userId, options.courseId);
      return snapshot.recommendations;
    }

    const analytics = await this.getUserAnalytics(userId);
    if (!analytics) {
      return [{
        icon: '🚀',
        title: 'Start building your data',
        description: 'Complete your first few activities and lessons to unlock personalized recommendations.'
      }];
    }

    return this.buildRecommendations(analytics, this.buildInsights(analytics), options.courseId);
  },

  mergeAnalytics(serverAnalytics, localAnalytics) {
    if (!serverAnalytics) return localAnalytics;

    const merged = {
      ...localAnalytics,
      ...serverAnalytics,
      learningStyle: serverAnalytics.learningStyle?.primary ? serverAnalytics.learningStyle : localAnalytics.learningStyle,
      strengthAreas: serverAnalytics.strengthAreas?.length ? serverAnalytics.strengthAreas : localAnalytics.strengthAreas,
      growthAreas: serverAnalytics.growthAreas?.length ? serverAnalytics.growthAreas : localAnalytics.growthAreas,
      engagementPatterns: {
        ...localAnalytics.engagementPatterns,
        ...(serverAnalytics.engagementPatterns || {})
      },
      persistenceMetrics: {
        ...localAnalytics.persistenceMetrics,
        ...(serverAnalytics.persistenceMetrics || {})
      },
      summaryStats: {
        ...localAnalytics.summaryStats,
        ...(serverAnalytics.summaryStats || {})
      },
      lessonBreakdown: localAnalytics.lessonBreakdown,
      competencyBreakdown: localAnalytics.competencyBreakdown,
      cognitiveGrowth: localAnalytics.cognitiveGrowth
    };

    return merged;
  },

  buildLocalAnalytics(attempts, courseProgress, courseId) {
    const sortedAttempts = [...(attempts || [])].sort((left, right) => {
      const leftTime = toDate(left.createdAt || left.completedAt)?.getTime() || 0;
      const rightTime = toDate(right.createdAt || right.completedAt)?.getTime() || 0;
      return leftTime - rightTime;
    });

    const lessonBreakdown = {};
    const competencyBreakdown = {};
    const styleBuckets = {};
    const activityHistory = {};

    let totalScore = 0;
    let totalCorrect = 0;
    let totalTimeSpentMs = 0;

    sortedAttempts.forEach((attempt) => {
      const score = normalizeScore(attempt);
      const descriptor = this.getCompetencyDescriptor(attempt, courseId);
      const style = ACTIVITY_STYLE_MAP[attempt.activityType] || 'reading';
      const lessonKey = attempt.lessonId || 'general';
      const activityKey = attempt.activityId || `${lessonKey}-${attempt.activityType || 'activity'}`;

      totalScore += score;
      totalCorrect += attempt.correct ? 1 : 0;
      totalTimeSpentMs += attempt.timeSpentMs || 0;

      if (!lessonBreakdown[lessonKey]) {
        lessonBreakdown[lessonKey] = {
          key: lessonKey,
          title: descriptor.lessonTitle,
          description: descriptor.lessonDescription,
          attempts: 0,
          totalScore: 0
        };
      }

      lessonBreakdown[lessonKey].attempts += 1;
      lessonBreakdown[lessonKey].totalScore += score;

      if (!competencyBreakdown[descriptor.key]) {
        competencyBreakdown[descriptor.key] = {
          topic: descriptor.key,
          displayTitle: descriptor.title,
          description: descriptor.description,
          lessonId: descriptor.lessonId,
          lessonTitle: descriptor.lessonTitle,
          carouselType: descriptor.carouselType,
          attempts: 0,
          totalScore: 0,
          recentScore: 0
        };
      }

      competencyBreakdown[descriptor.key].attempts += 1;
      competencyBreakdown[descriptor.key].totalScore += score;
      competencyBreakdown[descriptor.key].recentScore = score;

      styleBuckets[style] = styleBuckets[style] || { totalScore: 0, attempts: 0 };
      styleBuckets[style].totalScore += score;
      styleBuckets[style].attempts += 1;

      activityHistory[activityKey] = activityHistory[activityKey] || [];
      activityHistory[activityKey].push({ score, correct: !!attempt.correct });
    });

    const competencyList = Object.values(competencyBreakdown).map((item) => ({
      ...item,
      score: item.attempts ? item.totalScore / item.attempts : 0,
      confidence: Math.min(1, item.attempts / 4)
    })).sort((left, right) => right.score - left.score);

    const strengths = competencyList
      .filter((item) => item.attempts >= 2 && item.score >= 0.75)
      .map((item) => ({ ...item }))
      .slice(0, 4);

    const growthAreas = competencyList
      .filter((item) => item.attempts >= 2 && item.score < 0.75)
      .sort((left, right) => left.score - right.score)
      .map((item) => ({ ...item }))
      .slice(0, 4);

    let avgAttemptsBeforeSuccess = 0;
    let retryAfterFailure = 0;
    let improvementRate = 0;
    let successfulActivities = 0;
    let retriesAfterFailure = 0;
    let failedActivities = 0;
    let improvementSamples = 0;

    Object.values(activityHistory).forEach((history) => {
      const firstSuccessIndex = history.findIndex((item) => item.correct || item.score >= 1);
      if (firstSuccessIndex >= 0) {
        avgAttemptsBeforeSuccess += firstSuccessIndex + 1;
        successfulActivities += 1;
      }
      if (history[0] && !history[0].correct && history[0].score < 1) {
        failedActivities += 1;
        if (history.length > 1) {
          retriesAfterFailure += 1;
        }
      }
      if (history.length > 1) {
        improvementRate += history[history.length - 1].score - history[0].score;
        improvementSamples += 1;
      }
    });

    const learningStyleBreakdown = {};
    Object.entries(styleBuckets).forEach(([style, bucket]) => {
      learningStyleBreakdown[style] = bucket.attempts ? bucket.totalScore / bucket.attempts : 0;
    });

    const rankedStyles = Object.entries(learningStyleBreakdown)
      .sort((left, right) => right[1] - left[1]);

    const engagementPatterns = (() => {
      const preferredTimes = {};
      sortedAttempts.forEach((attempt) => {
        const timestamp = toDate(attempt.createdAt || attempt.completedAt);
        if (!timestamp) return;
        const hour = timestamp.getHours();
        const blockStart = Math.floor(hour / 2) * 2;
        const key = `${String(blockStart).padStart(2, '0')}:00-${String(blockStart + 2).padStart(2, '0')}:00`;
        preferredTimes[key] = (preferredTimes[key] || 0) + 1;
      });

      const streakData = computeStreakData(sortedAttempts);
      const sessionCount = estimateSessionCount(sortedAttempts);
      const rankedTimes = Object.entries(preferredTimes)
        .sort((left, right) => right[1] - left[1])
        .map(([label]) => label)
        .slice(0, 2);

      return {
        preferredTimes: rankedTimes,
        avgSessionLength: sessionCount ? Math.round(totalTimeSpentMs / sessionCount / 60000) : 0,
        streakRecord: streakData.streakRecord,
        currentStreak: streakData.currentStreak,
        totalSessionCount: sessionCount,
        totalTimeSpentMinutes: Math.round(totalTimeSpentMs / 60000)
      };
    })();

    const primaryGrowth = growthAreas[0] || strengths[0] || competencyList[0] || null;
    const completedLessons = window.DataService?.getCompletedLessonsCount?.(courseProgress, courseId) || 0;
    const totalLessons = window.DataService?.getLessonsStructure?.(courseId)?.totalLessons || 0;

    return {
      learningStyle: {
        primary: rankedStyles[0]?.[0] || null,
        secondary: rankedStyles[1]?.[0] || null,
        confidence: sortedAttempts.length ? Math.min(0.95, 0.45 + (sortedAttempts.length / 60)) : 0,
        dataPoints: sortedAttempts.length,
        breakdown: learningStyleBreakdown
      },
      strengthAreas: strengths,
      growthAreas,
      engagementPatterns,
      persistenceMetrics: {
        avgAttemptsBeforeSuccess: successfulActivities ? Number((avgAttemptsBeforeSuccess / successfulActivities).toFixed(1)) : 0,
        retryAfterFailure: failedActivities ? Number((retriesAfterFailure / failedActivities).toFixed(2)) : 0,
        improvementRate: improvementSamples ? Number((improvementRate / improvementSamples).toFixed(2)) : 0,
        totalAttempts: sortedAttempts.length,
        totalCorrect,
        overallAccuracy: sortedAttempts.length ? Number((totalCorrect / sortedAttempts.length).toFixed(2)) : 0
      },
      summaryStats: {
        activitiesCompleted: Object.keys(activityHistory).length,
        averageScore: sortedAttempts.length ? Number((totalScore / sortedAttempts.length).toFixed(2)) : 0,
        totalTimeSpentMinutes: Math.round(totalTimeSpentMs / 60000),
        completedLessons,
        totalLessons
      },
      lessonBreakdown: Object.values(lessonBreakdown).map((item) => ({
        ...item,
        score: item.attempts ? item.totalScore / item.attempts : 0
      })),
      competencyBreakdown: competencyList,
      cognitiveGrowth: {
        primary: primaryGrowth,
        topStrength: strengths[0] || null
      },
      dataQuality: {
        hasEnoughData: sortedAttempts.length >= 3,
        activityCount: sortedAttempts.length
      }
    };
  },

  buildInsights(analytics, courseId) {
    const learningStyle = this.formatLearningStyle(analytics?.learningStyle?.primary);
    const strengths = (analytics?.strengthAreas || []).slice(0, 3);
    const growthAreas = (analytics?.growthAreas || []).slice(0, 3);
    const primaryGrowth = analytics?.cognitiveGrowth?.primary || growthAreas[0] || strengths[0] || null;

    return {
      analytics,
      learningStyle,
      strengths,
      growthAreas,
      engagement: analytics?.engagementPatterns || null,
      primaryGrowth: primaryGrowth ? {
        title: primaryGrowth.displayTitle || this.formatTopic(primaryGrowth.topic),
        description: primaryGrowth.description || this.getCourseSkillDescription(courseId, primaryGrowth.lessonId),
        score: primaryGrowth.score || 0
      } : {
        title: 'Cognitive growth is still emerging',
        description: 'Complete a few more EO activities and this dashboard will start surfacing real patterns in how the student learns.',
        score: 0
      }
    };
  },

  buildRecommendations(analytics, insights, courseId) {
    const recommendations = [];
    const nextGrowth = insights?.growthAreas?.[0];
    const topStrength = insights?.strengths?.[0];
    const engagement = analytics?.engagementPatterns;
    const persistence = analytics?.persistenceMetrics;

    if (nextGrowth) {
      recommendations.push({
        icon: '🎯',
        title: `Build ${nextGrowth.displayTitle || this.formatTopic(nextGrowth.topic)}`,
        description: nextGrowth.description || 'This is the clearest growth signal in the current activity data.'
      });
    }

    if (topStrength) {
      recommendations.push({
        icon: '🧠',
        title: `${topStrength.displayTitle || this.formatTopic(topStrength.topic)} is landing`,
        description: `Recent EO work shows strength here at ${safePercent(topStrength.score)}% mastery.`
      });
    }

    if (engagement?.currentStreak) {
      recommendations.push({
        icon: '🔥',
        title: `Protect the ${engagement.currentStreak}-day streak`,
        description: 'A short session today keeps the student\'s momentum visible on the dashboard.'
      });
    }

    if (engagement?.preferredTimes?.length) {
      recommendations.push({
        icon: '⏰',
        title: 'Use the strongest study window',
        description: `The highest concentration of activity is around ${engagement.preferredTimes[0]}.`
      });
    }

    if (persistence?.retryAfterFailure >= 0.5) {
      recommendations.push({
        icon: '💪',
        title: 'Persistence is visible',
        description: 'The student is retrying after misses instead of stopping at the first failure.'
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        icon: '🚀',
        title: 'Start building signal',
        description: 'Once a few EO activities are complete, this card will surface specific strengths and growth areas.'
      });
    }

    return recommendations.slice(0, 4);
  },

  decorateAttempts(attempts, courseId) {
    return (attempts || []).map((attempt) => {
      const descriptor = this.getCompetencyDescriptor(attempt, courseId);
      const lessonMeta = window.DataService?.getLessonMeta?.(courseId, attempt.lessonId) || null;
      return {
        ...attempt,
        lessonName: lessonMeta?.name || descriptor.lessonTitle,
        lessonLabel: lessonMeta?.name || descriptor.lessonTitle,
        activityLabel: formatActivityLabel(attempt.activityId, attempt.activityLabel),
        activityTypeLabel: formatActivityType(attempt.activityType),
        cognitiveLabel: descriptor.title,
        carouselLabel: CAROUSEL_TITLES[attempt.carouselType] || null
      };
    }).sort((left, right) => {
      const leftTime = toDate(left.createdAt || left.completedAt)?.getTime() || 0;
      const rightTime = toDate(right.createdAt || right.completedAt)?.getTime() || 0;
      return rightTime - leftTime;
    });
  },

  getCompetencyDescriptor(attempt, courseId) {
    const lessonId = attempt?.lessonId;
    const lessonMeta = window.DataService?.getLessonMeta?.(courseId, lessonId) || null;
    const lessonConfig = EO_LESSON_SKILLS[lessonId] || null;
    const sectionConfig = lessonConfig?.sections?.[attempt?.sectionId] || null;
    const title = sectionConfig?.title || lessonConfig?.title || lessonMeta?.name || this.formatTopic(lessonId);
    const description = sectionConfig?.description || lessonConfig?.description || 'Progress is based on the activity evidence collected in this lesson.';

    return {
      key: attempt?.sectionId || lessonId || attempt?.activityId || 'general-growth',
      title,
      description,
      lessonId: lessonId || 'general',
      lessonTitle: lessonMeta?.name || this.formatTopic(lessonId),
      lessonDescription: lessonMeta?.desc || description,
      carouselType: attempt?.carouselType || null
    };
  },

  getCourseSkillDescription(courseId, lessonId) {
    return EO_LESSON_SKILLS[lessonId]?.description || 'Progress is computed from lesson completions and activity attempts.';
  },

  formatLearningStyle(style) {
    const map = {
      visual: {
        name: 'Visual',
        icon: '👁️',
        description: 'Diagrams, structure, and visible patterns appear to help this student absorb material fastest.'
      },
      auditory: {
        name: 'Auditory',
        icon: '🎧',
        description: 'Narration and listening-based repetition look like strong learning channels.'
      },
      reading: {
        name: 'Reading / Writing',
        icon: '📚',
        description: 'Written prompts and explanation-based activities currently appear strongest.'
      },
      kinesthetic: {
        name: 'Hands-On',
        icon: '🛠️',
        description: 'Interactive practice, testing, and adjustment appear to drive the strongest learning gains.'
      }
    };

    return map[style] || {
      name: 'Still emerging',
      icon: '🧭',
      description: 'Complete a few more activities and the student\'s learning pattern will become clearer.'
    };
  },

  formatTopic(topic) {
    return formatTopic(topic);
  }
};

window.UserAnalyticsService = UserAnalyticsService;
