<template>
  <main class="knowledge-defense-shell">
    <section v-if="state.status === 'ready'" class="setup-screen">
      <div class="setup-copy">
        <p class="kicker">小一到小六問答塔防</p>
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
      <div class="bank-breakdown" aria-label="各科題庫分布">
        <span v-for="subject in setupSubjectCounts" :key="subject.id" :class="{ active: quizFilter.subject === 'all' || quizFilter.subject === subject.id }">
          <i :style="{ background: subject.color }"></i>
          <strong>{{ subject.label }}</strong>
          <em>{{ subject.count }} 題</em>
        </span>
      </div>
      <div class="ability-breakdown" aria-label="能力覆蓋">
        <span v-for="ability in setupAbilityCounts" :key="ability.id">
          <i :style="{ background: ability.color }"></i>
          <strong>{{ ability.label }}</strong>
          <em>{{ ability.count }} 題</em>
        </span>
      </div>

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
            <span>連擊 {{ state.combo }}</span>
            <span>答題 {{ totalCorrect }} / {{ runCorrectGoal }}</span>
            <span>複習 {{ reviewCount }}</span>
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
          <div class="meter compact-meter">
            <span>{{ masteryLabel }}</span>
            <div class="meter-track mastery"><i :style="{ width: `${state.masteryFocus}%` }"></i></div>
          </div>
          <div class="meter compact-meter">
            <span>{{ pressureLabel }}</span>
            <div class="meter-track pressure"><i :style="{ width: `${state.pressure}%` }"></i></div>
          </div>
        </div>

        <div class="wave-intel">
          <span>下一波</span>
          <strong>{{ nextWaveLabel }}</strong>
          <small>{{ nextWavePreview }}</small>
        </div>

        <div class="battlefield" aria-label="知識塔防 3D 戰場">
          <div ref="battle3dHost" class="battle-canvas" role="img" aria-label="原創低多邊形 3D 知識塔防戰場">
            <span class="scene-chip">原創 3D 幾何戰場</span>
            <div v-if="state.learningEvents.length > 0" class="event-stack" aria-live="polite">
              <div
                v-for="event in state.learningEvents"
                :key="event.id"
                class="event-toast"
                :class="event.tone"
              >
                <strong>{{ event.title }}</strong>
                <span>{{ event.detail }}</span>
              </div>
            </div>
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
            <em v-if="currentQuestionIsReview">錯題複習</em>
          </div>
          <p class="question-text">{{ state.currentQuestion.prompt }}</p>
          <div class="hint-strip" :class="{ open: currentHintVisible }">
            <button type="button" :disabled="currentHintVisible || state.energy < 5" @click="revealHint">提示 -5 能量</button>
            <span v-if="currentHintVisible">{{ currentQuestionHint }}</span>
            <span v-else>先自己想，再需要時打開提示。</span>
          </div>
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
          <div class="tower-insight" :class="{ boosted: selectedTowerBoostSeconds > 0 }">
            <strong>{{ SUBJECTS[selectedTower.subject].label }} / {{ selectedTower.role }}</strong>
            <span>{{ selectedTower.strategy }}</span>
            <small>{{ selectedTower.upgradeHint }}</small>
            <em v-if="selectedTowerBoostSeconds > 0">共鳴中 {{ selectedTowerBoostSeconds }} 秒</em>
          </div>
          <div class="target-mode-panel" aria-label="目標策略">
            <strong>目標策略：{{ selectedTargetModeOption.label }}</strong>
            <div class="target-mode-list">
              <button
                v-for="mode in targetModeOptions"
                :key="mode.id"
                type="button"
                :class="{ active: selectedTargetMode === mode.id }"
                @click="selectedTargetMode = mode.id"
              >
                {{ mode.shortLabel }}
              </button>
            </div>
            <span>{{ selectedTargetModeOption.description }}</span>
          </div>
          <button class="pulse-button" type="button" :disabled="!canPulse" @click="triggerFocusPulse">全域聚焦 88</button>
        </section>

        <section class="progress-card">
          <div class="card-heading">
            <span>學習</span>
            <strong>本局掌握度</strong>
          </div>
          <div class="run-progress-card" aria-label="本局答題進度">
            <div class="run-progress-heading">
              <span>本局答題進度</span>
              <strong>{{ totalCorrect }} / {{ runCorrectGoal }}</strong>
            </div>
            <div class="run-progress-track"><i :style="{ width: `${runCorrectPercent}%` }"></i></div>
            <div class="run-progress-detail">
              <span>還差 {{ remainingCorrect }} 題達成本局目標</span>
              <strong>{{ totalAnswered === 0 ? '正確率 -' : `正確率 ${liveAccuracy}%` }}</strong>
            </div>
            <small>本次條件題庫已看過 {{ seenQuestionCount }} / {{ currentQuestionCount }} 題</small>
          </div>
          <div class="weakness-card" :class="{ clear: !weaknessHasTarget }" aria-label="弱點回補">
            <div class="weakness-heading">
              <span>弱點回補</span>
              <strong :style="{ color: weaknessColor }">{{ weaknessLabel }}</strong>
            </div>
            <div class="weakness-track"><i :style="{ width: `${weaknessRepairPercent}%`, background: weaknessColor }"></i></div>
            <div class="weakness-detail">
              <span>{{ weaknessHasTarget ? `回補 ${weaknessRepaired} / ${weaknessRepairGoal}` : '無待修復錯題' }}</span>
              <strong>{{ weaknessHasTarget ? `${weaknessOpenCount} 題待修復` : '穩定' }}</strong>
            </div>
            <small>{{ weaknessGuideText }}</small>
          </div>
          <div class="subject-bars">
            <div v-for="subject in subjectEntries" :key="subject.id" class="subject-row">
              <span>{{ subject.label }}</span>
              <div><i :style="{ width: `${subject.accuracy}%`, background: subject.color }"></i></div>
              <strong>{{ subject.total === 0 ? '-' : `${subject.accuracy}%` }}</strong>
              <small>{{ subject.mistakes }} 錯 / {{ subject.reviewed }} 修復</small>
            </div>
          </div>
          <div v-if="activeBoostEntries.length > 0" class="boost-row">
            <span v-for="boost in activeBoostEntries" :key="boost.id" :style="{ borderColor: boost.color }">
              {{ boost.label }}共鳴 {{ boost.seconds }} 秒
            </span>
          </div>
          <div class="mission-list">
            <div v-for="mission in missionEntries" :key="mission.label" :class="{ done: mission.done }">
              <span>{{ mission.label }}</span>
              <strong>{{ mission.value }}</strong>
            </div>
          </div>
          <div class="commercial-note">
            <strong>家長摘要</strong>
            <span>本局使用 {{ state.hintsUsed }} 次提示，錯題會自動重排，適合後續接訂閱題庫、錯題複習與班級報表。</span>
          </div>
          <div class="history-note">
            <strong>最近戰績</strong>
            <span v-if="runHistory.length === 0">完成一局後會在這裡留下本機紀錄。</span>
            <span v-else>{{ latestRunSummary }}</span>
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
  TARGET_MODE_OPTIONS,
  TERM_OPTIONS,
  TOWER_TYPES,
  getTowerType,
  questionsForSelection,
  type ExamId,
  type GradeId,
  type QuizQuestion,
  type QuizFilter,
  type SubjectId,
  type SubjectFilter,
  type TermId,
  type TowerTargetMode,
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
  useQuestionHint,
  describeWavePreview,
} from '../knowledge-defense/engine';
import type { ShotEffect } from '../knowledge-defense/engine';
import { KnowledgeDefenseAudio } from '../knowledge-defense/audio';
import { KnowledgeDefenseThreeScene } from '../knowledge-defense/three-scene';

