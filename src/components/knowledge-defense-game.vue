<template>
  <main class="knowledge-defense-shell">
    <section v-if="state.status === 'ready'" class="setup-screen">
      <div class="setup-copy">
        <p class="kicker">小二到小六問答塔防</p>
        <h1>知識守護隊</h1>
        <p class="setup-text">
          答題取得能量，建造原創知識塔，守住右側的知識核心。現在題庫涵蓋小一到小六、上下學期、期中期末與五科。
        </p>
      </div>

      <div class="grade-picker" aria-label="選擇年級">
        <button
          v-for="grade in gradeConfigs"
          :key="grade.id"
          class="grade-card"
          :class="{ active: state.grade === grade.id }"
          type="button"
          @click="selectGrade(grade.id)"
        >
          <span>{{ grade.label }}</span>
          <strong>{{ grade.stageName }}</strong>
          <small>{{ grade.targetWaves }} 波挑戰</small>
        </button>
      </div>

      <div class="setup-controls" aria-label="題庫條件">
        <div class="setup-control">
          <span>學期</span>
          <button
            v-for="term in termOptions"
            :key="term.id"
            type="button"
            :class="{ active: quizFilter.term === term.id }"
            @click="setTerm(term.id)"
          >
            {{ term.label }}
          </button>
        </div>
        <div class="setup-control">
          <span>考別</span>
          <button
            v-for="exam in examOptions"
            :key="exam.id"
            type="button"
            :class="{ active: quizFilter.exam === exam.id }"
            @click="setExam(exam.id)"
          >
            {{ exam.label }}
          </button>
        </div>
        <div class="setup-control subjects">
          <span>科目</span>
          <button
            v-for="subject in subjectFilterOptions"
            :key="subject.id"
            type="button"
            :class="{ active: quizFilter.subject === subject.id }"
            @click="setSubject(subject.id)"
          >
            {{ subject.label }}
          </button>
        </div>
      </div>

      <p class="bank-count">本次條件 {{ currentQuestionCount }} 題 / 題庫總量 {{ totalQuestionCount }} 題</p>

      <button class="primary-action" type="button" @click="startRun">開始守護</button>
    </section>

    <section class="game-layout" :class="{ 'with-setup': state.status === 'ready' }">
      <div class="battle-card">
        <header class="top-hud">
          <div>
            <span class="eyebrow">{{ state.config.label }} / {{ state.config.title }}</span>
            <strong>{{ statusLabel }}</strong>
          </div>
          <div class="hud-metrics">
            <span>能量 {{ state.energy }}</span>
            <span>波次 {{ state.wave }} / {{ state.targetWaves }}</span>
            <span>分數 {{ state.score }}</span>
            <button class="sound-button" type="button" :aria-pressed="soundEnabled" @click="toggleSound">
              {{ soundEnabled ? '音樂開' : '音樂關' }}
            </button>
          </div>
        </header>

        <div class="meter-row">
          <div class="meter">
            <span>核心</span>
            <div class="meter-track"><i :style="{ width: `${corePercent}%` }"></i></div>
          </div>
          <div class="meter">
            <span>進度</span>
            <div class="meter-track wave"><i :style="{ width: `${wavePercent}%` }"></i></div>
          </div>
        </div>

        <div class="battlefield" aria-label="知識塔防 3D 戰場">
          <div ref="battle3dHost" class="battle-canvas" role="img" aria-label="原創低多邊形 3D 知識塔防戰場">
            <span class="scene-chip">原創 3D 幾何戰場</span>
            <div v-if="state.lastAnswer" class="field-feedback" :class="{ correct: state.lastAnswer.correct }">
              <strong>{{ state.lastAnswer.correct ? '答對，能量提升' : `正解：${state.lastAnswer.correctAnswer}` }}</strong>
              <span>{{ state.lastAnswer.correct ? state.lastAnswer.explanation : `提示：${state.lastAnswer.hint}` }}</span>
            </div>
          </div>

          <div v-if="state.status === 'won' || state.status === 'lost'" class="result-layer">
            <div class="result-panel">
              <span>{{ state.status === 'won' ? '守護成功' : '核心失守' }}</span>
              <strong>{{ state.status === 'won' ? '知識核心穩定了' : '重新調整塔位再挑戰' }}</strong>
              <button class="primary-action compact" type="button" @click="resetGame(state.grade)">再玩一次</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="control-panel" aria-label="問答與建塔面板">
        <section class="quiz-card">
          <div class="card-heading">
            <span :style="{ background: currentSubject.color }">{{ currentSubject.label }}</span>
            <strong>{{ currentQuestionMeta }} / 第 {{ state.questionCursor + 1 }} 題</strong>
          </div>
          <p class="question-text">{{ state.currentQuestion.prompt }}</p>
          <div class="answer-grid">
            <button
              v-for="(option, index) in state.currentQuestion.options"
              :key="option"
              class="answer-button"
              type="button"
              :disabled="state.status === 'won' || state.status === 'lost'"
              @click="chooseAnswer(index)"
            >
              <span>{{ optionLabels[index] }}</span>
              {{ option }}
            </button>
          </div>
          <div v-if="state.lastAnswer" class="answer-result" :class="{ correct: state.lastAnswer.correct }">
            <strong>{{ state.lastAnswer.correct ? `+${state.lastAnswer.energyDelta} 能量` : `+${state.lastAnswer.energyDelta} 補給` }}</strong>
            <span v-if="!state.lastAnswer.correct">正確答案：{{ state.lastAnswer.correctAnswer }}</span>
            <span>解題：{{ state.lastAnswer.explanation }}</span>
            <span>提示：{{ state.lastAnswer.hint }}</span>
          </div>
        </section>

        <section class="tower-card">
          <div class="card-heading">
            <span>建塔</span>
            <strong>{{ selectedTower.name }}</strong>
          </div>
          <div class="tower-list">
            <button
              v-for="tower in towerTypes"
              :key="tower.id"
              class="tower-button"
              :class="{ active: selectedTowerType === tower.id }"
              type="button"
              @click="selectedTowerType = tower.id"
            >
              <i :style="{ background: tower.color }"></i>
              <span>
                <strong>{{ tower.shortName }}</strong>
                <small>{{ tower.cost }} 能量 / {{ tower.role }}</small>
              </span>
            </button>
          </div>
          <button class="pulse-button" type="button" :disabled="!canPulse" @click="triggerFocusPulse">全域聚焦 88</button>
        </section>

        <section class="progress-card">
          <div class="card-heading">
            <span>學習</span>
            <strong>本局掌握度</strong>
          </div>
          <div class="subject-bars">
            <div v-for="subject in subjectEntries" :key="subject.id" class="subject-row">
              <span>{{ subject.label }}</span>
              <div><i :style="{ width: `${subject.accuracy}%`, background: subject.color }"></i></div>
              <strong>{{ subject.total === 0 ? '-' : `${subject.accuracy}%` }}</strong>
            </div>
          </div>
          <div class="commercial-note">
            <strong>家長摘要</strong>
            <span>本版只保存本局資料，適合後續接訂閱題庫、錯題複習與班級報表。</span>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  DEFAULT_QUIZ_FILTER,
  EXAM_OPTIONS,
  GRADE_CONFIGS,
  QUESTION_BANK,
  SUBJECTS,
  SUBJECT_FILTER_OPTIONS,
  TERM_OPTIONS,
  TOWER_TYPES,
  getTowerType,
  questionsForSelection,
  type ExamId,
  type GradeId,
  type QuizFilter,
  type SubjectId,
  type SubjectFilter,
  type TermId,
  type TowerTypeId,
} from '../knowledge-defense/content';
import {
  accuracy,
  answerQuestion,
  buildTower,
  createKnowledgeGameState,
  getTowerAtSlot,
  startGame,
  tickGame,
  upgradeTower,
  useFocusPulse,
} from '../knowledge-defense/engine';
import type { ShotEffect } from '../knowledge-defense/engine';
import { KnowledgeDefenseAudio } from '../knowledge-defense/audio';
import { KnowledgeDefenseThreeScene } from '../knowledge-defense/three-scene';

