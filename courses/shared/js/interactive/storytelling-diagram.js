/**
 * StorytellingDiagram - Animated Cytoscape diagrams with AI narration
 * 
 * Turns static Cytoscape diagrams into narrated, animated stories.
 * Features:
 *   - Step-by-step node/edge reveals
 *   - Glowing node animations
 *   - Photon/particle edge effects
 *   - AI narration with word highlighting
 *   - Play/Pause/Resume controls
 *   - Progress dots for navigation
 *   - Zoom effects
 * 
 * Dependencies:
 *   - Cytoscape.js
 *   - Anime.js
 *   - AudioNarrationEngine (audio-engine.js)
 *   - DiagramUtils (diagram-utils.js)
 * 
 * Usage:
 *   const diagram = new StorytellingDiagram('my-diagram', elements, storySteps);
 */

class StorytellingDiagram {
  constructor(containerId, elements, storySteps, options = {}) {
    this.containerId = containerId;
    this.elements = elements;
    this.storySteps = storySteps;
    this.options = {
      stepDuration: 500, // Default for audio-on mode
      audioEnabled: true,
      audioBasePath: 'audio',
      storyId: containerId, // Default to containerId, can be overridden
      audioEngine: null, // Optional shared audio engine
      ...options
    };
    this.currentStep = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.shouldStop = false;
    this.cy = null;
    this.animationMode = false;
    this.activeEdgeAnimations = [];
    this.tooltip = null;
    this.tooltipNode = null;
    this.narrator = null;
    this.focusedNodeId = null;
    
    this.init();
  }

  init() {
    // Use shared audio engine if provided, otherwise create one
    this.narrator = this.options.audioEngine || new AudioNarrationEngine(this.options.audioBasePath);
    
    // Create cytoscape with custom styles
    this.cy = this.createCustomDiagram();
    
    // Show all nodes/edges initially (dimmed)
    this.showAllDimmed();
    
    // Setup controls
    this.setupControls();
    this.setupProgressDots();
    this.setupAudioControls();
    this.setupCustomInteractivity();
    this.setupExplorer();
  }