interface RunSummary {
  date: string;
  grade: GradeId;
  status: 'won' | 'lost';
  score: number;
  answered: number;
  correct: number;
  reviewed: number;
  hints: number;
}

type AbilityId = 'reading' | 'englishCommunication' | 'mathReasoning' | 'scienceInquiry' | 'socialJudgment';

const abilityCategories: Array<{ id: AbilityId; label: string; color: string }> = [
  { id: 'reading', label: '語文理解', color: '#ef4444' },
  { id: 'englishCommunication', label: '英語溝通', color: '#8b5cf6' },
  { id: 'mathReasoning', label: '數學解題', color: '#f59e0b' },
  { id: 'scienceInquiry', label: '科學探究', color: '#10b981' },
  { id: 'socialJudgment', label: '社會判讀', color: '#3b82f6' },
];

const optionLabels = ['A', 'B', 'C', 'D'];
const RUN_HISTORY_KEY = 'knowledge-defense-run-history-v1';
const gradeConfigs = GRADE_CONFIGS;
const towerTypes = TOWER_TYPES;
const targetModeOptions = TARGET_MODE_OPTIONS;
const termOptions = TERM_OPTIONS;
const examOptions = EXAM_OPTIONS;
const subjectFilterOptions = SUBJECT_FILTER_OPTIONS;
const quizFilter = reactive<QuizFilter>({ ...DEFAULT_QUIZ_FILTER });
const state = reactive(createKnowledgeGameState(1, quizFilter));
const selectedTowerType = ref<TowerTypeId>('number');
const selectedTargetMode = ref<TowerTargetMode>('front');
const soundEnabled = ref(true);
const battle3dHost = ref<HTMLElement | null>(null);
const runHistory = ref<RunSummary[]>([]);
let threeScene: KnowledgeDefenseThreeScene | null = null;
let audio: KnowledgeDefenseAudio | null = null;
const heardEffectIds = new Set<number>();
let animationFrame = 0;
let lastFrame = 0;
let heardWave = 0;
let savedResultStatus: 'won' | 'lost' | '' = '';

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
const selectedTargetModeOption = computed(
  () => targetModeOptions.find((mode) => mode.id === selectedTargetMode.value) ?? targetModeOptions[0],
);
const canPulse = computed(() => state.energy >= 88 && state.status === 'running' && state.enemies.length > 0);
const selectedTowerBoostSeconds = computed(() => Math.ceil(state.subjectBoosts[selectedTower.value.subject] ?? 0));
const reviewCount = computed(() => state.reviewQuestionIds.length);
const currentQuestionIsReview = computed(() => state.reviewQuestionIds.includes(state.currentQuestion.id));
const masteryLabel = computed(() => {
  if (state.masteryFocus >= 78) return '掌握穩定';
  if (state.masteryFocus >= 48) return '掌握累積';
  return '需要複習';
});
const pressureLabel = computed(() => {
  if (state.pressure >= 72) return '壓力偏高';
  if (state.pressure >= 36) return '壓力升高';
  return '壓力穩定';
});
const nextWaveLabel = computed(() => {
  if (state.status === 'ready') return '開始後第 1 波';
  if (state.wave >= state.targetWaves) return '最終清場';
  return `${Math.ceil(state.nextWaveIn)} 秒後第 ${state.wave + 1} 波`;
});
const nextWavePreview = computed(() => {
  const wave = Math.min(state.targetWaves, state.wave + 1);
  return describeWavePreview(wave, state.grade);
});
const currentHintVisible = computed(() => state.hintQuestionIds.includes(state.currentQuestion.id));
const currentQuestionHint = computed(() => state.currentQuestion.hint ?? state.currentQuestion.explanation);
const totalAnswered = computed(() => subjectEntries.value.reduce((sum, subject) => sum + subject.total, 0));
const totalCorrect = computed(() => (Object.keys(SUBJECTS) as SubjectId[]).reduce((sum, id) => sum + state.stats[id].correct, 0));
const totalReviewed = computed(() => (Object.keys(SUBJECTS) as SubjectId[]).reduce((sum, id) => sum + state.stats[id].reviewed, 0));
const runCorrectGoal = computed(() => 18 + state.grade * 2);
const reviewGoal = computed(() => Math.max(3, Math.floor(runCorrectGoal.value / 7)));
const runCorrectPercent = computed(() => Math.min(100, Math.round((totalCorrect.value / runCorrectGoal.value) * 100)));
const remainingCorrect = computed(() => Math.max(0, runCorrectGoal.value - totalCorrect.value));
const liveAccuracy = computed(() => (totalAnswered.value === 0 ? 0 : Math.round((totalCorrect.value / totalAnswered.value) * 100)));
const seenQuestionCount = computed(() => Math.min(totalAnswered.value, currentQuestionCount.value));
const weaknessEntry = computed(() => {
  const ranked = subjectEntries.value
    .filter((subject) => subject.mistakes > 0)
    .map((subject) => ({
      ...subject,
      openMistakes: Math.max(0, subject.mistakes - subject.reviewed),
    }))
    .sort((a, b) => b.openMistakes - a.openMistakes || b.mistakes - a.mistakes || a.accuracy - b.accuracy);
  return ranked[0];
});
const weaknessHasTarget = computed(() => Boolean(weaknessEntry.value));
const weaknessLabel = computed(() => weaknessEntry.value?.label ?? '目前穩定');
const weaknessColor = computed(() => weaknessEntry.value?.color ?? '#0f766e');
const weaknessOpenCount = computed(() => weaknessEntry.value?.openMistakes ?? 0);
const weaknessRepairGoal = computed(() => (weaknessEntry.value ? Math.max(1, Math.ceil(weaknessEntry.value.mistakes * 0.6)) : 1));
const weaknessRepaired = computed(() => Math.min(weaknessEntry.value?.reviewed ?? 0, weaknessRepairGoal.value));
const weaknessRepairPercent = computed(() => Math.min(100, Math.round((weaknessRepaired.value / weaknessRepairGoal.value) * 100)));
const weaknessGuideText = computed(() => {
  if (!weaknessEntry.value) return '目前沒有錯題，保持答題節奏。';
  if (weaknessOpenCount.value > 0) {
    return `${weaknessEntry.value.label}還有 ${weaknessOpenCount.value} 題待修復，遇到錯題複習標籤時先穩住。`;
  }
  return `${weaknessEntry.value.label}錯題已修復，下一步維持正確率。`;
});
const missionEntries = computed(() => [
  { label: `答對 ${runCorrectGoal.value} 題`, value: `${totalCorrect.value}/${runCorrectGoal.value}`, done: totalCorrect.value >= runCorrectGoal.value },
  { label: `修復 ${reviewGoal.value} 題錯題`, value: `${totalReviewed.value}/${reviewGoal.value}`, done: totalReviewed.value >= reviewGoal.value },
  { label: '核心保持 8+', value: `${state.coreHp}/12`, done: state.coreHp >= 8 },
]);
const latestRunSummary = computed(() => {
  const latest = runHistory.value[0];
  if (!latest) return '';
  const result = latest.status === 'won' ? '成功' : '再挑戰';
  const accuracyText = latest.answered === 0 ? '-' : `${Math.round((latest.correct / latest.answered) * 100)}%`;
  return `${result} / 小${latest.grade} / ${latest.score} 分 / 正確率 ${accuracyText} / 修復 ${latest.reviewed} 題`;
});

