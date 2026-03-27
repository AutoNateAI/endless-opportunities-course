# Endless Opportunities Course Update Plan

## Goal

Upgrade the `eo-course` experience so it feels more alive, more coherent, and more reliable:

1. Move narration to the `Juniper` voice.
2. Make every story/video feel interconnected, hierarchical, and traversable instead of just linearly revealed.
3. Fix activity submission reliability, including making True/False explanations optional where intended.
4. Rework the five-week plot into a stronger character-driven arc, borrowing the narrated-storyboard feel from `autonateai-workshop-portal`.
5. Keep the activities. The new story format should support them, not replace them.

---

## Current Course Spine

The current course already has a clear instructional sequence. The issue is not that it lacks structure. The issue is that the structure is mostly conceptual, while the emotional/narrative layer is thin.

### Week 0: `The Game We Live In`

Current purpose:

- The world is full of problems.
- Solving harder problems creates more value.
- AI changes the path to problem-solving.
- The key differentiator is asking better questions.

What it does well:

- Strong motivational framing.
- Clear entry into the course worldview.

What is missing:

- No recurring human stakes.
- The student is told the ideas, but not pulled through a memorable situation.

### Week 1: `The Art of Questions`

Current purpose:

- Surface thinkers stop early.
- Deep thinkers go six levels down.
- Real comprehension means explanation, connection, prediction, and transfer.

What it does well:

- Strong cognitive framework.
- Good branching concept in the story JSON.

What is missing:

- The student does not feel why going deeper matters in a lived context.
- The “deep vs surface” contrast is presented as a diagram, but not dramatized through people making choices.

### Week 2: `Data is Everywhere`

Current purpose:

- Data is all around us.
- Search and recommendation algorithms shape information flow.
- Data collection and pattern analysis reveal opportunity gaps.

What it does well:

- Good move from curiosity to evidence.
- Strong practical bridge into research and analysis.

What is missing:

- The world of “data” is still described, not embodied.
- The relationship between nodes exists in JSON, but the student experience still feels like a sequence of cards.

### Week 3: `Building Real Things`

Current purpose:

- AI lowers the barrier to creating tools.
- Building with AI is iterative conversation.
- Clear prompts produce better outputs.

What it does well:

- Strong progression from thought to execution.
- Good introduction to AI-assisted making.

What is missing:

- The emotional payoff is smaller than it should be.
- It needs a character moment where a student crosses from intimidated to capable.

### Week 4: `Problem Solver Portfolio`

Current purpose:

- Put questions, data, and building together.
- Choose a real problem.
- Build, deploy, test, present.

What it does well:

- Solid capstone structure.
- Clear final action.

What is missing:

- The ending is more instructional than cinematic.
- There is not enough sense of earned transformation across the full arc.

---

## Main Product Diagnosis

The course is currently built like a smart interactive diagram system with narration. It should become a narrated transformation experience with diagrams inside it.

Right now the dominant feeling is:

- “Here is the next concept.”

It needs to feel more like:

- “Here is what this means in the life of a real person, and here is how the concept changes what they can do next.”

---

## What The Codebase Is Telling Us

### 1. Voice system is still on `ballad` / `echo`

Evidence:

- `courses/endless-opportunities/week0-intro/audio/manifest.json` uses:
  - `ballad`
  - `echo`
- `defaultVoice` is currently `ballad`

Implication:

- Voice migration is not just a narration preference change.
- We need a full manifest/audio regeneration pass for all weeks, plus UI copy updates where voice labels are hardcoded.

### 2. The diagrams are hierarchical in layout, but not truly traversable in experience

Evidence:

- `courses/shared/js/interactive/storytelling-diagram.js` uses `DiagramUtils.LAYOUTS.hierarchical`
- Story steps are still played step-by-step in a narrated reveal system
- The caption layer literally says `Connects to: ...`, which is informative, but not a meaningful traversal mechanic

Implication:

- The student sees a hierarchy.
- The student does not yet explore a hierarchy.

Needed shift:

- Reveal the graph as a living map.
- Let users click from node to parent, child, sibling, cause, evidence, and consequence.
- Turn each story into a traversable concept world, not only a playback sequence.

### 3. True/False explanations are currently required by configuration almost everywhere

Evidence:

- `courses/shared/js/interactive/activities/true-false-activity.js` defaults `requireReasoning` to `true`
- Week pages hardcode many T/F activities with `requireReasoning: true`

Implication:

- The “optional explanation” requirement is not a one-off tweak.
- It is a content configuration problem and possibly a product decision problem.

Needed shift:

- Change the default posture to optional reasoning unless a lesson explicitly needs explanation scoring.
- Update the lessons so only selected T/F prompts require written reasoning.

### 4. Activity persistence is split across multiple systems

Evidence:

- `BaseActivity` submits through `ActivityTracker.completeActivity(...)`
- `QuizSystem` writes directly via `DataService.saveActivityAttempt(...)`
- `LessonStoryIntegration` has separate quiz completion logic
- `ActivityTracker` also has older type-specific submission paths

