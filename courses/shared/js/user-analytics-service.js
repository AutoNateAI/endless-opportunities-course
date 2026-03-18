/**
 * EO user analytics service.
 * Reads computed analytics from Firestore and formats dashboard-friendly insights.
 */

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

  async getLearningInsights(userId) {
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

  async getRecommendations(userId) {
    const analytics = await this.getUserAnalytics(userId);
    if (!analytics) {
      return [{
        icon: '🚀',
        title: 'Start building your data',
        description: 'Complete your first few activities and lessons to unlock personalized recommendations.'
      }];
    }

    const recommendations = [];
    const topGrowth = analytics.growthAreas?.[0];
    const engagement = analytics.engagementPatterns;
    const persistence = analytics.persistenceMetrics;
    const learningStyle = analytics.learningStyle?.primary;

    if (topGrowth) {
      recommendations.push({
        icon: '🎯',
        title: `Focus on ${this.formatTopic(topGrowth.topic)}`,
        description: `This is your clearest growth area right now. More reps here should lift your overall confidence fast.`
      });
    }

    if (engagement?.currentStreak > 0) {
      recommendations.push({
        icon: '🔥',
        title: `Protect your ${engagement.currentStreak}-day streak`,
        description: 'Even a short session today keeps your momentum and your timeline moving forward.'
      });
    }

    if (engagement?.preferredTimes?.length) {
      recommendations.push({
        icon: '⏰',
        title: 'Use your strongest study window',
        description: `Your activity suggests you work best around ${engagement.preferredTimes[0]}.`
      });
    }

    if (persistence?.retryAfterFailure >= 0.7) {
      recommendations.push({
        icon: '💪',
        title: 'Your persistence is a strength',
        description: 'You tend to try again after missing a question. Keep leaning into that instead of rushing ahead.'
      });
    }

    if (learningStyle) {
      const style = this.formatLearningStyle(learningStyle);
      recommendations.push({
        icon: style.icon,
        title: `${style.name} learning works for you`,
        description: style.description
      });
    }

    return recommendations.slice(0, 4);
  },

  formatLearningStyle(style) {
    const map = {
      visual: {
        name: 'Visual',
        icon: '👁️',
        description: 'Diagrams, structure, and visible patterns appear to help you absorb material fastest.'
      },
      auditory: {
        name: 'Auditory',
        icon: '🎧',
        description: 'Narration and listening-based repetition look like strong learning channels for you.'
      },
      reading: {
        name: 'Reading / Writing',
        icon: '📚',
        description: 'Written prompts, quiz text, and direct explanation appear to land well for you.'
      },
      kinesthetic: {
        name: 'Hands-On',
        icon: '🛠️',
        description: 'You seem to learn best by doing, testing, and adjusting through active practice.'
      }
    };

    return map[style] || {
      name: 'Still emerging',
      icon: '🧭',
      description: 'Complete a few more activities and your learning pattern will become clearer.'
    };
  },

  formatTopic(topic) {
    if (!topic) return 'this skill';
    return topic
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

window.UserAnalyticsService = UserAnalyticsService;