const currentSubject = computed(() => SUBJECTS[state.currentQuestion.subject]);
const currentQuestionMeta = computed(() => {
  const term = termOptions.find((item) => item.id === state.currentQuestion.term)?.label ?? '綜合';
  const exam = examOptions.find((item) => item.id === state.currentQuestion.exam)?.label ?? '練習';
  return `${term}${exam}${state.currentQuestion.difficulty ? ` ${state.currentQuestion.difficulty}` : ''}`;
});
const currentSelectionQuestions = computed(() => questionsForSelection(state.grade, quizFilter));
const currentQuestionCount = computed(() => currentSelectionQuestions.value.length);
const totalQuestionCount = computed(() => QUESTION_BANK.length);
const setupSubjectCounts = computed(() =>
  (Object.keys(SUBJECTS) as SubjectId[]).map((id) => ({
    id,
    label: SUBJECTS[id].label,
    color: SUBJECTS[id].color,
    count: questionsForSelection(state.grade, {
      term: quizFilter.term,
      exam: quizFilter.exam,
      subject: id,
    }).length,
  })),
);
const setupAbilityCounts = computed(() => {
  const counts = new Map<AbilityId, number>(abilityCategories.map((ability) => [ability.id, 0]));
  for (const question of currentSelectionQuestions.value) {
    const ability = abilityForQuestion(question);
    counts.set(ability, (counts.get(ability) ?? 0) + 1);
  }
  return abilityCategories
    .map((ability) => ({ ...ability, count: counts.get(ability.id) ?? 0 }))
    .filter((ability) => ability.count > 0);
});