Implication:

- There are too many ways to submit/save activity state.
- That makes intermittent “some activities submit, some don’t” bugs highly plausible.
- Even when data saves, behavior can drift across components.

Recommendation:

- Unify activity submission around one persistence path.
- Treat `BaseActivity` + `ActivityTracker` as the canonical pipeline.
- Make quizzes and special activities conform to that path instead of bypassing it.

### 5. Source/build duplication is a maintenance risk

Evidence:

- Course content exists in both `courses/` and `dist/`
- The editable source is `courses/`, but the generated output also holds mirrored assets and pages

Implication:

- Course updates can drift if the team edits one side and forgets the other.
- Voice migrations and story redesigns should be scripted from source, not done manually in `dist/`.

---

## Recommended New Narrative Direction

## Core idea

Keep the existing five-week learning progression, but wrap it in a recurring student story.

The workshop portal proves the right pattern:

- recurring characters
- visual continuity
- narrated beats
- scene-by-scene progression
- emotional stakes tied to practical systems thinking

The EO course should adopt that same pattern, but adapted to this course’s themes:

- problem-solving
- asking better questions
- seeing data
- building tools
- solving a real problem in the student’s own environment

## Proposed cast

Use 2 to 3 recurring student characters plus one guide/observer voice.

Suggested roles:

- `The Overwhelmed Student`
  - Feels pressure, sees problems, does not yet know how to structure them.
- `The Curious Student`
  - Keeps asking better questions and pushes the group deeper.
- `The Builder Student`
  - Wants to make something useful and keeps turning ideas into experiments.
- `The Guide / Narrator`
  - Can be voiced by Juniper.
  - Calm, sharp, observant.
  - Not a lecturer. More of a story guide who frames transitions and insights.

Important note:

- The characters should not replace the student.
- They should externalize the student’s own confusion, ambition, fear, and momentum.

---

## Proposed Plot Upgrade Across Five Weeks

### Week 0: The World Is Full Of Problems

Narrative version:

- The characters notice daily frustrations around them.
- One person keeps complaining.
- Another starts asking: “What is the actual problem here?”
- They realize the world is basically a map of unsolved needs.
- End beat: AI changes the rules because now they can explore and build faster than before.

Emotional outcome:

- From passive frustration to possibility.

### Week 1: Asking Better Questions

Narrative version:

- The group picks a problem that seems simple on the surface.
- They disagree on what the real issue is.
- By going six levels deep, they discover the visible problem is only a symptom.
- The student sees that smarter questions change what counts as a solution.

Emotional outcome:

- From opinion to investigation.

### Week 2: Seeing The Hidden Data

Narrative version:

- The group starts collecting clues from reviews, posts, comments, local data, and observed behavior.
- They compare “what people say” versus “what people do.”
- Contradictions reveal the opportunity gap.
- This is where the course should feel most graph-like: claims, evidence, needs, gaps, audiences, causes.

Emotional outcome:

- From intuition to proof.

### Week 3: Building The First Real Tool

Narrative version:

- The group moves from analysis to making.
- The first build is messy.
- Their prompts are too vague.
- Through iteration, they learn that clear thinking creates clear building.
- The first working prototype becomes the turning point.

Emotional outcome:

- From intimidation to agency.

### Week 4: Shipping, Testing, Presenting

Narrative version:

- The group shows the tool to real people.
- Feedback reveals what they misunderstood.
- They revise.
- The course ends not with “you finished a class,” but with “you became someone who can notice, investigate, and build.”

Emotional outcome:

- From learner to problem solver.

---

## Structural Experience Recommendation

## Replace “interactive video” with `narrated storyboard + graph exploration + activity`

The strongest direction is not to remove interactivity. It is to rebalance it.

Recommended format for each lesson segment:

1. Short narrated storyboard sequence
   - 4 to 8 illustrated frames
   - Juniper narration
   - strong scene progression
   - recurring characters

2. Interconnected graph view
   - node map of the concept
   - parent/child/cause/evidence/action relationships
   - student can traverse the graph after the narration

3. Activities
   - comprehension
   - application
   - synthesis
   - keep the current activity model, but tune friction

This gives us:

- story for emotional engagement
- graph for systems understanding
- activities for retention and transfer

That is better than a plain “interactive video,” and better than a plain static diagram.

---

## Diagram / Traversal Redesign

Every concept story should move from a simple reveal model to a real navigable concept map.

### Required graph capabilities

- Show full relationship map in hierarchical layout
- Highlight current narrated path during playback
- Allow click-to-focus on any unlocked node
- Show:
  - parent
  - children
  - related sibling concepts
  - evidence / example nodes
  - action / implication nodes
- Preserve orientation so users do not get lost
- Offer a “story path” mode and an “explore map” mode

### Content model additions

Current story steps already have:

- `nodeId`
- `edges`
- `connectsTo`

Recommended additions:

- `relationType`
- `parentId`
- `childIds`
- `relatedIds`
- `evidenceIds`
- `exampleIds`
- `actionIds`
- `unlocks`
- `sceneKey`

This would let one piece of content power:

- narrated sequence
- graph exploration
- recap map
- activity references

---

## Voice Migration Plan: `Juniper`

### Current state

- Manifests and audio assets are still built around `ballad` and `echo`
- UI voice labels are written directly into lesson pages

### Needed work

1. Add `juniper` to the manifest generation pipeline
2. Decide whether Juniper replaces all voices or becomes the new default plus fallback
3. Regenerate narration assets for:
   - week0-intro
   - week1-questions
   - week2-data
   - week3-building
   - week4-portfolio
4. Update all lesson voice selectors and info badges
5. Normalize voice label text so it is not hardcoded per page

### Recommendation

Use `Juniper` as the new default story guide voice.

If multiple voices remain:

- Juniper = primary narration
- legacy voices = optional fallback during migration only

---

## Activity Reliability Fix Plan

## Problem

The codebase currently mixes:

- modern `BaseActivity` flow
- legacy tracker submission flows
- separate quiz persistence
- separate lesson-story quiz completion hooks

That is a reliability smell.

## Recommendation

### Phase 1: Submission audit

- Inventory every activity type in use per week
- Trace which submit path each one uses
- Confirm which ones save to `activityAttempts`
- Confirm which ones restore prior answers correctly

### Phase 2: One canonical save pipeline

- Standardize on:
  - activity component
  - `BaseActivity.submit()`
  - `ActivityTracker.completeActivity()`
  - `DataService.saveActivityAttempt()`

- Remove or deprecate alternate save routes where possible

### Phase 3: True/False behavior cleanup

- Make reasoning optional by default
- Only require explanation on explicitly chosen prompts
- Update scoring so optional reasoning can still provide enrichment without blocking submission

### Phase 4: Retry and visibility

- Add better in-UI feedback for:
  - saving
  - saved
  - saved offline
  - retrying

- Add one debug mode for internal testing that shows:
  - activity ID
  - submit path
  - save result
  - attempt count

---

## Content Production Model Inspired By `autonateai-workshop-portal`

The workshop portal has the right production pattern:

- explicit character anchors
- storyboard scene planning
- multiple visual beats per narrated unit
- a runtime manifest connecting audio and images

EO course should adopt the same approach.

### Recommended production assets

- `characters/`
  - anchor bios, image prompts, reference images
- `storyboards/`
  - week-by-week scene plans
- `audio/`
  - Juniper narration assets
- `story.json`
  - graph + lesson logic
- `runtime manifest`
  - maps narration beats to images and graph nodes

### Best implementation direction

For each weekly story:

- 1 narrated story module
- 1 graph map module
- 3 activity carousels
- 1 knowledge check

This preserves the current instructional scaffolding while improving tone and coherence.

---

## Suggested Build Order

### Phase A: Stabilize

- Audit and fix activity submission path
- Make True/False explanation optional where intended
- Clean up restoration and completion state

### Phase B: Voice

- Add Juniper support
- regenerate manifests
- regenerate audio
- update lesson UI labels

### Phase C: Story architecture

- define recurring characters
- write five-week narrative beats
- map each current concept to a story event
- decide which existing stories stay, merge, or split

### Phase D: New media format

- storyboard-driven narrated sequences
- graph traversal mode
- bridge storyboard scenes to graph nodes

### Phase E: Pilot one week

Best pilot:

- `week1-questions`

Why:

- It already has the strongest conceptual branching.
- It is a good test for turning “six levels deep” into a traversable graph plus a character story.
- It is central enough to define the rest of the tone.

### Phase F: Full rollout

- week0
- week1
- week2
- week3
- week4

---

## Concrete Deliverables

### Product deliverables

- Revised five-week narrative outline
- Character bible
- Storyboard spec for each week
- Traversable graph spec
- Updated voice strategy

### Engineering deliverables

- Juniper voice integration
- unified activity persistence path
- T/F optional reasoning update
- story/graph data model extension
- storyboard runtime support

### Content deliverables

- new narration scripts
- image prompts and generated frames
- updated activity copy where needed
- revised capstone framing

---

## Recommended Immediate Next Steps

1. Approve the new course direction:
   - narrated storyboard + traversable graph + activities

2. Start with a technical cleanup sprint:
   - unify submissions
   - fix T/F explanation behavior
   - prepare Juniper support

3. Build one complete vertical slice in `week1-questions`:
   - new character-driven narration
   - storyboard frames
   - Juniper voice
   - traversable hierarchy
   - existing activities retained but tuned

4. Review that slice before converting all five weeks

---

## Recommendation Summary

Yes, each interactive video can become a series of narrated images.

But the best version is:

- narrated images for emotional storytelling
- a live traversable graph for systems understanding
- activities for proof of comprehension

That combination is stronger than the current diagram-first flow, and stronger than replacing everything with a passive video.

It preserves what is already valuable in the course while making the experience more memorable, more human, and more dependable.
