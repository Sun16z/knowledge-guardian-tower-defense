import {
  ENEMY_TYPES,
  PATH_POINTS,
  TOWER_SLOTS,
  getEnemyType,
  getGradeConfig,
  getTowerType,
  questionsForSelection,
  type QuizFilter,
  type EnemyTypeId,
  type GradeConfig,
  type GradeId,
  type Point,
  type QuizQuestion,
  type SubjectId,
  type TowerSlot,
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
  questionDeck: QuizQuestion[];
  questionCursor: number;
  currentQuestion: QuizQuestion;
  lastAnswer?: AnswerResult;
  stats: Record<SubjectId, SubjectStats>;
  nextEnemyId: number;
  nextEffectId: number;
}

const segmentLengths = PATH_POINTS.slice(1).map((point, index) => distance(PATH_POINTS[index], point));
export const PATH_TOTAL_LENGTH = segmentLengths.reduce((sum, length) => sum + length, 0);

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
    questionDeck,
    questionCursor: 0,
    currentQuestion: questionDeck[0],
    stats: {
      language: { total: 0, correct: 0 },
      english: { total: 0, correct: 0 },
      math: { total: 0, correct: 0 },
      science: { total: 0, correct: 0 },
      social: { total: 0, correct: 0 },
    },
    nextEnemyId: 1,
    nextEffectId: 1,
  };
}

export function startGame(state: KnowledgeGameState): void {
  if (state.status === 'ready') {
    state.status = 'running';
    state.nextWaveIn = 1.1;
  }
}

export function tickGame(state: KnowledgeGameState, deltaSeconds: number): void {
  if (state.status !== 'running') return;
  const dt = Math.min(deltaSeconds, 0.05);
  state.time += dt;

  updateWaveSpawner(state, dt);
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
  stats.total += 1;

  let energyDelta = 8;
  if (correct) {
    stats.correct += 1;
    state.combo += 1;
    energyDelta = 32 + state.grade * 3 + Math.min(state.combo * 3, 21);
    state.score += 120 + state.combo * 18 + state.grade * 10;
  } else {
    state.combo = 0;
    state.score = Math.max(0, state.score - 15);
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
  if (!correct) {
    const retryIndex = Math.min(state.questionCursor + 3, state.questionDeck.length);
    state.questionDeck.splice(retryIndex, 0, question);
  }
  advanceQuestion(state);
  return result;
}

export function buildTower(state: KnowledgeGameState, slotId: string, typeId: TowerTypeId): boolean {
  const slot = getTowerSlot(slotId);
  const towerType = getTowerType(typeId);
  if (!slot || getTowerAtSlot(state, slotId) || state.energy < towerType.cost || state.status === 'lost') {
    return false;
  }
  state.energy -= towerType.cost;
  state.towers.push({ slotId, typeId, level: 1, cooldown: 0.15, shots: 0 });
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
    state.spawnQueue = 4 + state.wave + Math.floor(state.grade / 2);
    state.spawnTimer = 0.1;
    state.nextWaveIn = Math.max(9.5, 18 - state.wave * 0.55);
  }
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
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const slot = getTowerSlot(tower.slotId);
    if (!slot) continue;

    const target = findTarget(state, slot, towerType.range);
    if (!target) continue;

    tower.cooldown = towerType.fireRate * Math.max(0.52, 1 - (tower.level - 1) * 0.1);
    tower.shots += 1;
    const damage = towerType.damage * (1 + (tower.level - 1) * 0.48);
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

function findTarget(state: KnowledgeGameState, slot: Point, range: number): EnemyState | undefined {
  let selected: EnemyState | undefined;
  let selectedProgress = -1;
  const rangeSq = range * range;
  for (const enemy of state.enemies) {
    const point = pointAtProgress(enemy.progress);
    if (distanceSq(slot, point) <= rangeSq && enemy.progress > selectedProgress) {
      selected = enemy;
      selectedProgress = enemy.progress;
    }
  }
  return selected;
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