const subjectEntries = computed(() =>
  (Object.keys(SUBJECTS) as SubjectId[]).map((id) => ({
    id,
    label: SUBJECTS[id].label,
    color: SUBJECTS[id].color,
    total: state.stats[id].total,
    accuracy: accuracy(state.stats[id]),
    mistakes: state.stats[id].mistakes,
    reviewed: state.stats[id].reviewed,
  })),
);

function abilityForQuestion(question: QuizQuestion): AbilityId {
  if (question.subject === 'english') return 'englishCommunication';
  if (question.subject === 'math') return 'mathReasoning';
  if (question.subject === 'science') return 'scienceInquiry';
  if (question.subject === 'social') return 'socialJudgment';
  return 'reading';
}
const activeBoostEntries = computed(() =>
  (Object.keys(SUBJECTS) as SubjectId[])
    .map((id) => ({
      id,
      label: SUBJECTS[id].label,
      color: SUBJECTS[id].color,
      seconds: Math.ceil(state.subjectBoosts[id] ?? 0),
    }))
    .filter((item) => item.seconds > 0),
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
  const built = buildTower(state, slotId, selectedTowerType.value, selectedTargetMode.value);
  if (built) audio?.playBuild(false);
}

function triggerFocusPulse(): void {
  void audio?.ensureStarted();
  const used = useFocusPulse(state);
  if (used) audio?.playFocusPulse();
}

