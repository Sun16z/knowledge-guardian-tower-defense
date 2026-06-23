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
      <div v-if="retryMission" class="retry-mission setup-retry" aria-label="再挑戰任務">
        <span>再挑戰任務</span>
        <strong :style="{ color: retryMission.color }">補強 {{ retryMission.label }} {{ retryMission.practice }} 題</strong>
        <small>{{ retryMission.tip }} {{ retryMissionFocusText }}</small>
      </div>
      <div v-if="runHistory.length > 0" class="parent-report setup-parent-report" aria-label="家長週報">
        <span>家長週報</span>
        <strong>{{ parentWeeklyReport.summary }}</strong>
        <small>{{ parentWeeklyReport.nextStep }}</small>
      </div>
      <div v-if="runHistory.length > 0" class="weekly-coach-card setup-weekly-coach" aria-label="家長週報卡">
        <div class="weekly-coach-heading">
          <span>週報卡</span>
          <strong>{{ weeklyCoachCard.status }}</strong>
        </div>
        <div class="weekly-coach-metrics">
          <span v-for="metric in weeklyCoachCard.metrics" :key="metric.label">
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.label }}</em>
            <small>{{ metric.detail }}</small>
          </span>
        </div>
        <small>{{ weeklyCoachCard.action }}</small>
      </div>

      <button class="primary-action" type="button" @click="startRun">開始守護</button>
      <div class="setup-quick-rail" aria-label="手機快速開始">
        <span>
          <strong>{{ setupQuickTitle }}</strong>
          <small>{{ setupQuickMeta }}</small>
        </span>
        <button type="button" @click="startRun">開始守護</button>
      </div>
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
            <button class="graphics-button" type="button" :aria-pressed="graphicsPerformanceMode" @click="cycleGraphicsMode">
              3D {{ graphicsModeLabel }}
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
            <span class="scene-chip">原創 3D 幾何戰場 / {{ graphicsStatusLabel }}</span>
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
              <div class="result-summary" aria-label="戰後學習摘要">
                <span>戰後摘要</span>
                <strong>{{ resultAbilitySummary }}</strong>
                <small>{{ resultAbilityDetail }}</small>
              </div>
              <div class="result-badges" aria-label="本局獲得徽章">
                <span v-for="badge in unlockedRunBadges" :key="badge.id" :style="{ borderColor: badge.color }">
                  {{ badge.label }}
                </span>
                <small v-if="unlockedRunBadges.length === 0">本局尚未解鎖徽章，下一局先拿暖身守護。</small>
              </div>
              <button class="primary-action compact" type="button" @click="resetGame(state.grade)">再玩一次</button>
            </div>
          </div>
        </div>
      </div>

      <nav v-if="state.status !== 'ready'" class="mobile-action-rail" aria-label="手機快捷導覽">
        <button type="button" @click="scrollToMobilePanel('quiz')">
          <span>答題</span>
          <strong>{{ totalCorrect }}/{{ runCorrectGoal }}</strong>
        </button>
        <button type="button" @click="scrollToMobilePanel('tower')">
          <span>建塔</span>
          <strong>{{ state.energy }}</strong>
        </button>
        <button type="button" @click="scrollToMobilePanel('progress')">
          <span>學習</span>
          <strong>{{ liveAccuracyText }}</strong>
        </button>
      </nav>

      <aside class="control-panel" aria-label="問答與建塔面板">
        <section ref="quizCardRef" class="quiz-card">
          <div class="card-heading">
            <span :style="{ background: currentSubject.color }">{{ currentSubject.label }}</span>
            <strong>{{ currentQuestionMeta }} / 第 {{ state.questionCursor + 1 }} 題</strong>
            <em v-if="currentQuestionIsReview">錯題複習</em>
          </div>
          <div class="ability-preview" :style="{ borderColor: currentAbility.color }" aria-label="本題能力預告">
            <span :style="{ background: currentAbility.color }">能力預告</span>
            <strong>{{ currentAbility.label }}</strong>
            <em>{{ currentAbilityRunText }}</em>
            <small>{{ currentAbility.recoveryTip }}</small>
          </div>
          <div class="confidence-check" aria-label="答題前信心選擇">
            <div class="confidence-heading">
              <span>答題前信心</span>
              <strong>{{ confidenceCalibrationText }}</strong>
            </div>
            <div class="confidence-options">
              <button
                v-for="option in confidenceOptions"
                :key="option.id"
                type="button"
                :class="{ active: selectedConfidence === option.id }"
                :aria-pressed="selectedConfidence === option.id"
                @click="selectedConfidence = option.id"
              >
                <strong>{{ option.label }}</strong>
                <small>{{ option.detail }}</small>
              </button>
            </div>
            <small>{{ confidenceGuideText }}</small>
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
              :disabled="state.status === 'won' || state.status === 'lost' || !selectedConfidence"
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
            <span v-if="priorityReviewNotice">{{ priorityReviewNotice }}</span>
          </div>
        </section>

        <section ref="towerCardRef" class="tower-card">
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

        <section ref="progressCardRef" class="progress-card">
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
          <div class="badge-card" aria-label="本局徽章">
            <div class="badge-heading">
              <span>本局徽章</span>
              <strong>{{ badgeSummaryText }}</strong>
            </div>
            <div class="badge-grid">
              <span
                v-for="badge in runBadges"
                :key="badge.id"
                class="badge-token"
                :class="{ unlocked: badge.unlocked }"
                :style="{ borderColor: badge.unlocked ? badge.color : '#e2e8f0' }"
              >
                <strong>{{ badge.label }}</strong>
                <em>{{ badge.unlocked ? '達成' : badge.progress }}</em>
                <small>{{ badge.detail }}</small>
              </span>
            </div>
          </div>
          <div v-if="retryMission && state.status !== 'ready'" class="retry-mission" :class="{ done: retryMission.done }" aria-label="再挑戰任務進度">
            <div class="retry-mission-heading">
              <span>再挑戰任務</span>
              <strong :style="{ color: retryMission.color }">{{ retryMission.label }}</strong>
            </div>
            <div class="retry-mission-track"><i :style="{ width: `${retryMission.percent}%`, background: retryMission.color }"></i></div>
            <small>{{ retryMission.progress }} / {{ retryMission.practice }} 題穩定答對。{{ retryMissionFocusText }} {{ retryMission.tip }}</small>
          </div>
          <div class="weakness-card" :class="{ clear: !weaknessHasTarget }" aria-label="弱點回補">
            <div class="weakness-heading">
              <span>科目回補</span>
              <strong :style="{ color: weaknessColor }">{{ weaknessLabel }}</strong>
            </div>
            <div class="weakness-track"><i :style="{ width: `${weaknessRepairPercent}%`, background: weaknessColor }"></i></div>
            <div class="weakness-detail">
              <span>{{ weaknessHasTarget ? `回補 ${weaknessRepaired} / ${weaknessRepairGoal}` : '無待修復錯題' }}</span>
              <strong>{{ weaknessHasTarget ? `${weaknessOpenCount} 題待修復` : '穩定' }}</strong>
            </div>
            <small>{{ weaknessGuideText }}</small>
          </div>
          <div class="ability-repair-card" :class="{ clear: !abilityWeaknessHasTarget }" aria-label="能力回補">
            <div class="ability-repair-heading">
              <span>能力回補</span>
              <strong :style="{ color: abilityWeaknessColor }">{{ abilityWeaknessLabel }}</strong>
            </div>
            <div class="ability-repair-track"><i :style="{ width: `${abilityWeaknessRepairPercent}%`, background: abilityWeaknessColor }"></i></div>
            <div class="ability-repair-detail">
              <span>{{ abilityWeaknessHasTarget ? `回補 ${abilityWeaknessRepaired} / ${abilityWeaknessRepairGoal}` : '能力穩定' }}</span>
              <strong>{{ abilityWeaknessHasTarget ? `${abilityWeaknessAccuracy}%` : '穩定' }}</strong>
            </div>
            <small>{{ abilityWeaknessGuideText }}</small>
          </div>
          <div class="ability-lens" aria-label="本局能力雷達">
            <div class="ability-lens-heading">
              <span>能力雷達</span>
              <strong>{{ abilityFocusSummary }}</strong>
            </div>
            <div
              v-for="ability in abilityEntries"
              :key="ability.id"
              class="ability-lens-row"
              :class="{ active: ability.id === abilityWeaknessId }"
            >
              <span>{{ ability.label }}</span>
              <div><i :style="{ width: `${ability.total === 0 ? 0 : ability.accuracy}%`, background: ability.color }"></i></div>
              <strong>{{ ability.total === 0 ? '-' : `${ability.accuracy}%` }}</strong>
              <small>{{ ability.total }} 答 / {{ ability.mistakes }} 錯 / {{ ability.reviewed }} 修復</small>
            </div>
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
            <span>{{ parentWeeklyReport.summary }} 本局使用 {{ state.hintsUsed }} 次提示。{{ confidenceCalibrationText }}。{{ parentWeeklyReport.nextStep }}</span>
          </div>
          <div class="misconception-note" :class="{ empty: misconceptionFocusList.length === 0 }">
            <strong>迷思清單</strong>
            <span>{{ misconceptionFocusText }}</span>
          </div>
          <div class="weekly-coach-card" aria-label="家長週報卡">
            <div class="weekly-coach-heading">
              <span>家長週報卡</span>
              <strong>{{ weeklyCoachCard.status }}</strong>
            </div>
            <div class="weekly-coach-metrics">
              <span v-for="metric in weeklyCoachCard.metrics" :key="metric.label">
                <strong>{{ metric.value }}</strong>
                <em>{{ metric.label }}</em>
                <small>{{ metric.detail }}</small>
              </span>
            </div>
            <small>{{ weeklyCoachCard.action }}</small>
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
  ABILITIES,
  DEFAULT_QUIZ_FILTER,
  EXAM_OPTIONS,
  GRADE_CONFIGS,
  QUESTION_BANK,
  SUBJECTS,
  SUBJECT_FILTER_OPTIONS,
  TARGET_MODE_OPTIONS,
  TERM_OPTIONS,
  TOWER_TYPES,
  getQuestionAbility,
  getTowerType,
  questionsForSelection,
  type AbilityId,
  type ExamId,
  type GradeId,
  type QuizFilter,
  type QuizQuestion,
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
  prioritizeReviewQuestion,
  startGame,
  tickGame,
  triggerRepairSurge,
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
  abilityFocusId?: AbilityId;
  abilityFocus?: string;
  abilityPractice?: number;
  confidenceSummary?: string;
  misconceptionFocuses?: string[];
  misconceptionTotal?: number;
  misconceptionRepaired?: number;
  badges?: string[];
}