const optionLabels = ['A', 'B', 'C', 'D'];
const gradeConfigs = GRADE_CONFIGS;
const towerTypes = TOWER_TYPES;
const termOptions = TERM_OPTIONS;
const examOptions = EXAM_OPTIONS;
const subjectFilterOptions = SUBJECT_FILTER_OPTIONS;
const quizFilter = reactive<QuizFilter>({ ...DEFAULT_QUIZ_FILTER });
const state = reactive(createKnowledgeGameState(1, quizFilter));
const selectedTowerType = ref<TowerTypeId>('number');
const soundEnabled = ref(true);
const battle3dHost = ref<HTMLElement | null>(null);
let threeScene: KnowledgeDefenseThreeScene | null = null;
let audio: KnowledgeDefenseAudio | null = null;
const heardEffectIds = new Set<number>();
let animationFrame = 0;
let lastFrame = 0;

const statusLabel = computed(() => {
  if (state.status === 'ready') return '部署階段';
  if (state.status === 'won') return '守護成功';
  if (state.status === 'lost') return '核心失守';
  if (state.spawnQueue > 0) return '敵群接近中';
  return state.nextWaveIn < 5 ? '下一波準備中' : '穩定防守中';
});

const corePercent = computed(() => Math.round((state.coreHp / state.maxCoreHp) * 100));
const wavePercent = computed(() => Math.min(100, Math.round((state.wave / state.targetWaves) * 100)));
const selectedTower = computed(() => getTowerType(selectedTowerType.value));
const canPulse = computed(() => state.energy >= 88 && state.status === 'running' && state.enemies.length > 0);

