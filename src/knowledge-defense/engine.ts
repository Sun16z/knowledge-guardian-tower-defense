import {
  ENEMY_TYPES,
  PATH_POINTS,
  SUBJECTS,
  TOWER_SLOTS,
  getEnemyType,
  getGradeConfig,
  getQuestionAbility,
  getTowerType,
  questionsForSelection,
  type AbilityId,
  type QuizFilter,
  type EnemyTypeId,
  type GradeConfig,
  type GradeId,
  type Point,
  type QuizQuestion,
  type SubjectId,
  type TowerSlot,
  type TowerTargetMode,
  type TowerTypeId,
} from './content';

export type GameStatus = 'ready' | 'running' | 'won' | 'lost';

export interface EnemyState {
  id: number;
  typeId: EnemyTypeId;
  hp: number;
  maxHp: number;
  progress: number;
  speed: number;
  slowTimer: number;
  leakDamage: number;
  reward: number;
}

export interface TowerState {
  slotId: string;
  typeId: TowerTypeId;
  level: number;
  cooldown: number;
  shots: number;
  targetMode: TowerTargetMode;
}

export interface ShotEffect {
  id: number;
  from: Point;
  to: Point;
  color: string;
  ttl: number;
  kind: 'bolt' | 'splash' | 'slow';
}

export interface AnswerResult {
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
  correctAnswer: string;
  energyDelta: number;
  hint: string;
  explanation: string;
}

export interface SubjectStats {
  total: number;
  correct: number;
  reviewed: number;
  mistakes: number;
}

export interface LearningEvent {
  id: number;
  tone: 'good' | 'warn' | 'info';
  title: string;
  detail: string;
  ttl: number;
}

export interface KnowledgeGameState {
  grade: GradeId;
  config: GradeConfig;
  status: GameStatus;
  energy: number;
  score: number;
  combo: number;
  coreHp: number;
  maxCoreHp: number;
  wave: number;
  targetWaves: number;
  quizFilter: QuizFilter;
  spawnQueue: number;
  spawnTimer: number;
  nextWaveIn: number;
  time: number;
  enemies: EnemyState[];
  towers: TowerState[];
  effects: ShotEffect[];
  learningEvents: LearningEvent[];
  questionDeck: QuizQuestion[];
  questionCursor: number;
  currentQuestion: QuizQuestion;
  reviewQuestionIds: string[];
  hintQuestionIds: string[];
  hintsUsed: number;
  mistakeStreak: number;
  masteryFocus: number;
  pressure: number;
  subjectBoosts: Record<SubjectId, number>;
  lastAnswer?: AnswerResult;
  stats: Record<SubjectId, SubjectStats>;
  abilityStats: Record<AbilityId, SubjectStats>;
  nextEnemyId: number;
  nextEffectId: number;
  nextLearningEventId: number;
}

const segmentLengths = PATH_POINTS.slice(1).map((point, index) => distance(PATH_POINTS[index], point));
export const PATH_TOTAL_LENGTH = segmentLengths.reduce((sum, length) => sum + length, 0);
const OPENING_PREP_SECONDS = 18;

export function createKnowledgeGameState(grade: GradeId, quizFilter: QuizFilter): KnowledgeGameState {
  const config = getGradeConfig(grade);
  const questionDeck = shuffled(questionsForSelection(grade, quizFilter));
  return {
    grade,
    config,
    status: 'ready',
    energy: config.startEnergy,
    score: 0,
    combo: 0,
    coreHp: 12,
    maxCoreHp: 12,
    wave: 0,
    targetWaves: config.targetWaves,
    quizFilter,
    spawnQueue: 0,
    spawnTimer: 0,
    nextWaveIn: 2.2,
    time: 0,
    enemies: [],
    towers: [],
    effects: [],
    learningEvents: [],
    questionDeck,
    questionCursor: 0,
    currentQuestion: questionDeck[0],
    reviewQuestionIds: [],
    hintQuestionIds: [],
    hintsUsed: 0,
    mistakeStreak: 0,
    masteryFocus: 42,
    pressure: 0,
    subjectBoosts: {
      language: 0,
      english: 0,
      math: 0,
      science: 0,
      social: 0,
    },
    stats: {
      language: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      english: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      math: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      science: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      social: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
    },
    abilityStats: {
      reading: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      englishCommunication: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      mathReasoning: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      scienceInquiry: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
      socialJudgment: { total: 0, correct: 0, reviewed: 0, mistakes: 0 },
    },
    nextEnemyId: 1,
    nextEffectId: 1,
    nextLearningEventId: 1,
  };
}