interface RunBadge {
  id: string;
  label: string;
  detail: string;
  progress: string;
  color: string;
  unlocked: boolean;
}

interface ParentWeeklyReport {
  summary: string;
  nextStep: string;
}

interface MisconceptionEntry {
  id: string;
  subjectLabel: string;
  abilityLabel: string;
  prompt: string;
  correctAnswer: string;
  count: number;
  repaired: boolean;
}

interface WeeklyReportMetric {
  label: string;
  value: string;
  detail: string;
}

interface WeeklyCoachCard {
  status: string;
  metrics: WeeklyReportMetric[];
  action: string;
}

type GraphicsMode = 'auto' | 'performance' | 'quality';
type ConfidenceLevel = 'sure' | 'maybe' | 'try';

interface ConfidenceOption {
  id: ConfidenceLevel;
  label: string;
  detail: string;
}

interface ConfidenceBucket {
  total: number;
  correct: number;
}

const abilityCategories = (Object.keys(ABILITIES) as AbilityId[]).map((id) => ({ id, ...ABILITIES[id] }));

const optionLabels = ['A', 'B', 'C', 'D'];
const RUN_HISTORY_KEY = 'knowledge-defense-run-history-v1';
const GRAPHICS_MODE_KEY = 'knowledge-defense-graphics-mode-v1';
const gradeConfigs = GRADE_CONFIGS;
const towerTypes = TOWER_TYPES;
const targetModeOptions = TARGET_MODE_OPTIONS;
const termOptions = TERM_OPTIONS;
const examOptions = EXAM_OPTIONS;
const subjectFilterOptions = SUBJECT_FILTER_OPTIONS;
const confidenceOptions: ConfidenceOption[] = [
  { id: 'sure', label: '很有把握', detail: '先穩穩拿分' },
  { id: 'maybe', label: '有點不確定', detail: '看完再判斷' },
  { id: 'try', label: '先試試', detail: '用策略拆題' },
];
const quizFilter = reactive<QuizFilter>({ ...DEFAULT_QUIZ_FILTER });
const state = reactive(createKnowledgeGameState(1, quizFilter));
const selectedTowerType = ref<TowerTypeId>('number');
const selectedTargetMode = ref<TowerTargetMode>('front');
const soundEnabled = ref(true);
const graphicsMode = ref<GraphicsMode>(loadGraphicsMode());
const selectedConfidence = ref<ConfidenceLevel | null>(null);
const priorityReviewNotice = ref('');
const highConfidenceMistakes = ref<MisconceptionEntry[]>([]);
const repairStreak = ref(0);
const confidenceStats = reactive<Record<ConfidenceLevel, ConfidenceBucket>>({
  sure: { total: 0, correct: 0 },
  maybe: { total: 0, correct: 0 },
  try: { total: 0, correct: 0 },
});
const battle3dHost = ref<HTMLElement | null>(null);
const quizCardRef = ref<HTMLElement | null>(null);
const towerCardRef = ref<HTMLElement | null>(null);
const progressCardRef = ref<HTMLElement | null>(null);
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
const graphicsPerformanceMode = computed(() => graphicsMode.value === 'performance' || (graphicsMode.value === 'auto' && shouldUsePerformanceMode()));
const graphicsModeLabel = computed(() => {
  if (graphicsMode.value === 'performance') return '省電';
  if (graphicsMode.value === 'quality') return '畫質';
  return '自動';
});
const graphicsStatusLabel = computed(() => (graphicsPerformanceMode.value ? '省電渲染' : '標準渲染'));
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
const confidenceAnsweredTotal = computed(() =>
  Object.values(confidenceStats).reduce((sum, bucket) => sum + bucket.total, 0),
);
const confidenceCorrectTotal = computed(() =>
  Object.values(confidenceStats).reduce((sum, bucket) => sum + bucket.correct, 0),
);
const confidenceCalibrationText = computed(() => {
  if (confidenceAnsweredTotal.value === 0) return '尚未校準';
  const sure = confidenceStats.sure;
  const sureText = sure.total === 0 ? '高把握 -' : `高把握 ${Math.round((sure.correct / sure.total) * 100)}%`;
  return `校準 ${confidenceCorrectTotal.value}/${confidenceAnsweredTotal.value}，${sureText}`;
});
const confidenceGuideText = computed(() => {
  if (!selectedConfidence.value) return '先選信心，答案才會解鎖。';
  if (selectedConfidence.value === 'sure') return '保持節奏，答完看看高把握是否真的穩。';
  if (selectedConfidence.value === 'maybe') return '先圈關鍵詞，再比對每個選項。';
  return '先用提示策略拆題，答錯也會進入複習。';
});
const totalAnswered = computed(() => subjectEntries.value.reduce((sum, subject) => sum + subject.total, 0));
const totalCorrect = computed(() => (Object.keys(SUBJECTS) as SubjectId[]).reduce((sum, id) => sum + state.stats[id].correct, 0));
const totalReviewed = computed(() => (Object.keys(SUBJECTS) as SubjectId[]).reduce((sum, id) => sum + state.stats[id].reviewed, 0));
const runCorrectGoal = computed(() => 18 + state.grade * 2);
const reviewGoal = computed(() => Math.max(3, Math.floor(runCorrectGoal.value / 7)));
const runCorrectPercent = computed(() => Math.min(100, Math.round((totalCorrect.value / runCorrectGoal.value) * 100)));
const remainingCorrect = computed(() => Math.max(0, runCorrectGoal.value - totalCorrect.value));
const liveAccuracy = computed(() => (totalAnswered.value === 0 ? 0 : Math.round((totalCorrect.value / totalAnswered.value) * 100)));
const liveAccuracyText = computed(() => (totalAnswered.value === 0 ? '-' : `${liveAccuracy.value}%`));
const seenQuestionCount = computed(() => Math.min(totalAnswered.value, currentQuestionCount.value));
const reviewBadgeGoal = computed(() => Math.max(1, Math.ceil(reviewGoal.value / 2)));
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
const abilityWeaknessEntry = computed(() => {
  const ranked = abilityEntries.value
    .filter((ability) => ability.mistakes > 0)
    .map((ability) => ({
      ...ability,
      openMistakes: Math.max(0, ability.mistakes - ability.reviewed),
    }))
    .sort((a, b) => b.openMistakes - a.openMistakes || b.mistakes - a.mistakes || a.accuracy - b.accuracy);
  return ranked[0];
});
const abilityWeaknessHasTarget = computed(() => Boolean(abilityWeaknessEntry.value));
const abilityWeaknessId = computed(() => abilityWeaknessEntry.value?.id ?? '');
const abilityWeaknessLabel = computed(() => abilityWeaknessEntry.value?.label ?? '目前穩定');
const abilityWeaknessColor = computed(() => abilityWeaknessEntry.value?.color ?? '#0f766e');
const abilityWeaknessAccuracy = computed(() => abilityWeaknessEntry.value?.accuracy ?? 100);
const abilityWeaknessOpenCount = computed(() => abilityWeaknessEntry.value?.openMistakes ?? 0);
const abilityWeaknessRepairGoal = computed(() =>
  abilityWeaknessEntry.value ? Math.max(1, Math.ceil(abilityWeaknessEntry.value.mistakes * 0.6)) : 1,
);
const abilityWeaknessRepaired = computed(() => Math.min(abilityWeaknessEntry.value?.reviewed ?? 0, abilityWeaknessRepairGoal.value));
const abilityWeaknessRepairPercent = computed(() =>
  Math.min(100, Math.round((abilityWeaknessRepaired.value / abilityWeaknessRepairGoal.value) * 100)),
);
const abilityWeaknessGuideText = computed(() => {
  const ability = abilityWeaknessEntry.value;
  if (!ability) return '五種能力目前都穩定，下一題可以維持節奏。';
  if (abilityWeaknessOpenCount.value > 0) {
    return `${ability.label}還有 ${abilityWeaknessOpenCount.value} 題待修復。${ability.recoveryTip}`;
  }
  return `${ability.label}已回補。${ability.recoveryTip}`;
});
const abilityFocusSummary = computed(() => {
  if (totalAnswered.value === 0) return '等待答題';
  if (!abilityWeaknessEntry.value) return '五力穩定';
  return `${abilityWeaknessEntry.value.label}優先`;
});
const resultAbilityEntry = computed(() => {
  if (abilityWeaknessEntry.value) return abilityWeaknessEntry.value;
  return abilityEntries.value
    .filter((ability) => ability.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy || a.total - b.total)[0];
});
const resultAbilityPractice = computed(() => {
  const ability = resultAbilityEntry.value;
  if (!ability) return 0;
  const openMistakes = Math.max(0, ability.mistakes - ability.reviewed);
  if (openMistakes > 0) return Math.max(3, openMistakes + 2);
  if (ability.mistakes > 0) return 2;
  return ability.total > 0 ? 1 : 0;
});
const resultAbilitySummary = computed(() => {
  const ability = resultAbilityEntry.value;
  if (!ability) return '完成一題後建立摘要';
  if (ability.mistakes === 0) return `${ability.label}保持穩定`;
  return `${ability.label}優先練 ${resultAbilityPractice.value} 題`;
});
const resultAbilityDetail = computed(() => {
  const ability = resultAbilityEntry.value;
  if (!ability) return '先完成一題，系統會整理下一局的能力練習方向。';
  return `本局 ${ability.total} 答 / ${ability.mistakes} 錯 / ${ability.reviewed} 修復。${ability.recoveryTip}`;
});
const retryMission = computed(() => {
  const latest = runHistory.value[0];
  if (!latest?.abilityFocus) return null;
  const ability =
    abilityCategories.find((item) => item.id === latest.abilityFocusId) ??
    abilityCategories.find((item) => item.label === latest.abilityFocus);
  const practice = Math.max(1, latest.abilityPractice ?? 3);
  const progress = ability ? Math.min(practice, state.abilityStats[ability.id].correct) : 0;
  return {
    id: ability?.id,
    label: ability?.label ?? latest.abilityFocus,
    color: ability?.color ?? '#1d4ed8',
    tip: ability?.recoveryTip ?? '先看錯題解題，再挑戰下一題。',
    practice,
    progress,
    percent: Math.min(100, Math.round((progress / practice) * 100)),
    done: progress >= practice,
  };
});
const retryMissionDeckFocusCount = computed(() => {
  const mission = retryMission.value;
  if (!mission?.id) return 0;
  const focusWindow = Math.min(Math.max(2, mission.practice), 6, state.questionDeck.length);
  return state.questionDeck.slice(0, focusWindow).filter((question) => getQuestionAbility(question) === mission.id).length;
});
const retryMissionFocusText = computed(() => {
  if (!retryMission.value?.id) return '';
  if (retryMissionDeckFocusCount.value === 0) return '目前條件沒有相符能力題，任務會保留到合適題庫。';
  return `前段優先 ${retryMissionDeckFocusCount.value} 題。`;
});
const repairStreakGoal = computed(() => Math.min(3, Math.max(2, highConfidenceMistakes.value.length || 2)));
const runBadges = computed<RunBadge[]>(() => [
  {
    id: 'warmup',
    label: '暖身守護',
    detail: '答對 5 題',
    progress: `${Math.min(totalCorrect.value, 5)}/5`,
    color: '#f59e0b',
    unlocked: totalCorrect.value >= 5,
  },
  {
    id: 'steady',
    label: '穩定防線',
    detail: `答對 ${runCorrectGoal.value} 題`,
    progress: `${Math.min(totalCorrect.value, runCorrectGoal.value)}/${runCorrectGoal.value}`,
    color: '#0f766e',
    unlocked: totalCorrect.value >= runCorrectGoal.value,
  },
  {
    id: 'repair',
    label: '錯題修復師',
    detail: `修復 ${reviewBadgeGoal.value} 題`,
    progress: `${Math.min(totalReviewed.value, reviewBadgeGoal.value)}/${reviewBadgeGoal.value}`,
    color: '#4f46e5',
    unlocked: totalReviewed.value >= reviewBadgeGoal.value,
  },
  {
    id: 'repair-streak',
    label: '修正連擊',
    detail: `連續修正 ${repairStreakGoal.value} 個迷思`,
    progress: `${Math.min(repairStreak.value, repairStreakGoal.value)}/${repairStreakGoal.value}`,
    color: '#db2777',
    unlocked: repairStreak.value >= repairStreakGoal.value,
  },
  {
    id: 'retry',
    label: '專注補強',
    detail: retryMission.value ? `完成 ${retryMission.value.label}` : '完成再挑戰任務',
    progress: retryMission.value ? `${retryMission.value.progress}/${retryMission.value.practice}` : '等待任務',
    color: retryMission.value?.color ?? '#2563eb',
    unlocked: retryMission.value?.done ?? false,
  },
]);
const unlockedRunBadges = computed(() => runBadges.value.filter((badge) => badge.unlocked));
const badgeSummaryText = computed(() => {
  if (unlockedRunBadges.value.length === 0) return '先拿暖身守護';
  return `已解鎖 ${unlockedRunBadges.value.length} 枚`;
});
const weeklyRuns = computed(() => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return runHistory.value.filter((run) => {
    const time = new Date(run.date).getTime();
    return Number.isFinite(time) && time >= weekAgo;
  });
});
const misconceptionFocusList = computed(() => {
  const counts = new Map<string, number>();
  for (const entry of highConfidenceMistakes.value) {
    const label = formatMisconceptionEntry(entry);
    counts.set(label, (counts.get(label) ?? 0) + entry.count);
  }
  for (const run of runHistory.value) {
    for (const label of run.misconceptionFocuses ?? []) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))
    .slice(0, 3)
    .map(([label]) => label);
});
const misconceptionFocusText = computed(() => {
  if (misconceptionFocusList.value.length === 0) return '尚未累積高把握錯題；出現後會整理最需要修正的觀念。';
  return misconceptionFocusList.value.join(' / ');
});
const parentWeeklyReport = computed<ParentWeeklyReport>(() => {
  const runs = weeklyRuns.value;
  if (runs.length === 0) {
    return {
      summary: '最近 7 日尚未完成戰績。',
      nextStep: '先完成一局，系統會整理正確率、錯題修復與補強方向。',
    };
  }

  const answered = runs.reduce((sum, run) => sum + run.answered, 0);
  const correct = runs.reduce((sum, run) => sum + run.correct, 0);
  const reviewed = runs.reduce((sum, run) => sum + run.reviewed, 0);
  const badgeCount = runs.reduce((sum, run) => sum + (run.badges?.length ?? 0), 0);
  const wins = runs.filter((run) => run.status === 'won').length;
  const accuracyText = answered === 0 ? '-' : `${Math.round((correct / answered) * 100)}%`;
  const focusCounts = new Map<string, number>();
  for (const run of runs) {
    if (!run.abilityFocus) continue;
    focusCounts.set(run.abilityFocus, (focusCounts.get(run.abilityFocus) ?? 0) + 1);
  }
  const focusLabel = [...focusCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const nextStep = focusLabel
    ? `下次先補 ${focusLabel}，再挑戰一局。`
    : '下次維持五科輪替，觀察哪一項能力開始掉分。';
  const misconceptionStep = misconceptionFocusList.value.length > 0 ? `迷思先修：${misconceptionFocusList.value[0]}。` : '';

  return {
    summary: `最近 7 日 ${runs.length} 局 / 勝 ${wins} / 正確率 ${accuracyText} / 修復 ${reviewed} 題 / 徽章 ${badgeCount}`,
    nextStep: `${misconceptionStep}${nextStep}`,
  };
});
const weeklyCoachCard = computed<WeeklyCoachCard>(() => {
  const runs = weeklyRuns.value;
  const weeklyAnswered = runs.reduce((sum, run) => sum + run.answered, 0);
  const weeklyCorrect = runs.reduce((sum, run) => sum + run.correct, 0);
  const weeklyReviewed = runs.reduce((sum, run) => sum + run.reviewed, 0);
  const weeklyMisconceptionTotal = runs.reduce((sum, run) => sum + (run.misconceptionTotal ?? run.misconceptionFocuses?.length ?? 0), 0);
  const weeklyMisconceptionRepaired = runs.reduce((sum, run) => sum + (run.misconceptionRepaired ?? 0), 0);
  const liveAnswered = totalAnswered.value;
  const liveCorrect = totalCorrect.value;
  const liveReviewed = totalReviewed.value;
  const liveMisconceptionTotal = highConfidenceMistakes.value.length;
  const liveMisconceptionRepaired = highConfidenceMistakes.value.filter((entry) => entry.repaired).length;
  const answered = weeklyAnswered + liveAnswered;
  const correct = weeklyCorrect + liveCorrect;
  const reviewed = weeklyReviewed + liveReviewed;
  const misconceptionTotal = weeklyMisconceptionTotal + liveMisconceptionTotal;
  const misconceptionRepaired = weeklyMisconceptionRepaired + liveMisconceptionRepaired;
  const openMisconceptions = Math.max(0, misconceptionTotal - misconceptionRepaired);
  const accuracyText = answered === 0 ? '-' : `${Math.round((correct / answered) * 100)}%`;
  const repairRateText = misconceptionTotal === 0 ? '-' : `${Math.round((misconceptionRepaired / misconceptionTotal) * 100)}%`;
  const openMisconception = highConfidenceMistakes.value.find((entry) => !entry.repaired);
  const focusLabel = openMisconception
    ? formatMisconceptionEntry(openMisconception)
    : misconceptionFocusList.value[0] ?? retryMission.value?.label ?? resultAbilityEntry.value?.label ?? '五科輪替';
  const practiceCount = openMisconceptions > 0 ? 6 + openMisconceptions * 2 : retryMission.value?.practice ?? Math.max(3, Math.ceil(runCorrectGoal.value / 6));
  const status =
    answered === 0
      ? '等待第一局'
      : openMisconceptions > 0
        ? '修正中'
        : misconceptionTotal > 0
          ? '迷思已修復'
        : liveAccuracy.value >= 80 || correct / Math.max(1, answered) >= 0.8
          ? '穩定前進'
          : '需要回補';

  return {
    status,
    metrics: [
      {
        label: '7日局數',
        value: `${runs.length}`,
        detail: liveAnswered > 0 ? `本局 ${liveAnswered} 答` : '完成後累積',
      },
      {
        label: '正確率',
        value: accuracyText,
        detail: answered === 0 ? '等待資料' : `${correct}/${answered} 題`,
      },
      {
        label: '迷思修正',
        value: repairRateText,
        detail: misconceptionTotal > 0 ? `${misconceptionRepaired}/${misconceptionTotal} 完成` : `修復 ${reviewed} 題`,
      },
    ],
    action:
      answered === 0
        ? '完成第一局後，週報卡會整理孩子的下一步練習方向。'
        : openMisconceptions > 0
          ? `下次建議練 ${practiceCount} 題，優先修正：${focusLabel}。`
          : `本週迷思已修正，下一次練 ${practiceCount} 題維持手感。`,
  };
});
const missionEntries = computed(() => {
  const missions = [
    { label: `答對 ${runCorrectGoal.value} 題`, value: `${totalCorrect.value}/${runCorrectGoal.value}`, done: totalCorrect.value >= runCorrectGoal.value },
    { label: `修復 ${reviewGoal.value} 題錯題`, value: `${totalReviewed.value}/${reviewGoal.value}`, done: totalReviewed.value >= reviewGoal.value },
    { label: '核心保持 8+', value: `${state.coreHp}/12`, done: state.coreHp >= 8 },
  ];
  if (retryMission.value) {
    missions.unshift({
      label: `補強 ${retryMission.value.label}`,
      value: `${retryMission.value.progress}/${retryMission.value.practice}`,
      done: retryMission.value.done,
    });
  }
  return missions;
});
const latestRunSummary = computed(() => {
  const latest = runHistory.value[0];
  if (!latest) return '';
  const result = latest.status === 'won' ? '成功' : '再挑戰';
  const accuracyText = latest.answered === 0 ? '-' : `${Math.round((latest.correct / latest.answered) * 100)}%`;
  const abilityText = latest.abilityFocus ? ` / 補 ${latest.abilityFocus}` : '';
  const confidenceText = latest.confidenceSummary ? ` / ${latest.confidenceSummary}` : '';
  const misconceptionText = latest.misconceptionFocuses?.length ? ` / 迷思 ${latest.misconceptionFocuses.length}` : '';
  const badgeText = latest.badges?.length ? ` / 徽章 ${latest.badges.length}` : '';
  return `${result} / 小${latest.grade} / ${latest.score} 分 / 正確率 ${accuracyText} / 修復 ${latest.reviewed} 題${abilityText}${confidenceText}${misconceptionText}${badgeText}`;
});

const currentSubject = computed(() => SUBJECTS[state.currentQuestion.subject]);
const currentAbility = computed(() => {
  const id = getQuestionAbility(state.currentQuestion);
  return { id, ...ABILITIES[id] };
});
const currentAbilityStats = computed(() => state.abilityStats[currentAbility.value.id]);
const currentAbilityRunText = computed(() => {
  const stats = currentAbilityStats.value;
  if (stats.total === 0) return '本局首次練習';
  return `本局 ${stats.total} 答 / ${stats.mistakes} 錯 / ${accuracy(stats)}%`;
});
const currentQuestionMeta = computed(() => {
  const term = termOptions.find((item) => item.id === state.currentQuestion.term)?.label ?? '綜合';
  const exam = examOptions.find((item) => item.id === state.currentQuestion.exam)?.label ?? '練習';
  return `${term}${exam}${state.currentQuestion.difficulty ? ` ${state.currentQuestion.difficulty}` : ''}`;
});
const currentSelectionQuestions = computed(() => questionsForSelection(state.grade, quizFilter));
const currentQuestionCount = computed(() => currentSelectionQuestions.value.length);
const totalQuestionCount = computed(() => QUESTION_BANK.length);
const setupQuickTitle = computed(() => {
  const subject = subjectFilterOptions.find((item) => item.id === quizFilter.subject)?.label ?? '全科';
  return `${state.config.label} / ${subject}`;
});
const setupQuickMeta = computed(() => {
  const term = termOptions.find((item) => item.id === quizFilter.term)?.label ?? '綜合';
  const exam = examOptions.find((item) => item.id === quizFilter.exam)?.label ?? '練習';
  return `${term} ${exam} / ${currentQuestionCount.value} 題`;
});
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
    const ability = getQuestionAbility(question);
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

const abilityEntries = computed(() =>
  abilityCategories.map((ability) => ({
    ...ability,
    total: state.abilityStats[ability.id].total,
    accuracy: accuracy(state.abilityStats[ability.id]),
    mistakes: state.abilityStats[ability.id].mistakes,
    reviewed: state.abilityStats[ability.id].reviewed,
  })),
);
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
  applyRetryMissionQuestionFocus();
  void audio?.ensureStarted();
  startGame(state);
}