const currentSubject = computed(() => SUBJECTS[state.currentQuestion.subject]);
const currentQuestionMeta = computed(() => {
  const term = termOptions.find((item) => item.id === state.currentQuestion.term)?.label ?? '綜合';
  const exam = examOptions.find((item) => item.id === state.currentQuestion.exam)?.label ?? '練習';
  return `${term}${exam}${state.currentQuestion.difficulty ? ` ${state.currentQuestion.difficulty}` : ''}`;
});
const currentQuestionCount = computed(() => questionsForSelection(state.grade, quizFilter).length);
const totalQuestionCount = computed(() => QUESTION_BANK.length);

const subjectEntries = computed(() =>
  (Object.keys(SUBJECTS) as SubjectId[]).map((id) => ({
    id,
    label: SUBJECTS[id].label,
    color: SUBJECTS[id].color,
    total: state.stats[id].total,
    accuracy: accuracy(state.stats[id]),
  })),
);

function selectGrade(grade: GradeId): void {
  resetGame(grade);
}

function setTerm(term: TermId): void {
  quizFilter.term = term;
  resetGame(state.grade);
}

function setExam(exam: ExamId): void {
  quizFilter.exam = exam;
  resetGame(state.grade);
}

function setSubject(subject: SubjectFilter): void {
  quizFilter.subject = subject;
  resetGame(state.grade);
}

function startRun(): void {
  void audio?.ensureStarted();
  startGame(state);
}

function chooseAnswer(index: number): void {
  void audio?.ensureStarted();
  if (state.status === 'ready') {
    startGame(state);
  }
  if (state.status !== 'running') return;
  const result = answerQuestion(state, index);
  audio?.playAnswer(result.correct);
}

function onSlotClick(slotId: string): void {
  void audio?.ensureStarted();
  const tower = getTowerAtSlot(state, slotId);
  if (tower) {
    const upgraded = upgradeTower(state, slotId);
    if (upgraded) audio?.playBuild(true);
    return;
  }
  const built = buildTower(state, slotId, selectedTowerType.value);
  if (built) audio?.playBuild(false);
}

function triggerFocusPulse(): void {
  void audio?.ensureStarted();
  const used = useFocusPulse(state);
  if (used) audio?.playFocusPulse();
}

function toggleSound(): void {
  soundEnabled.value = !soundEnabled.value;
  if (!audio) return;
  audio.setEnabled(soundEnabled.value);
  if (soundEnabled.value) {
    void audio.ensureStarted();
  }
}

function resetGame(grade: GradeId): void {
  Object.assign(state, createKnowledgeGameState(grade, quizFilter));
  selectedTowerType.value = 'number';
  heardEffectIds.clear();
  lastFrame = 0;
}

onMounted(() => {
  audio = new KnowledgeDefenseAudio();
  audio.setEnabled(soundEnabled.value);
  if (battle3dHost.value) {
    threeScene = new KnowledgeDefenseThreeScene(battle3dHost.value, onSlotClick);
  }

  const loop = (time: number) => {
    if (lastFrame === 0) lastFrame = time;
    tickGame(state, (time - lastFrame) / 1000);
    playNewAttackEffects(state.effects);
    audio?.tick(state.status);
    threeScene?.render(state, selectedTowerType.value);
    lastFrame = time;
    animationFrame = requestAnimationFrame(loop);
  };
  animationFrame = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  threeScene?.dispose();
  audio?.dispose();
  threeScene = null;
  audio = null;
});