  createCustomDiagram() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container '${this.containerId}' not found`);
      return null;
    }
    
    const cy = cytoscape({
      container: container,
      elements: this.elements,
      style: this.getCustomStylesheet(),
      layout: DiagramUtils.LAYOUTS.hierarchical,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
      selectionType: 'single'
    });

    return cy;
  }

  getCustomStylesheet() {
    const baseStyles = DiagramUtils.getBaseStylesheet();
    
    // Add animation-specific styles
    const animationStyles = [
      {
        selector: 'node.story-active',
        style: {
          'border-width': 4,
          'border-color': '#4db6ac',
          'box-shadow': '0 0 20px #4db6ac',
          'z-index': 999
        }
      },
      {
        selector: 'node.story-dimmed',
        style: {
          'opacity': 0.3
        }
      },
      {
        selector: 'edge.story-dimmed',
        style: {
          'opacity': 0.15
        }
      },
      {
        selector: 'edge.story-active',
        style: {
          'width': 4,
          'line-color': '#4db6ac',
          'target-arrow-color': '#4db6ac',
          'opacity': 1,
          'line-style': 'dashed',
          'line-dash-pattern': [8, 4],
          'z-index': 999
        }
      },
      {
        selector: 'node.story-complete',
        style: {
          'opacity': 1,
          'border-width': 2
        }
      },
      {
        selector: 'edge.story-complete',
        style: {
          'opacity': 1,
          'width': 3,
          'line-style': 'solid',
          'line-color': '#4db6ac',
          'target-arrow-color': '#4db6ac'
        }
      }
    ];

    return [...baseStyles, ...animationStyles];
  }

  showAllDimmed() {
    this.cy.nodes().addClass('story-dimmed').style('opacity', 0.3);
    this.cy.edges().addClass('story-dimmed').style('opacity', 0.15);
  }

  showAllFull() {
    this.cy.elements().removeClass('story-dimmed story-active story-complete');
    this.cy.nodes().style('opacity', 1);
    this.cy.edges().style('opacity', 0.7);
  }

  // ============================================
  // TOOLTIP SYSTEM
  // ============================================

  setupCustomInteractivity() {
    const container = document.getElementById(this.containerId);
    this.tooltip = this.createTooltip(container);

    // Custom hover - allow on active/complete nodes during animation
    this.cy.on('mouseover', 'node', (e) => {
      const node = e.target;
      if (node.data('type') === 'group') return;
      
      // During animation, only show tooltip for active or complete nodes
      if (this.animationMode) {
        if (!node.hasClass('story-active') && !node.hasClass('story-complete')) {
          return;
        }
      }
      this.showTooltip(node);
    });

    this.cy.on('mouseout', 'node', () => {
      this.hideTooltip();
    });

    // Update tooltip position when node is dragged
    this.cy.on('drag', 'node', (e) => {
      if (this.tooltipNode && this.tooltipNode.id() === e.target.id()) {
        this.updateTooltipPosition(e.target);
      }
    });

    // Click background to deselect
    this.cy.on('tap', (e) => {
      if (e.target === this.cy) {
        this.hideTooltip();
      }
    });

    // Allow direct node traversal when the user wants to explore
    this.cy.on('tap', 'node', (e) => {
      const node = e.target;
      if (node.data('type') === 'group') return;

      const stepIndex = this.storySteps.findIndex((step) => step.nodeId === node.id());
      if (stepIndex >= 0) {
        this.jumpToStep(stepIndex);
      } else {
        this.focusNode(node.id());
      }
    });

    // Double-tap to fit
    this.cy.on('dbltap', (e) => {
      if (e.target === this.cy) {
        this.cy.fit(50);
      }
    });
  }

  createTooltip(container) {
    let tooltip = container.querySelector('.node-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'node-tooltip';
      container.appendChild(tooltip);
    }
    return tooltip;
  }

  showTooltip(node) {
    this.tooltipNode = node;
    const data = node.data();
    
    const incomers = node.incomers('node').map(n => n.data('label')).join(', ') || 'None';
    const outgoers = node.outgoers('node').map(n => n.data('label')).join(', ') || 'None';
    
    this.tooltip.innerHTML = `
      <h4>${data.label}</h4>
      <p>${data.description || 'No description'}</p>
      <div class="connections">
        <strong>← From:</strong> <span>${incomers}</span><br>
        <strong>→ To:</strong> <span>${outgoers}</span>
      </div>
    `;
    
    this.updateTooltipPosition(node);
    this.tooltip.classList.add('visible');
  }

  updateTooltipPosition(node) {
    const pos = node.renderedPosition();
    const container = document.getElementById(this.containerId);
    const containerRect = container.getBoundingClientRect();
    
    let left = pos.x + 20;
    let top = pos.y - 20;
    
    if (left + 300 > containerRect.width) {
      left = pos.x - 320;
    }
    if (top + 150 > containerRect.height) {
      top = containerRect.height - 160;
    }
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.tooltipNode = null;
  }

  // ============================================
  // CONTROLS
  // ============================================

  setupControls() {
    const container = document.getElementById(this.containerId).closest('.diagram-container');
    if (!container) return;
    
    // Play/Pause button
    this.playBtn = container.querySelector('[data-action="play"]');
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => this.togglePlayPause());
    }

    // Speed select - store reference for audio-based visibility
    this.speedSelect = container.querySelector('select[id$="speed-select"]');
    this.speedControlGroup = this.speedSelect?.closest('.control-group');
    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        this.options.stepDuration = parseInt(e.target.value, 10);
      });
    }

    // Fit button
    const fitBtn = container.querySelector('[data-action="fit"]');
    if (fitBtn) fitBtn.addEventListener('click', () => this.cy.fit(50));

    if (!container.querySelector('[data-action="explore"]')) {
      const playbackRight = container.querySelector('.playback-right');
      if (playbackRight) {
        const exploreBtn = document.createElement('button');
        exploreBtn.className = 'diagram-btn small';
        exploreBtn.type = 'button';
        exploreBtn.dataset.action = 'explore';
        exploreBtn.title = 'Reveal the full map and traverse it';
        exploreBtn.textContent = 'Explore Map';
        playbackRight.prepend(exploreBtn);
        exploreBtn.addEventListener('click', () => this.enterExploreMode());
      }
    }

    // Reset button
    const resetBtn = container.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.stop();
        this.cy.layout(DiagramUtils.LAYOUTS.hierarchical).run();
        setTimeout(() => {
          this.cy.fit(50);
          this.showAllDimmed();
          this.currentStep = -1;
          this.updateProgressDots();
          this.resetCaption();
        }, 100);
      });
    }

    // Export button
    const exportBtn = container.querySelector('[data-action="export"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        DiagramUtils.exportDiagram(this.cy, this.containerId);
      });
    }
  }

  togglePlayPause() {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.play();
    }
  }

  pause() {
    this.isPaused = true;
    this.narrator.pause();
    this.updatePlayButtonUI();
  }

  resume() {
    this.isPaused = false;
    this.narrator.resume();
    this.updatePlayButtonUI();
  }

  stop() {
    this.shouldStop = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.animationMode = false;
    this.narrator.stop();
    this.clearEdgeAnimations();
    this.clearWordHighlights();
    this.updatePlayButtonUI();
  }

  updatePlayButtonUI() {
    if (!this.playBtn) return;
    
    if (this.isPlaying && !this.isPaused) {
      this.playBtn.textContent = '⏸ Pause';
      this.playBtn.classList.add('playing');
      this.playBtn.classList.remove('paused');
    } else if (this.isPaused) {
      this.playBtn.textContent = '▶ Resume';
      this.playBtn.classList.remove('playing');
      this.playBtn.classList.add('paused');
    } else {
      this.playBtn.textContent = '▶ Play';
      this.playBtn.classList.remove('playing', 'paused');
    }
  }

  // ============================================
  // AUDIO CONTROLS
  // ============================================

  setupAudioControls() {
    const container = document.getElementById(this.containerId).closest('.diagram-container');
    if (!container) return;
    
    this.audioToggle = container.querySelector('.audio-toggle');
    if (this.audioToggle) {
      this.audioToggle.addEventListener('click', () => {
        this.options.audioEnabled = !this.options.audioEnabled;
        this.updateAudioToggleUI();
        this.updateSpeedControlVisibility();
        this.narrator.setMuted(!this.options.audioEnabled);
        if (!this.options.audioEnabled) this.narrator.stop();
      });
    }

    // Voice select
    this.voiceSelect = container.querySelector('.voice-select');
    if (this.voiceSelect) {
      this.populateVoices();
      this.voiceSelect.addEventListener('change', (e) => {
        this.narrator.setVoice(e.target.value);
      });
    }

    this.narrator.onSpeakingChange = (speaking) => {
      if (this.audioToggle) {
        this.audioToggle.classList.toggle('speaking', speaking);
      }
    };
    
    // Set initial speed control visibility based on audio state
    this.updateSpeedControlVisibility();
  }
  
  updateSpeedControlVisibility() {
    if (!this.speedControlGroup) return;
    
    if (this.options.audioEnabled) {
      // Audio ON: hide speed control, use 0.5s
      this.speedControlGroup.style.display = 'none';
      this.options.stepDuration = 500;
    } else {
      // Audio OFF (muted): show speed control, use 2s default
      this.speedControlGroup.style.display = '';
      if (this.speedSelect) {
        this.speedSelect.value = '2000';
        this.options.stepDuration = 2000;
      }
    }
  }

  populateVoices() {
    const tryPopulate = () => {
      const voices = this.narrator.getVoices();
      if (voices.length === 0) {
        setTimeout(tryPopulate, 100);
        return;
      }

      this.voiceSelect.innerHTML = voices
        .map((v) => `<option value="${v.id}" ${v.id === this.narrator.currentVoice ? 'selected' : ''}>${v.label}</option>`)
        .join('');
    };
    
    tryPopulate();
  }

  updateAudioToggleUI() {
    if (!this.audioToggle) return;
    const icon = this.audioToggle.querySelector('.audio-icon');
    const label = this.audioToggle.querySelector('.audio-label');
    
    if (this.options.audioEnabled) {
      this.audioToggle.classList.remove('muted');
      if (icon) icon.textContent = '🔊';
      if (label) label.textContent = 'On';
    } else {
      this.audioToggle.classList.add('muted');
      if (icon) icon.textContent = '🔇';
      if (label) label.textContent = 'Off';
    }
  }

  // ============================================
  // PROGRESS DOTS
  // ============================================

  setupProgressDots() {
    const progressContainer = document.getElementById(`${this.containerId}-progress`);
    if (!progressContainer) return;

    progressContainer.innerHTML = this.storySteps.map((step, i) => 
      `<div class="progress-dot" data-step="${i}" data-title="${step.title}" title="${step.title}"></div>`
    ).join('');

    // Make dots clickable
    progressContainer.querySelectorAll('.progress-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const stepIndex = parseInt(dot.dataset.step, 10);
        this.jumpToStep(stepIndex);
      });
    });
  }

  updateProgressDots() {
    const dots = document.querySelectorAll(`#${this.containerId}-progress .progress-dot`);
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i < this.currentStep) dot.classList.add('completed');
      if (i === this.currentStep) dot.classList.add('active');
    });
  }

  // ============================================
  // CAPTIONS
  // ============================================

  resetCaption() {
    const captionContainer = document.getElementById(`${this.containerId}-caption`);
    if (!captionContainer) return;

    const icon = captionContainer.querySelector('.story-icon');
    const title = captionContainer.querySelector('.story-title');
    const text = captionContainer.querySelector('.story-text');
    const connection = captionContainer.querySelector('.story-connection');

    if (icon) { icon.textContent = '🚀'; icon.classList.add('visible'); }
    if (title) { title.textContent = 'Ready to Explore'; title.classList.add('visible'); }
    if (text) { 
      text.textContent = 'Click any progress dot below to jump to that step, or press Play to watch the full story.'; 
      text.classList.add('visible'); 
    }
    if (connection) connection.style.display = 'none';
    captionContainer.classList.remove('active');
    this.updateExplorerForNode(this.storySteps[0]?.nodeId || null);
  }

  updateCaption(step) {
    const captionContainer = document.getElementById(`${this.containerId}-caption`);
    if (!captionContainer) return;

    const icon = captionContainer.querySelector('.story-icon');
    const title = captionContainer.querySelector('.story-title');
    const text = captionContainer.querySelector('.story-text');
    const connection = captionContainer.querySelector('.story-connection');
    const connectionText = captionContainer.querySelector('.connection-text');

    // Quick fade out
    icon?.classList.remove('visible');
    title?.classList.remove('visible');
    text?.classList.remove('visible');
    connection?.classList.remove('visible');

    this.currentNarrationStep = step;

    setTimeout(() => {
      if (icon) icon.textContent = step.icon;
      
      // Wrap words in spans for highlighting
      if (title) {
        title.innerHTML = this.wrapWordsInSpans(step.title);
      }
      
      if (text) {
        text.innerHTML = this.wrapWordsInSpans(step.narration);
      }
      
      if (step.connectsTo && connection && connectionText) {
        connectionText.textContent = `Connects to: ${step.connectsTo}`;
        connection.style.display = 'inline-flex';
      } else if (connection) {
        connection.style.display = 'none';
      }

      captionContainer.classList.add('active');
      setTimeout(() => icon?.classList.add('visible'), 50);
      setTimeout(() => title?.classList.add('visible'), 100);
      setTimeout(() => text?.classList.add('visible'), 150);
      setTimeout(() => connection?.classList.add('visible'), 250);
    }, 100);

    this.focusedNodeId = step.nodeId || null;
    this.updateExplorerForNode(this.focusedNodeId);
    this.updateProgressDots();
  }

  wrapWordsInSpans(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.map((w, i) => 
      `<span class="word" data-index="${i}">${w}</span>`
    ).join(' ');
  }

  clearWordHighlights() {
    const captionContainer = document.getElementById(`${this.containerId}-caption`);
    if (!captionContainer) return;
    
    captionContainer.querySelectorAll('.word').forEach(el => {
      el.classList.remove('current', 'spoken');
    });
  }

  // ============================================
  // PLAYBACK
  // ============================================

  async jumpToStep(stepIndex) {
    // Stop any ongoing playback but don't reset everything
    this.isPlaying = false;
    this.isPaused = false;
    this.shouldStop = true;
    this.narrator.stop();
    this.clearEdgeAnimations();

    this.animationMode = true;
    this.currentStep = stepIndex;
    this.focusedNodeId = this.storySteps[stepIndex]?.nodeId || null;

    // Reset all elements first
    this.cy.elements().removeClass('story-dimmed story-active story-complete');
    this.cy.nodes().style('opacity', 0.3);
    this.cy.edges().style('opacity', 0.15);

    // Mark all steps UP TO (but not including) current as complete
    for (let i = 0; i < stepIndex; i++) {
      const step = this.storySteps[i];
      
      if (step.nodeId) {
        const node = this.cy.getElementById(step.nodeId);
        node.addClass('story-complete');
        node.style('opacity', 1);
      }

      if (step.edges) {
        for (const edgeSpec of step.edges) {
          const edge = this.cy.edges().filter(e => 
            e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
          );
          edge.addClass('story-complete');
          edge.style({
            'opacity': 1,
            'width': 3,
            'line-style': 'solid',
            'line-color': '#4db6ac',
            'target-arrow-color': '#4db6ac'
          });
        }
      }
    }

    // Highlight CURRENT step as active
    const currentStepData = this.storySteps[stepIndex];
    if (currentStepData.nodeId) {
      const node = this.cy.getElementById(currentStepData.nodeId);
      node.addClass('story-active');
      node.style('opacity', 1);
      
      this.zoomToNode(node);
      this.animateNodeGlow(node);
    }

    // Animate current edges
    if (currentStepData.edges) {
      for (const edgeSpec of currentStepData.edges) {
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        edge.addClass('story-active');
        edge.style('opacity', 1);
        this.animateEdgeFlow(edge);
      }
    }

    // Update caption and progress dots
    this.updateCaption(currentStepData);
    this.updateProgressDots();
    this.updatePlayButtonUI();
    
    // Play audio if enabled
    if (this.options.audioEnabled) {
      await this.narrateStep(currentStepData);
    }
  }

  setupExplorer() {
    const captionContainer = document.getElementById(`${this.containerId}-caption`);
    if (!captionContainer || captionContainer.querySelector('.story-explorer')) return;

    const explorer = document.createElement('div');
    explorer.className = 'story-explorer';
    explorer.innerHTML = `
      <div class="story-explorer-meta">
        <span class="story-explorer-label">Traverse the map</span>
        <span class="story-explorer-path">Pick a node to inspect its place in the hierarchy.</span>
      </div>
      <div class="story-explorer-groups">
        <div class="story-explorer-group" data-group="parents">
          <span class="story-explorer-group-label">Upstream</span>
          <div class="story-explorer-chips"></div>
        </div>
        <div class="story-explorer-group" data-group="children">
          <span class="story-explorer-group-label">Downstream</span>
          <div class="story-explorer-chips"></div>
        </div>
        <div class="story-explorer-group" data-group="siblings">
          <span class="story-explorer-group-label">Peer links</span>
          <div class="story-explorer-chips"></div>
        </div>
      </div>
    `;

    captionContainer.appendChild(explorer);
    this.explorer = explorer;
  }

  enterExploreMode() {
    this.stop();
    this.animationMode = false;
    this.showAllFull();
    this.cy.fit(50);
    this.focusNode(this.focusedNodeId || this.storySteps[0]?.nodeId || null);
  }

  focusNode(nodeId) {
    if (!nodeId || !this.cy) return;

    const node = this.cy.getElementById(nodeId);
    if (!node?.length) return;

    this.focusedNodeId = nodeId;
    this.updateExplorerForNode(nodeId);
    this.zoomToNode(node);
  }

  updateExplorerForNode(nodeId) {
    if (!this.explorer || !this.cy || !nodeId) return;

    const node = this.cy.getElementById(nodeId);
    if (!node?.length) return;

    const parents = node.incomers('node').toArray();
    const children = node.outgoers('node').toArray();
    const siblingIds = new Set();

    parents.forEach((parent) => {
      parent.outgoers('node').forEach((sibling) => {
        if (sibling.id() !== nodeId) {
          siblingIds.add(sibling.id());
        }
      });
    });

    const siblings = Array.from(siblingIds).map((id) => this.cy.getElementById(id)).filter((el) => el?.length);

    const currentStep = this.storySteps.find((step) => step.nodeId === nodeId);
    const pathEl = this.explorer.querySelector('.story-explorer-path');
    if (pathEl) {
      const pathBits = [...parents.map((parent) => parent.data('label')), node.data('label')];
      pathEl.textContent = currentStep?.connectsTo
        ? `${currentStep.connectsTo} -> ${currentStep.title}`
        : pathBits.join(' -> ');
    }

    this.renderExplorerGroup('parents', parents);
    this.renderExplorerGroup('children', children);
    this.renderExplorerGroup('siblings', siblings);
  }

  renderExplorerGroup(groupName, nodes) {
    const group = this.explorer?.querySelector(`[data-group="${groupName}"]`);
    const chipsContainer = group?.querySelector('.story-explorer-chips');
    if (!group || !chipsContainer) return;

    chipsContainer.innerHTML = '';

    if (!nodes.length) {
      const empty = document.createElement('span');
      empty.className = 'story-explorer-empty';
      empty.textContent = 'None';
      chipsContainer.appendChild(empty);
      return;
    }

    nodes.forEach((node) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'story-explorer-chip';
      button.textContent = node.data('label');
      button.addEventListener('click', () => {
        const stepIndex = this.storySteps.findIndex((step) => step.nodeId === node.id());
        if (stepIndex >= 0) {
          this.jumpToStep(stepIndex);
        } else {
          this.focusNode(node.id());
        }
      });
      chipsContainer.appendChild(button);
    });
  }

  async play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.shouldStop = false;
    this.animationMode = true;
    
    this.narrator.stop();
    this.clearEdgeAnimations();
    this.showAllDimmed();
    this.currentStep = -1;
    
    this.updatePlayButtonUI();

    // Play each step
    for (let i = 0; i < this.storySteps.length; i++) {
      if (this.shouldStop) break;

      // Wait while paused
      while (this.isPaused && !this.shouldStop) {
        await this.wait(100);
      }
      if (this.shouldStop) break;
      
      this.currentStep = i;
      await this.playStep(this.storySteps[i]);
      
      if (this.shouldStop) break;
      
      // Wait between steps
      if (i < this.storySteps.length - 1) {
        await this.waitWithPauseCheck(this.options.stepDuration);
      }
    }

    // Finished
    this.isPlaying = false;
    this.isPaused = false;
    this.animationMode = false;
    this.updatePlayButtonUI();
    
    // Zoom out to show all
    if (!this.shouldStop) {
      this.cy.animate({
        fit: { padding: 50 },
        duration: 800,
        easing: 'ease-out-cubic'
      });
    }
  }

  async playStep(step) {
    this.updateCaption(step);

    const visualPromise = this.animateStepVisuals(step);
    const narrationPromise = this.options.audioEnabled 
      ? this.narrateStep(step)
      : Promise.resolve();

    await Promise.all([visualPromise, narrationPromise]);
    this.cleanupStep(step);
  }

  async animateStepVisuals(step) {
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      
      node.removeClass('story-dimmed').addClass('story-active');
      await this.zoomToNode(node);
      await this.animateNodeIn(node);
      this.animateNodeGlow(node);
    }

    if (step.edges && step.edges.length > 0) {
      for (const edgeSpec of step.edges) {
        if (this.shouldStop) break;
        
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        
        if (edge.length) {
          edge.removeClass('story-dimmed').addClass('story-active');
          await this.animateEdgeIn(edge);
          this.animateEdgeFlow(edge);
          await this.wait(150);
        }
      }
    }

    // Ease out to show more context
    await this.wait(300);
    this.cy.animate({
      fit: { 
        eles: this.cy.elements().not('.story-dimmed'),
        padding: 80 
      },
      duration: 600,
      easing: 'ease-out-cubic'
    });
  }

  cleanupStep(step) {
    if (step.nodeId) {
      const node = this.cy.getElementById(step.nodeId);
      node.removeClass('story-active').addClass('story-complete');
    }
    
    if (step.edges) {
      for (const edgeSpec of step.edges) {
        const edge = this.cy.edges().filter(e => 
          e.source().id() === edgeSpec.from && e.target().id() === edgeSpec.to
        );
        
        if (edge.length === 0) continue;
        
        // Big flash effect when edge becomes solid
        edge.removeClass('story-active');
        edge.style({
          'width': 8,
          'opacity': 1,
          'line-style': 'solid',
          'line-color': '#b2dfdb',
          'target-arrow-color': '#b2dfdb'
        });
        
        // Animate to solid teal then settle
        setTimeout(() => {
          edge.style({
            'line-color': '#4db6ac',
            'target-arrow-color': '#4db6ac',
            'width': 5
          });
        }, 150);
        
        // Settle to final complete state
        setTimeout(() => {
          edge.addClass('story-complete');
          edge.style({
            'width': 3,
            'line-color': '#4db6ac',
            'target-arrow-color': '#4db6ac'
          });
        }, 400);
      }
    }

    this.clearEdgeAnimations();
    this.clearWordHighlights();
  }

  // ============================================
  // ANIMATIONS
  // ============================================

  zoomToNode(node) {
    return new Promise(resolve => {
      this.cy.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 500,
        easing: 'ease-out-cubic',
        complete: resolve
      });
    });
  }

  animateNodeIn(node) {
    return new Promise(resolve => {
      node.style('opacity', 0);
      
      anime({
        targets: {},
        duration: 500,
        easing: 'easeOutBack',
        update: (anim) => {
          const progress = anim.progress / 100;
          node.style('opacity', progress);
        },
        complete: resolve
      });
    });
  }

  animateNodeGlow(node) {
    // Simple static border highlight - no animated effects on nodes
    node.style({
      'border-width': 4,
      'border-color': '#4db6ac'
    });
  }

  animateEdgeIn(edge) {
    return new Promise(resolve => {
      anime({
        targets: {},
        duration: 400,
        easing: 'easeOutQuad',
        update: (anim) => {
          const progress = anim.progress / 100;
          edge.style('opacity', progress);
        },
        complete: resolve
      });
    });
  }

  animateEdgeFlow(edge) {
    // Simple dashed line animation - no particles
    let dashOffset = 0;
    const dashAnimation = setInterval(() => {
      dashOffset = (dashOffset + 3) % 24;
      edge.style('line-dash-offset', -dashOffset);
    }, 40);
    this.activeEdgeAnimations.push(dashAnimation);
  }

  clearEdgeAnimations() {
    this.activeEdgeAnimations.forEach(anim => {
      if (typeof anim === 'number') {
        clearInterval(anim);
      }
    });
    this.activeEdgeAnimations = [];
  }

  // ============================================
  // NARRATION
  // ============================================

  async narrateStep(step) {
    await this.wait(200);
    
    const captionContainer = document.getElementById(`${this.containerId}-caption`);
    if (!captionContainer) return;
    
    const titleEl = captionContainer.querySelector('.story-title');
    const textEl = captionContainer.querySelector('.story-text');
    const titleWords = titleEl ? titleEl.querySelectorAll('.word') : [];
    const textWords = textEl ? textEl.querySelectorAll('.word') : [];
    const allWords = [...titleWords, ...textWords];
    
    this.narrator.onWordHighlight = (wordIndex, word) => {
      allWords.forEach((el, i) => {
        el.classList.remove('current');
        if (i < wordIndex) {
          el.classList.add('spoken');
        }
      });
      
      if (wordIndex < allWords.length) {
        allWords[wordIndex].classList.add('current');
      } else {
        allWords.forEach(el => {
          el.classList.remove('current');
          el.classList.add('spoken');
        });
      }
    };
    
    // Use storyId from options for audio lookup
    await this.narrator.playStep(this.options.storyId, this.currentStep);
    
    allWords.forEach(el => {
      el.classList.remove('current');
      el.classList.add('spoken');
    });
    
    this.narrator.onWordHighlight = null;
  }

  // ============================================
  // UTILITIES
  // ============================================

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitWithPauseCheck(ms) {
    const interval = 100;
    let elapsed = 0;
    
    while (elapsed < ms) {
      if (this.shouldStop) return;
      while (this.isPaused && !this.shouldStop) {
        await this.wait(100);
      }
      await this.wait(interval);
      elapsed += interval;
    }
  }
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorytellingDiagram;
} else if (typeof window !== 'undefined') {
  window.StorytellingDiagram = StorytellingDiagram;
}
