const LessonCompleteBanner = {
  ensureStyles() {
    if (document.getElementById('lesson-complete-banner-styles')) return;

    const style = document.createElement('style');
    style.id = 'lesson-complete-banner-styles';
    style.textContent = `
      .lesson-complete-banner {
        display: none;
        margin-bottom: 1.5rem;
        padding: 1.1rem 1.2rem;
        border-radius: 18px;
        border: 1px solid rgba(77, 182, 172, 0.28);
        background:
          linear-gradient(135deg, rgba(77, 182, 172, 0.18), rgba(121, 134, 203, 0.14)),
          rgba(16, 20, 36, 0.92);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
      }

      .lesson-complete-banner.visible {
        display: block;
      }

      .lesson-complete-banner__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: rgba(77, 182, 172, 0.16);
        color: #9ff0e6;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .lesson-complete-banner__title {
        margin: 0.8rem 0 0.35rem;
        font-family: "Space Grotesk", sans-serif;
        font-size: clamp(1.15rem, 2vw, 1.5rem);
      }

      .lesson-complete-banner__copy {
        margin: 0;
        color: rgba(232, 232, 240, 0.84);
        max-width: 72ch;
        line-height: 1.5;
      }

      .lesson-complete-banner__metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.8rem;
        margin-top: 1rem;
      }

      .lesson-complete-banner__metric {
        padding: 0.85rem 0.95rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .lesson-complete-banner__value {
        font-family: "Space Grotesk", sans-serif;
        font-size: 1.4rem;
        line-height: 1;
      }

      .lesson-complete-banner__label {
        margin-top: 0.35rem;
        color: rgba(184, 184, 200, 0.82);
        font-size: 0.82rem;
      }

      .lesson-complete-banner__note {
        margin-top: 1rem;
        padding-top: 0.9rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(232, 232, 240, 0.8);
        font-size: 0.92rem;
      }
    `;

    document.head.appendChild(style);
  },

  ensureMarkup() {
    let banner = document.getElementById('lesson-complete-banner');
    if (banner) return banner;

    const container = document.querySelector('main.container');
    const pageHeader = container?.querySelector('.page-header');
    if (!container || !pageHeader) return null;

    banner = document.createElement('section');
    banner.id = 'lesson-complete-banner';
    banner.className = 'lesson-complete-banner';
    banner.innerHTML = `
      <div class="lesson-complete-banner__eyebrow">Lesson Complete</div>
      <h2 class="lesson-complete-banner__title" id="lesson-complete-title">This lesson is complete.</h2>
      <p class="lesson-complete-banner__copy" id="lesson-complete-copy"></p>
      <div class="lesson-complete-banner__metrics" id="lesson-complete-metrics"></div>
      <div class="lesson-complete-banner__note">
        You are good to go back through the story and redo activities as many times as you want.
      </div>
    `;

    pageHeader.insertAdjacentElement('afterend', banner);
    return banner;
  },

  getLessonDisplayName() {
    const pageTitle = document.querySelector('.page-header h1')?.textContent?.trim();
    if (pageTitle) return pageTitle.replace(/^[^\w]+/, '');
    const lessonId = document.body?.dataset?.lesson || 'This lesson';
    return lessonId.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  },

  buildMetrics() {
    const progress = window.ActivityTracker?.getProgress?.() || { completed: 0, total: 0, isComplete: false };
    const attempts = Array.isArray(window.ActivityTracker?.allAttempts) ? window.ActivityTracker.allAttempts : [];
    const bestAttempts = Object.values(window.ActivityTracker?.bestAttempts || {});

    const uniqueActivities = progress.total || bestAttempts.length;
    const masteredActivities = bestAttempts.filter((attempt) => attempt.correct || attempt.score >= 1).length;
    const averageBestScore = bestAttempts.length
      ? Math.round((bestAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / bestAttempts.length) * 100)
      : 0;
    const totalMinutes = Math.max(1, Math.round(attempts.reduce((sum, attempt) => sum + (attempt.timeSpentMs || 0), 0) / 60000));

    return {
      progress,
      attempts,
      uniqueActivities,
      masteredActivities,
      averageBestScore,
      totalMinutes
    };
  },

  render() {
    const banner = this.ensureMarkup();
    if (!banner) return;

    const {
      progress,
      attempts,
      uniqueActivities,
      masteredActivities,
      averageBestScore,
      totalMinutes
    } = this.buildMetrics();

    if (!progress.isComplete || !uniqueActivities) {
      banner.classList.remove('visible');
      return;
    }

    const lessonName = this.getLessonDisplayName();
    const insight = averageBestScore >= 85
      ? 'Strong signal: you are not just finishing activities, you are retaining the patterns behind them.'
      : 'Strong signal: you are building consistency through repeat attempts and full lesson coverage.';

    const title = document.getElementById('lesson-complete-title');
    const copy = document.getElementById('lesson-complete-copy');
    const metrics = document.getElementById('lesson-complete-metrics');

    if (title) title.textContent = `${lessonName} is complete.`;
    if (copy) copy.textContent = `You have attempted every activity in this lesson. ${insight}`;
    if (metrics) {
      metrics.innerHTML = `
        <div class="lesson-complete-banner__metric">
          <div class="lesson-complete-banner__value">${progress.completed}/${progress.total}</div>
          <div class="lesson-complete-banner__label">Activities attempted</div>
        </div>
        <div class="lesson-complete-banner__metric">
          <div class="lesson-complete-banner__value">${masteredActivities}/${uniqueActivities}</div>
          <div class="lesson-complete-banner__label">Activities mastered</div>
        </div>
        <div class="lesson-complete-banner__metric">
          <div class="lesson-complete-banner__value">${averageBestScore}%</div>
          <div class="lesson-complete-banner__label">Average best score</div>
        </div>
        <div class="lesson-complete-banner__metric">
          <div class="lesson-complete-banner__value">${attempts.length}</div>
          <div class="lesson-complete-banner__label">Total attempts logged</div>
        </div>
        <div class="lesson-complete-banner__metric">
          <div class="lesson-complete-banner__value">${totalMinutes}m</div>
          <div class="lesson-complete-banner__label">Approx. practice time</div>
        </div>
      `;
    }

    banner.classList.add('visible');
  },

  init() {
    this.ensureStyles();
    this.ensureMarkup();

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('activityTrackerProgressUpdated', () => this.render());
      window.addEventListener('activityTrackerDataLoaded', () => {
        setTimeout(() => this.render(), 50);
      });
    }

    setTimeout(() => this.render(), 600);
  }
};

if (typeof window !== 'undefined') {
  window.LessonCompleteBanner = LessonCompleteBanner;
}