export function startGame(state: KnowledgeGameState): void {
  if (state.status === 'ready') {
    state.status = 'running';
    state.nextWaveIn = OPENING_PREP_SECONDS;
  }
}

export function tickGame(state: KnowledgeGameState, deltaSeconds: number): void {
  if (state.status !== 'running') return;
  const dt = Math.min(deltaSeconds, 0.05);
  state.time += dt;

  updateWaveSpawner(state, dt);
  updateSubjectBoosts(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  collectDefeatedEnemies(state);
  updateEffects(state, dt);
  checkEndState(state);
}

export function answerQuestion(state: KnowledgeGameState, selectedIndex: number): AnswerResult {
  const question = state.currentQuestion;
  const correct = selectedIndex === question.answerIndex;
  const stats = state.stats[question.subject];
  const abilityStats = state.abilityStats[getQuestionAbility(question)];
  const isReview = state.reviewQuestionIds.includes(question.id);
  stats.total += 1;
  abilityStats.total += 1;

  let energyDelta = 8;
  if (correct) {
    stats.correct += 1;
    abilityStats.correct += 1;
    state.combo += 1;
    if (isReview) {
      stats.reviewed += 1;
      abilityStats.reviewed += 1;
    }
    energyDelta = 32 + state.grade * 3 + Math.min(state.combo * 3, 21) + (isReview ? 16 : 0);
    state.score += 120 + state.combo * 18 + state.grade * 10 + (isReview ? 90 : 0);
    state.mistakeStreak = 0;
    state.masteryFocus = Math.min(100, state.masteryFocus + (isReview ? 14 : 8));
    state.pressure = Math.max(0, state.pressure - (isReview ? 12 : 6));
    const alreadyBoosted = state.subjectBoosts[question.subject] > 0;
    state.subjectBoosts[question.subject] = Math.max(state.subjectBoosts[question.subject], isReview ? 13 : 8);
    if (!alreadyBoosted) {
      pushLearningEvent(state, 'info', `${SUBJECTS[question.subject].label}共鳴`, '同科塔短暫提升傷害與射速。');
    }
    if (state.combo > 0 && state.combo % 4 === 0) {
      energyDelta += 18;
      state.pressure = Math.max(0, state.pressure - 8);
      pushLearningEvent(state, 'good', `${state.combo} 連擊`, '穩定答題讓下一波壓力降低，額外獲得能量。');
    }
    if (isReview) {
      state.reviewQuestionIds = state.reviewQuestionIds.filter((id) => id !== question.id);
      pushLearningEvent(state, 'good', '錯題修復完成', `${SUBJECTS[question.subject].label}複習題答對，獲得額外能量。`);
      if (state.coreHp < state.maxCoreHp) {
        state.coreHp = Math.min(state.maxCoreHp, state.coreHp + 1);
        pushLearningEvent(state, 'good', '核心修復', '把錯題補回來，知識核心恢復 1 點。');
      }
    }
  } else {
    state.combo = 0;
    state.mistakeStreak += 1;
    stats.mistakes += 1;
    abilityStats.mistakes += 1;
    state.score = Math.max(0, state.score - 15);
    state.masteryFocus = Math.max(0, state.masteryFocus - 9);
    state.pressure = Math.min(100, state.pressure + 16 + state.mistakeStreak * 4);
    addReviewQuestion(state, question);
    pushLearningEvent(state, 'warn', '錯題已排入複習', `第 ${Math.min(state.mistakeStreak + 2, 5)} 題內會再遇到它。`);
  }

  state.energy += energyDelta;
  const result: AnswerResult = {
    correct,
    selectedIndex,
    correctIndex: question.answerIndex,
    correctAnswer: question.options[question.answerIndex],
    energyDelta,
    hint: question.hint ?? question.explanation,
    explanation: question.explanation,
  };
  state.lastAnswer = result;
  advanceQuestion(state);
  return result;
}

export function buildTower(state: KnowledgeGameState, slotId: string, typeId: TowerTypeId, targetMode: TowerTargetMode = 'front'): boolean {
  const slot = getTowerSlot(slotId);
  const towerType = getTowerType(typeId);
  if (!slot || getTowerAtSlot(state, slotId) || state.energy < towerType.cost || state.status === 'lost') {
    return false;
  }
  state.energy -= towerType.cost;
  state.towers.push({ slotId, typeId, level: 1, cooldown: 0.15, shots: 0, targetMode });
  state.score += 30;
  return true;
}

export function upgradeTower(state: KnowledgeGameState, slotId: string): boolean {
  const tower = getTowerAtSlot(state, slotId);
  if (!tower || tower.level >= 4) return false;
  const cost = upgradeCost(tower);
  if (state.energy < cost) return false;
  state.energy -= cost;
  tower.level += 1;
  tower.cooldown = Math.min(tower.cooldown, 0.2);
  state.score += 50 + tower.level * 20;
  return true;
}

export function upgradeCost(tower: TowerState): number {
  const towerType = getTowerType(tower.typeId);
  return towerType.upgradeBaseCost + tower.level * 36;
}

export function useFocusPulse(state: KnowledgeGameState): boolean {
  const cost = 88;
  if (state.energy < cost || state.status !== 'running') return false;
  state.energy -= cost;
  const damage = 54 + state.grade * 7;
  for (const enemy of state.enemies) {
    enemy.hp -= damage;
    enemy.slowTimer = Math.max(enemy.slowTimer, 1.6);
  }
  state.effects.push({
    id: state.nextEffectId++,
    from: { x: 930, y: 354 },
      to: { x: 930, y: 354 },
      color: '#f8fafc',
      ttl: 0.68,
      kind: 'splash',
  });
  collectDefeatedEnemies(state);
  return true;
}

export function triggerRepairSurge(state: KnowledgeGameState, streak = 1): void {
  const damage = 28 + state.grade * 5 + Math.min(streak, 3) * 10;
  for (const enemy of state.enemies) {
    enemy.hp -= damage;
    enemy.slowTimer = Math.max(enemy.slowTimer, 1.1 + Math.min(streak, 3) * 0.22);
  }

  const color = streak >= 2 ? '#f472b6' : '#38bdf8';
  state.effects.push({
    id: state.nextEffectId++,
    from: { x: 930, y: 354 },
    to: { x: 930, y: 354 },
    color,
    ttl: 0.72,
    kind: 'splash',
  });

  for (const enemy of state.enemies.slice(0, 3)) {
    const point = pointAtProgress(enemy.progress);
    state.effects.push({
      id: state.nextEffectId++,
      from: point,
      to: point,
      color,
      ttl: 0.46,
      kind: 'splash',
    });
  }

  pushLearningEvent(state, 'good', '修正光波', `迷思修正釋放光波，敵群受創並緩速。連擊 ${streak}。`);
  collectDefeatedEnemies(state);
}

export function useQuestionHint(state: KnowledgeGameState): boolean {
  const cost = 5;
  const questionId = state.currentQuestion.id;
  if (state.hintQuestionIds.includes(questionId) || state.energy < cost) return false;
  state.energy -= cost;
  state.hintQuestionIds.push(questionId);
  state.hintsUsed += 1;
  state.pressure = Math.max(0, state.pressure - 3);
  pushLearningEvent(state, 'info', '提示已開啟', '先看提示再作答，答完仍會看到完整解題。');
  return true;
}

export function getTowerAtSlot(state: KnowledgeGameState, slotId: string): TowerState | undefined {
  return state.towers.find((tower) => tower.slotId === slotId);
}

export function getTowerSlot(slotId: string): TowerSlot | undefined {
  return TOWER_SLOTS.find((slot) => slot.id === slotId);
}

export function pointAtProgress(progress: number): Point {
  let remaining = Math.max(0, Math.min(progress, PATH_TOTAL_LENGTH));
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    if (remaining <= length) {
      const start = PATH_POINTS[index];
      const end = PATH_POINTS[index + 1];
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    remaining -= length;
  }
  return PATH_POINTS[PATH_POINTS.length - 1];
}

export function accuracy(stats: SubjectStats): number {
  if (stats.total === 0) return 0;
  return Math.round((stats.correct / stats.total) * 100);
}

function updateWaveSpawner(state: KnowledgeGameState, dt: number): void {
  if (state.wave === 0 && answeredQuestionCount(state) === 0) {
    state.nextWaveIn = OPENING_PREP_SECONDS;
    return;
  }

  if (state.spawnQueue > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy(state);
      state.spawnQueue -= 1;
      state.spawnTimer = Math.max(0.62, 1.12 - state.wave * 0.035);
    }
    return;
  }

  if (state.wave >= state.targetWaves) return;
  state.nextWaveIn -= dt;
  if (state.nextWaveIn <= 0) {
    state.wave += 1;
    const pressureAdds = state.pressure >= 72 ? 2 : state.pressure >= 42 ? 1 : 0;
    const masteryRelief = state.masteryFocus >= 82 ? 1 : 0;
    state.spawnQueue = Math.max(4, 4 + state.wave + Math.floor(state.grade / 2) + pressureAdds - masteryRelief);
    state.spawnTimer = 0.1;
    state.nextWaveIn = Math.max(8.5, 18 - state.wave * 0.55 - pressureAdds * 0.8 + masteryRelief * 1.4);
    state.pressure = Math.min(100, state.pressure + 4 + pressureAdds * 2);
    pushLearningEvent(state, 'info', `第 ${state.wave} 波開始`, describeWavePreview(state.wave, state.grade));
  }
}