function revealHint(): void {
  void audio?.ensureStarted();
  useQuestionHint(state);
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
  selectedTargetMode.value = 'front';
  heardEffectIds.clear();
  heardWave = 0;
  savedResultStatus = '';
  lastFrame = 0;
}

onMounted(() => {
  runHistory.value = loadRunHistory();
  audio = new KnowledgeDefenseAudio();
  audio.setEnabled(soundEnabled.value);
  if (battle3dHost.value) {
    threeScene = new KnowledgeDefenseThreeScene(battle3dHost.value, onSlotClick);
  }

  const loop = (time: number) => {
    if (lastFrame === 0) lastFrame = time;
    tickGame(state, (time - lastFrame) / 1000);
    playNewAttackEffects(state.effects);
    playWaveCue();
    saveCompletedRunIfNeeded();
    audio?.tick(state.status, state.pressure, state.combo);
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

function playWaveCue(): void {
  if (state.wave <= heardWave || state.status !== 'running') return;
  heardWave = state.wave;
  audio?.playWaveStart();
}

function saveCompletedRunIfNeeded(): void {
  if ((state.status !== 'won' && state.status !== 'lost') || savedResultStatus === state.status) return;
  savedResultStatus = state.status;
  const summary: RunSummary = {
    date: new Date().toISOString(),
    grade: state.grade,
    status: state.status,
    score: state.score,
    answered: totalAnswered.value,
    correct: totalCorrect.value,
    reviewed: totalReviewed.value,
    hints: state.hintsUsed,
  };
  runHistory.value = [summary, ...runHistory.value].slice(0, 8);
  try {
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runHistory.value));
  } catch {
    // Local storage can be disabled in private browsing; gameplay should continue.
  }
}

function loadRunHistory(): RunSummary[] {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
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
  gap: clamp(14px, 2vh, 24px);
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

.bank-breakdown {
  display: grid;
  grid-template-columns: repeat(5, minmax(112px, 1fr));
  gap: 8px;
  width: min(760px, 100%);
  margin-top: -12px;
}

.ability-breakdown {
  display: grid;
  grid-template-columns: repeat(5, minmax(112px, 1fr));
  gap: 8px;
  width: min(760px, 100%);
  margin-top: -8px;
}

.bank-breakdown span,
.ability-breakdown span {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(219, 234, 254, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 900;
  opacity: 0.74;
}

.bank-breakdown span.active {
  border-color: rgba(190, 242, 100, 0.48);
  background: rgba(22, 101, 52, 0.46);
  color: #f8fafc;
  opacity: 1;
}

.ability-breakdown span {
  border-color: rgba(191, 219, 254, 0.22);
  background: rgba(30, 41, 59, 0.48);
  opacity: 1;
}

.bank-breakdown i,
.ability-breakdown i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.bank-breakdown strong,
.bank-breakdown em,
.ability-breakdown strong,
.ability-breakdown em {
  min-width: 0;
  font-style: normal;
  white-space: nowrap;
}

.bank-breakdown strong,
.ability-breakdown strong {
  overflow: hidden;
  text-overflow: ellipsis;
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
  height: calc(100vh - 36px);
  min-height: 640px;
  overflow: hidden;
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
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  min-height: 0;
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

.card-heading em {
  justify-self: end;
  border-radius: 999px;
  padding: 6px 9px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 900;
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

.compact-meter {
  flex: 0.82;
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

.meter-track.mastery i {
  background: linear-gradient(90deg, #f59e0b, #22c55e);
}

.meter-track.pressure i {
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
}

.wave-intel {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.68);
  color: #f8fafc;
}

.wave-intel span,
.wave-intel strong {
  font-weight: 900;
}

.wave-intel span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 0.78rem;
}

.wave-intel small {
  color: #dbeafe;
  font-size: 0.82rem;
  font-weight: 850;
  text-align: right;
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

.event-stack {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 2;
  display: grid;
  gap: 8px;
  width: min(330px, calc(100% - 28px));
  pointer-events: none;
}

.event-toast {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 12px 26px rgba(2, 6, 23, 0.18);
  line-height: 1.3;
}

.event-toast.good {
  background: rgba(4, 120, 87, 0.82);
}

.event-toast.warn {
  background: rgba(154, 52, 18, 0.82);
}

.event-toast strong {
  font-size: 0.9rem;
}

.event-toast span {
  font-size: 0.78rem;
  font-weight: 800;
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
  max-height: 100%;
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

.hint-strip {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 8px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  line-height: 1.35;
}

.hint-strip.open {
  background: #eff6ff;
  color: #1e3a8a;
}

.hint-strip button {
  border: 0;
  border-radius: 8px;
  padding: 9px 10px;
  background: #0f766e;
  color: #ffffff;
  font-weight: 900;
  cursor: pointer;
}

.hint-strip button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.hint-strip span {
  font-size: 0.88rem;
  font-weight: 850;
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

.tower-insight {
  display: grid;
  gap: 5px;
  padding: 11px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  line-height: 1.35;
}

.tower-insight.boosted {
  border-color: #22c55e;
  background: #ecfdf5;
}

.tower-insight strong,
.tower-insight em {
  color: #0f766e;
  font-weight: 900;
}

.tower-insight span,
.tower-insight small {
  font-weight: 800;
}

.tower-insight small {
  color: #64748b;
}

.tower-insight em {
  font-style: normal;
}

.target-mode-panel {
  display: grid;
  gap: 8px;
  padding: 11px 12px;
  border-radius: 8px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  color: #134e4a;
  line-height: 1.35;
}

.target-mode-panel strong,
.target-mode-panel span {
  font-weight: 900;
}

.target-mode-panel span {
  color: #0f766e;
  font-size: 0.82rem;
}

.target-mode-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.target-mode-list button {
  min-height: 36px;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  background: #ffffff;
  color: #0f766e;
  font-weight: 900;
  cursor: pointer;
}

.target-mode-list button.active {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
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

.run-progress-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
}

.run-progress-heading,
.run-progress-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.run-progress-heading span,
.run-progress-detail span,
.run-progress-card small {
  min-width: 0;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1.35;
}

.run-progress-heading strong {
  color: #1d4ed8;
  font-size: 1.08rem;
  white-space: nowrap;
}

.run-progress-detail strong {
  color: #0f766e;
  font-size: 0.78rem;
  white-space: nowrap;
}

.run-progress-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #bfdbfe;
}

.run-progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #0f766e);
}

.weakness-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #7c2d12;
}

.weakness-card.clear {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #14532d;
}

.weakness-heading,
.weakness-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.weakness-heading span,
.weakness-detail span,
.weakness-card small {
  min-width: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1.35;
}

.weakness-heading strong {
  font-size: 1rem;
  white-space: nowrap;
}

.weakness-detail strong {
  color: #9a3412;
  font-size: 0.78rem;
  white-space: nowrap;
}

.weakness-card.clear .weakness-detail strong {
  color: #15803d;
}

.weakness-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffedd5;
}

.weakness-card.clear .weakness-track {
  background: #dcfce7;
}

.weakness-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.subject-row {
  display: grid;
  grid-template-columns: 42px 1fr 52px;
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

.subject-row small {
  grid-column: 2 / 4;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 850;
}

.boost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.boost-row span {
  border: 1px solid;
  border-radius: 999px;
  padding: 6px 8px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 900;
}

.mission-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
}

.mission-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-weight: 900;
}

.mission-list div.done {
  background: #ecfdf5;
  border-color: #86efac;
  color: #047857;
}

.mission-list strong {
  white-space: nowrap;
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

.history-note {
  display: grid;
  gap: 5px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
  line-height: 1.45;
}

.history-note strong {
  color: #0f766e;
}

@media (max-width: 1100px) {
  .game-layout {
    height: auto;
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

  .bank-breakdown,
  .ability-breakdown {
    grid-template-columns: 1fr;
    width: 100%;
    margin-top: -4px;
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