function scrollToMobilePanel(panel: 'quiz' | 'tower' | 'progress'): void {
  const target =
    panel === 'quiz' ? quizCardRef.value : panel === 'tower' ? towerCardRef.value : progressCardRef.value;
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function chooseAnswer(index: number): void {
  void audio?.ensureStarted();
  if (!selectedConfidence.value) return;
  priorityReviewNotice.value = '';
  if (state.status === 'ready') {
    startGame(state);
  }
  if (state.status !== 'running') return;
  const confidence = selectedConfidence.value;
  const answeredQuestion = state.currentQuestion;
  const result = answerQuestion(state, index);
  recordConfidenceAnswer(confidence, result.correct);
  if (result.correct) {
    const repaired = recordHighConfidenceRepair(answeredQuestion);
    if (repaired) {
      repairStreak.value += 1;
      triggerRepairSurge(state, repairStreak.value);
      audio?.playFocusPulse();
      priorityReviewNotice.value = `迷思修正完成，修正光波已釋放。修正連擊 ${repairStreak.value}/${repairStreakGoal.value}。`;
    }
  } else if (confidence === 'sure') {
    prioritizeReviewQuestion(state, answeredQuestion, 0);
    recordHighConfidenceMistake(answeredQuestion, result.correctAnswer);
    priorityReviewNotice.value = '高把握錯題已列為立即複習，下一題先修正這個觀念。';
  }
  selectedConfidence.value = null;
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

function cycleGraphicsMode(): void {
  graphicsMode.value = graphicsMode.value === 'auto' ? 'performance' : graphicsMode.value === 'performance' ? 'quality' : 'auto';
  saveGraphicsMode(graphicsMode.value);
  rebuildThreeScene();
}

function resetGame(grade: GradeId): void {
  Object.assign(state, createKnowledgeGameState(grade, quizFilter));
  applyRetryMissionQuestionFocus();
  selectedTowerType.value = 'number';
  selectedTargetMode.value = 'front';
  selectedConfidence.value = null;
  priorityReviewNotice.value = '';
  highConfidenceMistakes.value = [];
  repairStreak.value = 0;
  resetConfidenceStats();
  heardEffectIds.clear();
  heardWave = 0;
  savedResultStatus = '';
  lastFrame = 0;
}

function applyRetryMissionQuestionFocus(): void {
  const mission = retryMission.value;
  if (!mission?.id || state.status !== 'ready' || state.questionDeck.length === 0) return;

  const targetQuestions = state.questionDeck.filter((question) => getQuestionAbility(question) === mission.id);
  if (targetQuestions.length === 0) return;

  const focusCount = Math.min(Math.max(2, mission.practice), targetQuestions.length, 6);
  const focusIds = new Set(targetQuestions.slice(0, focusCount).map((question) => question.id));
  const remainingQuestions = state.questionDeck.filter((question) => !focusIds.has(question.id));
  state.questionDeck = [...targetQuestions.slice(0, focusCount), ...remainingQuestions];
  state.questionCursor = 0;
  state.currentQuestion = state.questionDeck[0];
}

function recordConfidenceAnswer(level: ConfidenceLevel, correct: boolean): void {
  confidenceStats[level].total += 1;
  if (correct) confidenceStats[level].correct += 1;
}

function recordHighConfidenceMistake(question: QuizQuestion, correctAnswer: string): void {
  const existing = highConfidenceMistakes.value.find((entry) => entry.id === question.id);
  if (existing) {
    existing.count += 1;
    return;
  }
  const ability = ABILITIES[getQuestionAbility(question)];
  highConfidenceMistakes.value = [
    {
      id: question.id,
      subjectLabel: SUBJECTS[question.subject].label,
      abilityLabel: ability.label,
      prompt: question.prompt,
      correctAnswer,
      count: 1,
      repaired: false,
    },
    ...highConfidenceMistakes.value,
  ].slice(0, 5);
}

function recordHighConfidenceRepair(question: QuizQuestion): boolean {
  const target = highConfidenceMistakes.value.find((entry) => entry.id === question.id);
  if (!target || target.repaired) return false;
  highConfidenceMistakes.value = highConfidenceMistakes.value.map((entry) =>
    entry.id === question.id ? { ...entry, repaired: true } : entry,
  );
  return true;
}

function formatMisconceptionEntry(entry: MisconceptionEntry): string {
  const prompt = entry.prompt.length > 22 ? `${entry.prompt.slice(0, 22)}...` : entry.prompt;
  return `${entry.subjectLabel}/${entry.abilityLabel}：${prompt} 正解 ${entry.correctAnswer}${entry.repaired ? ' 已修正' : ''}`;
}

function resetConfidenceStats(): void {
  for (const bucket of Object.values(confidenceStats)) {
    bucket.total = 0;
    bucket.correct = 0;
  }
}

function rebuildThreeScene(): void {
  if (!battle3dHost.value) return;
  threeScene?.dispose();
  threeScene = new KnowledgeDefenseThreeScene(battle3dHost.value, onSlotClick, {
    performanceMode: graphicsPerformanceMode.value,
  });
}

onMounted(() => {
  runHistory.value = loadRunHistory();
  applyRetryMissionQuestionFocus();
  audio = new KnowledgeDefenseAudio();
  audio.setEnabled(soundEnabled.value);
  rebuildThreeScene();

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
    abilityFocusId: resultAbilityEntry.value?.id,
    abilityFocus: resultAbilityEntry.value?.label,
    abilityPractice: resultAbilityPractice.value,
    confidenceSummary: confidenceCalibrationText.value,
    misconceptionFocuses: highConfidenceMistakes.value.slice(0, 3).map(formatMisconceptionEntry),
    misconceptionTotal: highConfidenceMistakes.value.length,
    misconceptionRepaired: highConfidenceMistakes.value.filter((entry) => entry.repaired).length,
    badges: unlockedRunBadges.value.map((badge) => badge.label),
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

function loadGraphicsMode(): GraphicsMode {
  try {
    const saved = localStorage.getItem(GRAPHICS_MODE_KEY);
    if (saved === 'auto' || saved === 'performance' || saved === 'quality') return saved;
  } catch {
    // Storage can be disabled; default automatic graphics mode still works.
  }
  return 'auto';
}

function saveGraphicsMode(mode: GraphicsMode): void {
  try {
    localStorage.setItem(GRAPHICS_MODE_KEY, mode);
  } catch {
    // Gameplay should continue even when storage is unavailable.
  }
}

function shouldUsePerformanceMode(): boolean {
  const navigatorHints = navigator as Navigator & { deviceMemory?: number };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const lowMemory = (navigatorHints.deviceMemory ?? 8) <= 4;
  const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  const highDprMobile = coarsePointer && window.innerWidth <= 720 && (window.devicePixelRatio || 1) > 1.4;
  return reducedMotion || lowMemory || lowCores || highDprMobile;
}
</script>

<style scoped>
.knowledge-defense-shell {
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 12% 12%, rgba(250, 204, 21, 0.22), transparent 28%),
    radial-gradient(circle at 86% 18%, rgba(20, 184, 166, 0.22), transparent 26%),
    linear-gradient(135deg, #102a43 0%, #0f172a 48%, #111827 100%);
  color: #0f172a;
  display: grid;
  place-items: stretch;
  --shell-pad: 18px;
  padding: var(--shell-pad);
  padding-top: max(var(--shell-pad), env(safe-area-inset-top));
  padding-right: max(var(--shell-pad), env(safe-area-inset-right));
  padding-bottom: calc(var(--shell-pad) + env(safe-area-inset-bottom));
  padding-left: max(var(--shell-pad), env(safe-area-inset-left));
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
  overflow: auto;
  overscroll-behavior-y: contain;
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

.retry-mission {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  line-height: 1.35;
}

.setup-retry {
  width: min(760px, 100%);
  margin-top: -4px;
  border-color: rgba(191, 219, 254, 0.32);
  background: rgba(15, 23, 42, 0.52);
  color: #dbeafe;
}

.retry-mission.done {
  border-color: #86efac;
  background: #f0fdf4;
  color: #14532d;
}

.retry-mission-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.retry-mission > span,
.retry-mission-heading span {
  color: inherit;
  font-size: 0.78rem;
  font-weight: 900;
  opacity: 0.82;
}

.retry-mission strong,
.retry-mission-heading strong {
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retry-mission small {
  color: inherit;
  font-size: 0.8rem;
  font-weight: 850;
  opacity: 0.88;
}

.parent-report {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #14532d;
  line-height: 1.35;
}

.setup-parent-report {
  width: min(760px, 100%);
  margin-top: -4px;
  border-color: rgba(187, 247, 208, 0.34);
  background: rgba(20, 83, 45, 0.44);
  color: #dcfce7;
}

.parent-report span {
  font-size: 0.78rem;
  font-weight: 900;
  opacity: 0.82;
}

.parent-report strong {
  min-width: 0;
  color: inherit;
  font-size: 0.9rem;
  font-weight: 950;
  line-height: 1.35;
}

.parent-report small {
  color: inherit;
  font-size: 0.8rem;
  font-weight: 850;
  opacity: 0.9;
}

.weekly-coach-card {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  background: #f0f9ff;
  color: #075985;
  line-height: 1.35;
}

.setup-weekly-coach {
  width: min(760px, 100%);
  margin-top: -4px;
  border-color: rgba(186, 230, 253, 0.42);
  background: rgba(12, 74, 110, 0.42);
  color: #e0f2fe;
}

.weekly-coach-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.weekly-coach-heading span,
.weekly-coach-heading strong {
  font-size: 0.82rem;
  font-weight: 950;
}

.weekly-coach-heading span {
  opacity: 0.82;
}

.weekly-coach-heading strong {
  min-width: 0;
  color: inherit;
  text-align: right;
  white-space: nowrap;
}

.weekly-coach-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.weekly-coach-metrics span {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 7px 6px;
  border: 1px solid rgba(14, 116, 144, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.setup-weekly-coach .weekly-coach-metrics span {
  border-color: rgba(224, 242, 254, 0.18);
  background: rgba(255, 255, 255, 0.1);
}

.weekly-coach-metrics strong,
.weekly-coach-metrics em,
.weekly-coach-metrics small,
.weekly-coach-card > small {
  color: inherit;
  font-style: normal;
  font-weight: 900;
  line-height: 1.25;
}

.weekly-coach-metrics strong {
  font-size: 1rem;
}

.weekly-coach-metrics em {
  font-size: 0.68rem;
  opacity: 0.78;
}

.weekly-coach-metrics small,
.weekly-coach-card > small {
  font-size: 0.72rem;
  opacity: 0.88;
}

.retry-mission-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #dbeafe;
}

.retry-mission-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
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
  height: calc(100dvh - 36px);
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
.sound-button,
.graphics-button {
  border-radius: 999px;
  background: #e2e8f0;
  color: #0f172a;
  padding: 7px 10px;
  font-weight: 800;
  font-size: 0.82rem;
}

.sound-button,
.graphics-button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ecfeff;
  color: #0f766e;
  cursor: pointer;
}

.sound-button[aria-pressed='false'],
.graphics-button[aria-pressed='false'] {
  background: #f1f5f9;
  color: #64748b;
}

.graphics-button[aria-pressed='true'] {
  background: #fff7ed;
  color: #9a3412;
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
  touch-action: pan-y;
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

.result-summary {
  display: grid;
  gap: 5px;
  width: min(360px, 100%);
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  line-height: 1.35;
  text-align: left;
}

.result-summary span {
  color: #475569;
  font-size: 0.78rem;
  font-weight: 900;
}

.result-summary strong {
  color: #1d4ed8;
  font-size: 0.98rem;
}

.result-summary small {
  color: #334155;
  font-size: 0.82rem;
  font-weight: 850;
}

.result-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  max-width: 360px;
}

.result-badges span,
.result-badges small {
  border: 1px solid #dbeafe;
  border-radius: 999px;
  padding: 6px 9px;
  background: #ffffff;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 900;
}

.result-badges small {
  border-radius: 8px;
  line-height: 1.35;
}

.control-panel {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
  min-width: 0;
  max-height: 100%;
  overflow: auto;
}

.mobile-action-rail {
  display: none;
}

.setup-quick-rail {
  display: none;
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

.ability-preview {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
}

.ability-preview span {
  border-radius: 999px;
  padding: 5px 8px;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 950;
  white-space: nowrap;
}

.ability-preview strong,
.ability-preview em,
.ability-preview small {
  min-width: 0;
  font-style: normal;
  font-weight: 900;
}

.ability-preview strong {
  color: #0f172a;
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-preview em {
  color: #0f766e;
  font-size: 0.74rem;
  text-align: right;
  white-space: nowrap;
}

.ability-preview small {
  grid-column: 1 / 4;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.35;
}

.confidence-check {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
}

.confidence-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.confidence-heading span,
.confidence-heading strong,
.confidence-check > small {
  font-size: 0.76rem;
  font-weight: 900;
}

.confidence-heading span {
  color: #475569;
  white-space: nowrap;
}

.confidence-heading strong {
  min-width: 0;
  color: #0f766e;
  text-align: right;
}

.confidence-check > small {
  color: #64748b;
  line-height: 1.35;
}

.confidence-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.confidence-options button {
  display: grid;
  gap: 2px;
  min-width: 0;
  min-height: 50px;
  padding: 7px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
}

.confidence-options button:hover {
  border-color: #14b8a6;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12);
}

.confidence-options button.active {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
}

.confidence-options strong,
.confidence-options small {
  overflow-wrap: anywhere;
  font-weight: 900;
  line-height: 1.2;
}

.confidence-options strong {
  font-size: 0.75rem;
}

.confidence-options small {
  color: inherit;
  font-size: 0.66rem;
  opacity: 0.82;
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

.badge-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.badge-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.badge-heading span {
  color: #475569;
  font-size: 0.78rem;
  font-weight: 900;
}

.badge-heading strong {
  color: #0f766e;
  font-size: 0.82rem;
  font-weight: 950;
  white-space: nowrap;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.badge-token {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 7px;
  min-width: 0;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
}

.badge-token.unlocked {
  background: #ecfdf5;
  color: #0f172a;
}

.badge-token strong,
.badge-token em,
.badge-token small {
  min-width: 0;
  font-style: normal;
  font-weight: 900;
}

.badge-token strong {
  overflow: hidden;
  color: inherit;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-token em {
  color: #0f766e;
  font-size: 0.74rem;
  white-space: nowrap;
}

.badge-token small {
  grid-column: 1 / 3;
  color: #64748b;
  font-size: 0.7rem;
  line-height: 1.25;
}

.weakness-card,
.ability-repair-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
}

.weakness-card {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #7c2d12;
}

.ability-repair-card {
  border: 1px solid #c4b5fd;
  background: #f5f3ff;
  color: #4c1d95;
}

.weakness-card.clear,
.ability-repair-card.clear {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #14532d;
}

.weakness-heading,
.weakness-detail,
.ability-repair-heading,
.ability-repair-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.weakness-heading span,
.weakness-detail span,
.weakness-card small,
.ability-repair-heading span,
.ability-repair-detail span,
.ability-repair-card small {
  min-width: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1.35;
}

.weakness-heading strong,
.ability-repair-heading strong {
  font-size: 1rem;
  white-space: nowrap;
}

.weakness-detail strong,
.ability-repair-detail strong {
  color: #9a3412;
  font-size: 0.78rem;
  white-space: nowrap;
}

.ability-repair-detail strong {
  color: #6d28d9;
}

.weakness-card.clear .weakness-detail strong,
.ability-repair-card.clear .ability-repair-detail strong {
  color: #15803d;
}

.weakness-track,
.ability-repair-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
}

.weakness-track {
  background: #ffedd5;
}

.ability-repair-track {
  background: #ddd6fe;
}

.weakness-card.clear .weakness-track,
.ability-repair-card.clear .ability-repair-track {
  background: #dcfce7;
}

.weakness-track i,
.ability-repair-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.ability-lens {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
}

.ability-lens-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.ability-lens-heading span {
  color: #475569;
  font-size: 0.78rem;
  font-weight: 850;
}

.ability-lens-heading strong {
  min-width: 0;
  color: #1d4ed8;
  font-size: 0.88rem;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-lens-row {
  display: grid;
  grid-template-columns: 72px 1fr 46px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid rgba(191, 219, 254, 0.82);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 900;
}

.ability-lens-row.active {
  border-color: #f59e0b;
  background: #fff7ed;
}

.ability-lens-row span {
  min-width: 0;
  overflow: hidden;
  color: #334155;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-lens-row div {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #dbeafe;
}

.ability-lens-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.ability-lens-row strong {
  color: #0f766e;
  font-size: 0.78rem;
  text-align: right;
  white-space: nowrap;
}

.ability-lens-row small {
  grid-column: 2 / 4;
  min-width: 0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1.25;
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

.misconception-note {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  line-height: 1.45;
}

.misconception-note.empty {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #475569;
}

.misconception-note strong {
  color: #c2410c;
  font-size: 0.92rem;
}

.misconception-note.empty strong {
  color: #0f766e;
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
    grid-template-rows: minmax(520px, 58svh) auto;
    grid-template-rows: minmax(520px, 58dvh) auto;
    overflow: visible;
  }

  .control-panel {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .progress-card {
    grid-column: 1 / -1;
  }
}

@media (max-height: 860px) {
  .setup-screen {
    align-content: start;
  }
}

@media (max-width: 760px) {
  .knowledge-defense-shell {
    --shell-pad: 10px;
    align-content: start;
  }

  .setup-screen {
    inset: 10px;
    inset:
      max(10px, env(safe-area-inset-top))
      max(10px, env(safe-area-inset-right))
      max(10px, env(safe-area-inset-bottom))
      max(10px, env(safe-area-inset-left));
    padding: 18px;
    padding-bottom: calc(104px + env(safe-area-inset-bottom));
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
    min-height: auto;
    grid-template-rows: auto auto;
    gap: 12px;
    padding-bottom: calc(86px + env(safe-area-inset-bottom));
  }

  .battle-card {
    grid-template-rows: auto auto auto auto;
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
    height: clamp(300px, 40svh, 360px);
    height: clamp(300px, 40dvh, 360px);
    min-height: 0;
  }

  .control-panel {
    max-height: none;
    overflow: visible;
  }

  .control-panel > section {
    padding: 12px;
  }

  .quiz-card,
  .tower-card,
  .progress-card {
    gap: 10px;
    scroll-margin-block-start: 12px;
  }

  .progress-card {
    grid-column: auto;
  }

  .badge-token small,
  .ability-lens-row small,
  .subject-row small {
    display: none;
  }

  .ability-lens {
    gap: 6px;
    padding: 9px;
  }

  .ability-lens-row {
    grid-template-columns: 62px 1fr 42px;
    gap: 6px;
    padding: 6px 7px;
  }

  .subject-bars {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .subject-row {
    grid-template-columns: 34px 1fr 38px;
    gap: 6px;
    padding: 7px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
  }

  .subject-row span,
  .subject-row strong {
    min-width: 0;
    font-size: 0.76rem;
  }

  .mission-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mission-list div {
    display: grid;
    justify-items: start;
    gap: 3px;
  }

  .commercial-note,
  .misconception-note,
  .history-note {
    padding: 10px;
  }

  .mobile-action-rail {
    position: fixed;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    left: max(10px, env(safe-area-inset-left));
    z-index: 12;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.86);
    box-shadow: 0 18px 38px rgba(2, 6, 23, 0.32);
    backdrop-filter: blur(14px);
  }

  .mobile-action-rail button {
    display: grid;
    gap: 2px;
    min-width: 0;
    min-height: 54px;
    padding: 7px 6px;
    border: 1px solid rgba(219, 234, 254, 0.22);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #f8fafc;
    cursor: pointer;
  }

  .mobile-action-rail button:active {
    transform: translateY(1px);
  }

  .mobile-action-rail span,
  .mobile-action-rail strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-action-rail span {
    color: #bfdbfe;
    font-size: 0.72rem;
    font-weight: 900;
  }

  .mobile-action-rail strong {
    font-size: 0.95rem;
    font-weight: 950;
  }

  .setup-quick-rail {
    position: fixed;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    left: max(10px, env(safe-area-inset-left));
    z-index: 14;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.9);
    box-shadow: 0 18px 38px rgba(2, 6, 23, 0.34);
    backdrop-filter: blur(14px);
  }

  .setup-quick-rail span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .setup-quick-rail strong,
  .setup-quick-rail small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .setup-quick-rail strong {
    color: #f8fafc;
    font-size: 0.94rem;
    font-weight: 950;
  }

  .setup-quick-rail small {
    color: #bfdbfe;
    font-size: 0.75rem;
    font-weight: 900;
  }

  .setup-quick-rail button {
    min-height: 48px;
    border: 0;
    border-radius: 10px;
    padding: 0 14px;
    background: #f97316;
    color: #ffffff;
    font-weight: 950;
    white-space: nowrap;
    box-shadow: 0 12px 24px rgba(249, 115, 22, 0.32);
    cursor: pointer;
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

@media (max-width: 760px) and (max-height: 740px) {
  .game-layout {
    padding-bottom: calc(18px + env(safe-area-inset-bottom));
  }

  .battle-canvas {
    height: clamp(260px, 42svh, 300px);
    height: clamp(260px, 42dvh, 300px);
  }

  .mobile-action-rail {
    position: sticky;
    right: auto;
    bottom: max(8px, env(safe-area-inset-bottom));
    left: auto;
    z-index: 10;
    width: 100%;
    margin-top: -2px;
  }
}
</style>