function playNewAttackEffects(effects: ShotEffect[]): void {
  for (const effect of effects) {
    if (heardEffectIds.has(effect.id)) continue;
    heardEffectIds.add(effect.id);
    audio?.playShot(effect);
  }
}
</script>

<style scoped>
.knowledge-defense-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 12%, rgba(250, 204, 21, 0.22), transparent 28%),
    radial-gradient(circle at 86% 18%, rgba(20, 184, 166, 0.22), transparent 26%),
    linear-gradient(135deg, #102a43 0%, #0f172a 48%, #111827 100%);
  color: #0f172a;
  display: grid;
  place-items: stretch;
  padding: 18px;
}

.setup-screen {
  position: fixed;
  inset: 18px;
  z-index: 5;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 24px;
  padding: 26px;
  color: #f8fafc;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.52), rgba(15, 23, 42, 0.88)),
    radial-gradient(circle at center, rgba(34, 197, 94, 0.18), transparent 42%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  backdrop-filter: blur(14px);
}

.setup-copy {
  max-width: 760px;
  text-align: center;
}

.kicker,
.eyebrow {
  margin: 0;
  color: #bef264;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
}

.setup-copy h1 {
  margin: 8px 0;
  font-size: clamp(2.4rem, 6vw, 5.2rem);
  line-height: 0.95;
  letter-spacing: 0;
}

.setup-text {
  margin: 0 auto;
  max-width: 620px;
  color: #dbeafe;
  font-size: 1.08rem;
  line-height: 1.7;
}

.grade-picker {
  display: grid;
  grid-template-columns: repeat(6, minmax(104px, 1fr));
  gap: 12px;
  width: min(980px, 100%);
}

.grade-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border-radius: 8px;
  min-height: 118px;
  display: grid;
  align-content: center;
  gap: 8px;
  cursor: pointer;
}

.grade-card.active {
  background: #fef3c7;
  color: #78350f;
  border-color: #facc15;
  box-shadow: 0 16px 34px rgba(250, 204, 21, 0.22);
}

.grade-card span {
  font-size: 1.8rem;
  font-weight: 900;
}

.grade-card strong,
.grade-card small {
  display: block;
}

.setup-controls {
  display: grid;
  gap: 10px;
  width: min(980px, 100%);
}

.setup-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.setup-control span,
.bank-count {
  color: #dbeafe;
  font-weight: 900;
}

.setup-control button {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.11);
  color: #f8fafc;
  font-weight: 900;
  cursor: pointer;
}

.setup-control button.active {
  background: #dcfce7;
  color: #14532d;
  border-color: #86efac;
}

.bank-count {
  margin: -8px 0 0;
  font-size: 0.95rem;
}

.primary-action,
.pulse-button {
  border: 0;
  border-radius: 8px;
  padding: 14px 24px;
  background: #f97316;
  color: white;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(249, 115, 22, 0.28);
}

.primary-action.compact {
  padding: 11px 18px;
}

.game-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 16px;
  min-height: calc(100vh - 36px);
}

.game-layout.with-setup {
  filter: saturate(0.75) brightness(0.82);
}

.control-panel > section {
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 12px;
  box-shadow: 0 22px 50px rgba(2, 6, 23, 0.22);
}

.battle-card {
  padding: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
}

.top-hud,
.meter-row {
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.88);
  box-shadow: 0 12px 26px rgba(2, 6, 23, 0.14);
}

.top-hud,
.meter-row,
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.top-hud strong,
.card-heading strong {
  display: block;
  font-size: 1.05rem;
}

.hud-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hud-metrics span,
.card-heading span,
.sound-button {
  border-radius: 999px;
  background: #e2e8f0;
  color: #0f172a;
  padding: 7px 10px;
  font-weight: 800;
  font-size: 0.82rem;
}

.sound-button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ecfeff;
  color: #0f766e;
  cursor: pointer;
}

.sound-button[aria-pressed='false'] {
  background: #f1f5f9;
  color: #64748b;
}

.meter-row {
  align-items: stretch;
}

.meter {
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  color: #334155;
}

.meter-track {
  height: 12px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.meter-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ef4444, #f97316, #22c55e);
}