function answeredQuestionCount(state: KnowledgeGameState): number {
  return Object.values(state.stats).reduce((sum, item) => sum + item.total, 0);
}

function updateEnemies(state: KnowledgeGameState, dt: number): void {
  for (const enemy of state.enemies) {
    const slowFactor = enemy.slowTimer > 0 ? 0.48 : 1;
    enemy.progress += enemy.speed * slowFactor * dt;
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
  }

  const survivors: EnemyState[] = [];
  for (const enemy of state.enemies) {
    if (enemy.progress >= PATH_TOTAL_LENGTH) {
      state.coreHp = Math.max(0, state.coreHp - enemy.leakDamage);
      state.combo = 0;
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
}

function updateTowers(state: KnowledgeGameState, dt: number): void {
  for (const tower of state.towers) {
    const towerType = getTowerType(tower.typeId);
    const boosted = state.subjectBoosts[towerType.subject] > 0;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const slot = getTowerSlot(tower.slotId);
    if (!slot) continue;

    const target = findTarget(state, slot, towerType.range, tower.targetMode);
    if (!target) continue;

    tower.cooldown = towerType.fireRate * Math.max(0.48, 1 - (tower.level - 1) * 0.1) * (boosted ? 0.86 : 1);
    tower.shots += 1;
    const damage = towerType.damage * (1 + (tower.level - 1) * 0.48) * (boosted ? 1.2 : 1);
    target.hp -= damage;
    if (towerType.slowSeconds > 0) {
      target.slowTimer = Math.max(target.slowTimer, towerType.slowSeconds + (tower.level - 1) * 0.22);
    }
    const targetPoint = pointAtProgress(target.progress);
    state.effects.push({
      id: state.nextEffectId++,
      from: slot,
      to: targetPoint,
      color: towerType.color,
      ttl: towerType.slowSeconds > 0 ? 0.42 : 0.34,
      kind: towerType.slowSeconds > 0 ? 'slow' : 'bolt',
    });

    if (towerType.splash > 0) {
      applySplashDamage(state, target, targetPoint, towerType.splash, damage * 0.55, towerType.color);
    }
  }
}

function collectDefeatedEnemies(state: KnowledgeGameState): void {
  const survivors: EnemyState[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      state.energy += enemy.reward;
      state.score += 42 + enemy.reward * 4 + state.wave * 6;
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
}

function updateEffects(state: KnowledgeGameState, dt: number): void {
  for (const effect of state.effects) {
    effect.ttl -= dt;
  }
  state.effects = state.effects.filter((effect) => effect.ttl > 0);
  for (const event of state.learningEvents) {
    event.ttl -= dt;
  }
  state.learningEvents = state.learningEvents.filter((event) => event.ttl > 0);
}

function updateSubjectBoosts(state: KnowledgeGameState, dt: number): void {
  for (const subject of Object.keys(state.subjectBoosts) as SubjectId[]) {
    state.subjectBoosts[subject] = Math.max(0, state.subjectBoosts[subject] - dt);
  }
}

function checkEndState(state: KnowledgeGameState): void {
  if (state.coreHp <= 0) {
    state.status = 'lost';
    return;
  }
  if (state.wave >= state.targetWaves && state.spawnQueue === 0 && state.enemies.length === 0) {
    state.status = 'won';
  }
}

function spawnEnemy(state: KnowledgeGameState): void {
  const typeId = chooseEnemyType(state.wave, state.spawnQueue);
  const enemyType = getEnemyType(typeId);
  const waveScale = 1 + state.wave * 0.14;
  const maxHp = Math.round(enemyType.hp * state.config.enemyScale * waveScale);
  state.enemies.push({
    id: state.nextEnemyId++,
    typeId,
    hp: maxHp,
    maxHp,
    progress: 0,
    speed: enemyType.speed * (1 + (state.grade - 2) * 0.025),
    slowTimer: 0,
    leakDamage: enemyType.leakDamage,
    reward: enemyType.reward + Math.floor(state.wave / 2),
  });
}

function chooseEnemyType(wave: number, queue: number): EnemyTypeId {
  if (wave >= 4 && wave % 4 === 0 && queue <= 2) return 'blank';
  if (wave >= 3 && queue % 4 === 0) return 'clock';
  if (wave >= 2 && queue % 3 === 0) return 'careless';
  return ENEMY_TYPES[(wave + queue) % 2].id;
}

export function previewEnemyTypes(wave: number, grade: GradeId): EnemyTypeId[] {
  const count = 4 + wave + Math.floor(grade / 2);
  const types = new Set<EnemyTypeId>();
  for (let queue = count; queue >= 1; queue -= 1) {
    types.add(chooseEnemyType(wave, queue));
  }
  return [...types];
}

export function describeWavePreview(wave: number, grade: GradeId): string {
  const names = previewEnemyTypes(wave, grade)
    .map((typeId) => getEnemyType(typeId).name)
    .join('、');
  return `預估出現：${names}`;
}

function findTarget(state: KnowledgeGameState, slot: Point, range: number, targetMode: TowerTargetMode): EnemyState | undefined {
  let selected: EnemyState | undefined;
  let selectedScore = Number.NEGATIVE_INFINITY;
  const rangeSq = range * range;
  for (const enemy of state.enemies) {
    const point = pointAtProgress(enemy.progress);
    if (distanceSq(slot, point) > rangeSq) continue;
    const score = targetScore(enemy, targetMode);
    if (score > selectedScore) {
      selected = enemy;
      selectedScore = score;
    }
  }
  return selected;
}

function targetScore(enemy: EnemyState, targetMode: TowerTargetMode): number {
  if (targetMode === 'fast') return enemy.speed + enemy.progress / 1000;
  if (targetMode === 'weak') return -enemy.hp + enemy.progress / 1000;
  if (targetMode === 'strong') return enemy.hp + enemy.maxHp * 0.25 + enemy.progress / 1000;
  return enemy.progress;
}

function applySplashDamage(
  state: KnowledgeGameState,
  target: EnemyState,
  targetPoint: Point,
  radius: number,
  damage: number,
  color: string,
): void {
  const radiusSq = radius * radius;
  for (const enemy of state.enemies) {
    if (enemy.id === target.id) continue;
    const point = pointAtProgress(enemy.progress);
    if (distanceSq(point, targetPoint) <= radiusSq) {
      enemy.hp -= damage;
    }
  }
  state.effects.push({
    id: state.nextEffectId++,
    from: targetPoint,
    to: targetPoint,
    color,
    ttl: 0.52,
    kind: 'splash',
  });
}

function advanceQuestion(state: KnowledgeGameState): void {
  state.questionCursor += 1;
  if (state.questionCursor >= state.questionDeck.length) {
    state.questionDeck = shuffled(questionsForSelection(state.grade, state.quizFilter));
    state.questionCursor = 0;
  }
  state.currentQuestion = state.questionDeck[state.questionCursor];
}

function addReviewQuestion(state: KnowledgeGameState, question: QuizQuestion): void {
  if (!state.reviewQuestionIds.includes(question.id)) {
    state.reviewQuestionIds.push(question.id);
  }
  const retryOffset = Math.max(2, 5 - state.mistakeStreak);
  const retryIndex = Math.min(state.questionCursor + retryOffset, state.questionDeck.length);
  state.questionDeck.splice(retryIndex, 0, question);
}

export function prioritizeReviewQuestion(state: KnowledgeGameState, question: QuizQuestion, retryOffset = 0): void {
  if (!state.reviewQuestionIds.includes(question.id)) {
    state.reviewQuestionIds.push(question.id);
  }
  const cursor = Math.min(state.questionCursor, state.questionDeck.length);
  state.questionDeck = state.questionDeck.filter((deckQuestion, index) => index < cursor || deckQuestion.id !== question.id);
  const retryIndex = Math.min(cursor + Math.max(0, retryOffset), state.questionDeck.length);
  state.questionDeck.splice(retryIndex, 0, question);
  state.currentQuestion = state.questionDeck[state.questionCursor] ?? question;
}

function pushLearningEvent(state: KnowledgeGameState, tone: LearningEvent['tone'], title: string, detail: string): void {
  state.learningEvents.unshift({
    id: state.nextLearningEventId++,
    tone,
    title,
    detail,
    ttl: 5.2,
  });
  state.learningEvents = state.learningEvents.slice(0, 4);
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