.meter-track.wave i {
  background: linear-gradient(90deg, #3b82f6, #14b8a6);
}

.battlefield {
  position: relative;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #bfe3ff;
  box-shadow: 0 24px 52px rgba(2, 6, 23, 0.28);
}

.battle-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 540px;
  display: block;
}

.battle-canvas :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

.scene-chip {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 1;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 900;
  pointer-events: none;
}

.field-feedback {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 1;
  display: grid;
  gap: 4px;
  max-width: min(430px, calc(100% - 28px));
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(127, 29, 29, 0.82);
  color: #fff7ed;
  font-weight: 850;
  line-height: 1.35;
  pointer-events: none;
}

.field-feedback.correct {
  background: rgba(6, 95, 70, 0.82);
  color: #ecfdf5;
}

.field-feedback strong {
  font-size: 0.98rem;
}

.field-feedback span {
  font-size: 0.86rem;
}

.result-layer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.38);
}

.result-panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  min-width: 280px;
  background: #f8fafc;
  color: #0f172a;
  border-radius: 12px;
  box-shadow: 0 24px 56px rgba(2, 6, 23, 0.28);
}

.result-panel span {
  color: #0f766e;
  font-weight: 900;
}

.result-panel strong {
  font-size: 1.35rem;
}

.control-panel {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
  min-width: 0;
  overflow: auto;
}

.control-panel > section {
  padding: 14px;
}

.quiz-card,
.tower-card,
.progress-card {
  display: grid;
  gap: 12px;
}

.question-text {
  margin: 0;
  min-height: 76px;
  display: grid;
  align-items: center;
  color: #111827;
  font-size: 1.28rem;
  font-weight: 900;
  line-height: 1.45;
}

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.answer-button,
.tower-button,
.pulse-button {
  min-height: 52px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-weight: 850;
  text-align: left;
  cursor: pointer;
}

.answer-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.answer-button span {
  flex: 0 0 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: white;
  background: #0f766e;
}

.answer-button:hover,
.tower-button:hover {
  border-color: #f97316;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.answer-button:disabled,
.pulse-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.answer-result {
  display: grid;
  gap: 4px;
  min-height: 58px;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff7ed;
  color: #9a3412;
  line-height: 1.4;
}

.answer-result.correct {
  background: #ecfdf5;
  color: #047857;
}

.tower-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tower-button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
}

.tower-button.active {
  border-color: #0f766e;
  background: #ecfdf5;
}

.tower-button i {
  width: 16px;
  height: 34px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.tower-button span {
  display: grid;
  gap: 2px;
}

.tower-button small {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 800;
}

.pulse-button {
  width: 100%;
  text-align: center;
  background: #0f766e;
  color: #ffffff;
  border-color: #0f766e;
  box-shadow: none;
}

.subject-bars {
  display: grid;
  gap: 10px;
}

.subject-row {
  display: grid;
  grid-template-columns: 42px 1fr 48px;
  align-items: center;
  gap: 9px;
  font-weight: 900;
}

.subject-row div {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.subject-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.subject-row strong {
  text-align: right;
  color: #334155;
}

.commercial-note {
  display: grid;
  gap: 5px;
  padding: 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  line-height: 1.45;
}

.commercial-note strong {
  font-size: 0.92rem;
}

@media (max-width: 1100px) {
  .game-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(520px, 58vh) auto;
    overflow: auto;
  }

  .control-panel {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .progress-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .knowledge-defense-shell {
    padding: 10px;
  }

  .setup-screen {
    inset: 10px;
    padding: 18px;
    overflow: auto;
  }

  .grade-picker,
  .control-panel,
  .tower-list,
  .answer-grid {
    grid-template-columns: 1fr;
  }

  .setup-control {
    justify-content: start;
  }

  .game-layout {
    min-height: calc(100vh - 20px);
    grid-template-rows: minmax(600px, 70vh) auto;
  }

  .battle-card {
    padding: 0;
  }

  .top-hud,
  .meter-row {
    display: grid;
  }

  .hud-metrics {
    justify-content: start;
  }

  .battle-canvas {
    min-height: 420px;
  }

  .scene-chip {
    display: none;
  }

  .field-feedback {
    left: 10px;
    right: 10px;
    bottom: 10px;
    max-width: none;
  }

  .question-text {
    font-size: 1.08rem;
    min-height: auto;
  }
}
</style>
