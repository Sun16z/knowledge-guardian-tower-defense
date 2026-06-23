import { EXPANDED_QUESTION_BANK } from './expanded-question-bank';

export type GradeId = 1 | 2 | 3 | 4 | 5 | 6;
export type SubjectId = 'language' | 'english' | 'math' | 'science' | 'social';
export type TermId = 'first' | 'second';
export type ExamId = 'midterm' | 'final';
export type QuestionDifficulty = '基礎' | '進階' | '挑戰';
export type SubjectFilter = SubjectId | 'all';
export type TowerTypeId = 'number' | 'word' | 'english' | 'nature' | 'map';
export type EnemyTypeId = 'fog' | 'careless' | 'clock' | 'blank';

export interface GradeConfig {
  id: GradeId;
  label: string;
  title: string;
  stageName: string;
  startEnergy: number;
  targetWaves: number;
  enemyScale: number;
}

export interface QuizQuestion {
  id: string;
  grade: GradeId;
  subject: SubjectId;
  term?: TermId;
  exam?: ExamId;
  difficulty?: QuestionDifficulty;
  prompt: string;
  options: string[];
  answerIndex: number;
  hint?: string;
  explanation: string;
}

export interface QuizFilter {
  term: TermId;
  exam: ExamId;
  subject: SubjectFilter;
}

export interface TowerType {
  id: TowerTypeId;
  name: string;
  shortName: string;
  subject: SubjectId;
  cost: number;
  upgradeBaseCost: number;
  damage: number;
  range: number;
  fireRate: number;
  splash: number;
  slowSeconds: number;
  color: string;
  light: string;
  role: string;
}

export interface EnemyType {
  id: EnemyTypeId;
  name: string;
  hp: number;
  speed: number;
  leakDamage: number;
  reward: number;
  color: string;
  light: string;
}

export interface TowerSlot {
  id: string;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export const GRADE_CONFIGS: GradeConfig[] = [
  { id: 1, label: '小一', title: '注音與數量起點', stageName: '入門星田', startEnergy: 170, targetWaves: 5, enemyScale: 0.78 },
  { id: 2, label: '小二', title: '基礎運算森林', stageName: '九九樹海', startEnergy: 160, targetWaves: 6, enemyScale: 0.88 },
  { id: 3, label: '小三', title: '長算式溪谷', stageName: '乘除溪谷', startEnergy: 150, targetWaves: 7, enemyScale: 0.98 },
  { id: 4, label: '小四', title: '分數與量感高原', stageName: '量感高原', startEnergy: 145, targetWaves: 8, enemyScale: 1.08 },
  { id: 5, label: '小五', title: '比例推理群島', stageName: '比例群島', startEnergy: 140, targetWaves: 9, enemyScale: 1.18 },
  { id: 6, label: '小六', title: '整合挑戰星港', stageName: '畢業星港', startEnergy: 135, targetWaves: 10, enemyScale: 1.3 },
];

export const SUBJECTS: Record<SubjectId, { label: string; color: string }> = {
  language: { label: '國語', color: '#ef4444' },
  english: { label: '英文', color: '#8b5cf6' },
  math: { label: '數學', color: '#f59e0b' },
  science: { label: '自然', color: '#10b981' },
  social: { label: '社會', color: '#3b82f6' },
};

export const TERM_OPTIONS: Array<{ id: TermId; label: string }> = [
  { id: 'first', label: '上學期' },
  { id: 'second', label: '下學期' },
];

export const EXAM_OPTIONS: Array<{ id: ExamId; label: string }> = [
  { id: 'midterm', label: '期中考' },
  { id: 'final', label: '期末考' },
];

export const SUBJECT_FILTER_OPTIONS: Array<{ id: SubjectFilter; label: string }> = [
  { id: 'all', label: '全科' },
  { id: 'language', label: '國語' },
  { id: 'english', label: '英文' },
  { id: 'math', label: '數學' },
  { id: 'science', label: '自然' },
  { id: 'social', label: '社會' },
];

export const DEFAULT_QUIZ_FILTER: QuizFilter = {
  term: 'first',
  exam: 'midterm',
  subject: 'all',
};

export const TOWER_TYPES: TowerType[] = [
  {
    id: 'number',
    name: '數感砲塔',
    shortName: '數感',
    subject: 'math',
    cost: 70,
    upgradeBaseCost: 50,
    damage: 34,
    range: 150,
    fireRate: 0.72,
    splash: 0,
    slowSeconds: 0,
    color: '#f97316',
    light: '#fed7aa',
    role: '高傷害',
  },
  {
    id: 'english',
    name: '英語音波塔',
    shortName: '英文',
    subject: 'english',
    cost: 65,
    upgradeBaseCost: 48,
    damage: 21,
    range: 138,
    fireRate: 0.58,
    splash: 0,
    slowSeconds: 0.65,
    color: '#7c3aed',
    light: '#ede9fe',
    role: '連擊',
  },
  {
    id: 'word',
    name: '字詞連射塔',
    shortName: '字詞',
    subject: 'language',
    cost: 55,
    upgradeBaseCost: 42,
    damage: 17,
    range: 132,
    fireRate: 0.38,
    splash: 0,
    slowSeconds: 0,
    color: '#e11d48',
    light: '#fecdd3',
    role: '快攻',
  },
  {
    id: 'nature',
    name: '自然冰晶塔',
    shortName: '自然',
    subject: 'science',
    cost: 75,
    upgradeBaseCost: 54,
    damage: 20,
    range: 140,
    fireRate: 0.82,
    splash: 0,
    slowSeconds: 1.55,
    color: '#0891b2',
    light: '#cffafe',
    role: '緩速',
  },
  {
    id: 'map',
    name: '地圖共鳴塔',
    shortName: '地圖',
    subject: 'social',
    cost: 95,
    upgradeBaseCost: 64,
    damage: 22,
    range: 128,
    fireRate: 1.05,
    splash: 78,
    slowSeconds: 0,
    color: '#2563eb',
    light: '#dbeafe',
    role: '範圍',
  },
];

export const ENEMY_TYPES: EnemyType[] = [
  { id: 'fog', name: '迷霧怪', hp: 70, speed: 42, leakDamage: 1, reward: 9, color: '#64748b', light: '#cbd5e1' },
  { id: 'careless', name: '粗心怪', hp: 92, speed: 34, leakDamage: 2, reward: 12, color: '#a855f7', light: '#e9d5ff' },
  { id: 'clock', name: '時間裂影', hp: 54, speed: 62, leakDamage: 1, reward: 11, color: '#0f766e', light: '#99f6e4' },
  { id: 'blank', name: '空白巨塊', hp: 170, speed: 24, leakDamage: 3, reward: 19, color: '#475569', light: '#e2e8f0' },
];

export const PATH_POINTS: Point[] = [
  { x: 34, y: 326 },
  { x: 170, y: 326 },
  { x: 170, y: 160 },
  { x: 364, y: 160 },
  { x: 364, y: 444 },
  { x: 594, y: 444 },
  { x: 594, y: 236 },
  { x: 792, y: 236 },
  { x: 942, y: 354 },
];

export const TOWER_SLOTS: TowerSlot[] = [
  { id: 'a', x: 96, y: 222 },
  { id: 'b', x: 250, y: 250 },
  { id: 'c', x: 286, y: 76 },
  { id: 'd', x: 470, y: 258 },
  { id: 'e', x: 256, y: 516 },
  { id: 'f', x: 508, y: 548 },
  { id: 'g', x: 704, y: 348 },
  { id: 'h', x: 704, y: 122 },
  { id: 'i', x: 872, y: 452 },
];

const q = (
  grade: GradeId,
  subject: SubjectId,
  id: string,
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
): QuizQuestion => ({ id: `g${grade}-${subject}-${id}`, grade, subject, prompt, options, answerIndex, explanation });

const CORE_QUESTION_BANK: QuizQuestion[] = [
  q(2, 'math', 'm01', '7 + 8 = ?', ['13', '14', '15', '16'], 2, '7 加 8 等於 15。'),
  q(2, 'math', 'm02', '36 裡面有幾個十和幾個一？', ['3 個十 6 個一', '6 個十 3 個一', '2 個十 16 個一', '30 個十 6 個一'], 0, '36 的十位是 3，個位是 6。'),
  q(2, 'math', 'm03', '一盒鉛筆有 10 枝，3 盒共有幾枝？', ['13', '20', '30', '40'], 2, '10 的 3 倍是 30。'),
  q(2, 'language', 'l01', '「晴朗」最接近哪一個意思？', ['天氣很暗', '天氣明亮', '聲音很大', '動作很慢'], 1, '晴朗常用來形容天氣明亮、少雲。'),
  q(2, 'language', 'l02', '下列哪一個量詞最適合：「一＿書」？', ['條', '本', '朵', '雙'], 1, '書通常用「本」當量詞。'),
  q(2, 'science', 's01', '植物通常需要哪一項來行光合作用？', ['陽光', '沙子', '鐵尺', '塑膠袋'], 0, '植物需要陽光、水與空氣等條件。'),
  q(2, 'science', 's02', '下列哪一個是液體？', ['石頭', '水', '木頭', '鐵釘'], 1, '水在常溫下通常是液體。'),
  q(2, 'social', 'so01', '在學校走廊應該怎麼做？', ['奔跑追逐', '大聲尖叫', '慢慢走', '推擠同學'], 2, '走廊慢慢走比較安全。'),

  q(3, 'math', 'm01', '8 × 7 = ?', ['48', '54', '56', '64'], 2, '八七五十六。'),
  q(3, 'math', 'm02', '96 ÷ 3 = ?', ['23', '32', '36', '39'], 1, '96 平分成 3 份，每份 32。'),
  q(3, 'math', 'm03', '245 + 178 = ?', ['413', '423', '433', '443'], 1, '245 加 178 等於 423。'),
  q(3, 'language', 'l01', '「專心」的相反詞較接近哪一個？', ['認真', '分心', '安靜', '清楚'], 1, '專心的相反意思接近分心。'),
  q(3, 'language', 'l02', '「他把教室打掃得一塵不染」表示教室很？', ['吵', '暗', '乾淨', '擁擠'], 2, '一塵不染常形容非常乾淨。'),
  q(3, 'science', 's01', '磁鐵最容易吸住哪一種物品？', ['鐵釘', '橡皮擦', '紙張', '玻璃杯'], 0, '磁鐵常能吸住含鐵物品。'),
  q(3, 'science', 's02', '聲音是由物體的什麼產生？', ['發光', '振動', '變色', '融化'], 1, '物體振動會產生聲音。'),
  q(3, 'social', 'so01', '看地圖時，通常上方代表哪一個方向？', ['東', '西', '南', '北'], 3, '多數地圖上方代表北方。'),

  q(4, 'math', 'm01', '1/2 和 2/4 的大小關係是？', ['1/2 比較大', '2/4 比較大', '一樣大', '無法比較'], 2, '2/4 約分後是 1/2。'),
  q(4, 'math', 'm02', '一個長方形長 8 公分、寬 5 公分，面積是多少？', ['13 平方公分', '26 平方公分', '40 平方公分', '80 平方公分'], 2, '長方形面積是長乘以寬，8×5=40。'),
  q(4, 'math', 'm03', '3.6 + 2.7 = ?', ['5.3', '6.1', '6.3', '7.3'], 2, '3.6 加 2.7 等於 6.3。'),
  q(4, 'language', 'l01', '「迫不及待」表示心情如何？', ['很想立刻做', '完全不想做', '慢慢等待', '非常害怕'], 0, '迫不及待表示急著想開始。'),
  q(4, 'language', 'l02', '閱讀文章時，找出每段重點最能幫助理解什麼？', ['字體顏色', '文章主旨', '頁碼', '標點數量'], 1, '段落重點能幫助掌握文章主旨。'),
  q(4, 'science', 's01', '下列哪一項屬於可再生資源？', ['太陽能', '煤', '石油', '天然氣'], 0, '太陽能可以持續取得。'),
  q(4, 'science', 's02', '水蒸氣遇冷變成小水滴，稱為？', ['蒸發', '凝結', '燃燒', '沉澱'], 1, '氣態水遇冷變液態水是凝結。'),
  q(4, 'social', 'so01', '台灣常見的地方行政單位包含哪一項？', ['縣市', '星球', '海流', '雲層'], 0, '縣市是常見的地方行政單位。'),

  q(5, 'math', 'm01', '0.75 等於哪一個分數？', ['1/2', '2/3', '3/4', '4/5'], 2, '0.75 等於 75/100，也就是 3/4。'),
  q(5, 'math', 'm02', '一本書原價 200 元，打 8 折後是多少元？', ['120', '140', '160', '180'], 2, '8 折是原價的 0.8，200×0.8=160。'),
  q(5, 'math', 'm03', '2.4 × 3 = ?', ['6.2', '7.2', '8.2', '9.2'], 1, '2.4 的 3 倍是 7.2。'),
  q(5, 'language', 'l01', '「畫龍點睛」常用來形容什麼？', ['最後補上關鍵', '重複很多次', '完全沒完成', '故意逃避'], 0, '畫龍點睛比喻補上最關鍵的一筆。'),
  q(5, 'language', 'l02', '寫說明文時，最重要的是？', ['內容清楚有順序', '只寫心情', '越短越好', '不用標點'], 0, '說明文重視清楚、條理與正確資訊。'),
  q(5, 'science', 's01', '槓桿原理常和哪一個因素有關？', ['支點位置', '顏色深淺', '聲音大小', '氣味濃淡'], 0, '支點位置會影響施力效果。'),
  q(5, 'science', 's02', '地球自轉造成哪一種現象？', ['四季', '晝夜', '潮汐全部消失', '月亮發光'], 1, '地球自轉造成晝夜交替。'),
  q(5, 'social', 'so01', '民主社會中，投票主要用來表達什麼？', ['個人選擇', '天氣變化', '商品價格', '道路長度'], 0, '投票是表達選擇與參與公共事務的方法。'),

  q(6, 'math', 'm01', '某數的 25% 是 30，某數是多少？', ['60', '90', '120', '150'], 2, '25% 是四分之一，30×4=120。'),
  q(6, 'math', 'm02', '圓周率常用哪一個近似值？', ['1.41', '2.18', '3.14', '6.28'], 2, '圓周率常以 3.14 近似。'),
  q(6, 'math', 'm03', '3:5 的比值是多少？', ['0.3', '0.6', '1.5', '2.0'], 1, '3 除以 5 等於 0.6。'),
  q(6, 'language', 'l01', '「推論」在閱讀中代表什麼？', ['只抄題目', '根據線索判斷', '跳過文章', '只看圖片'], 1, '推論是根據文章線索做合理判斷。'),
  q(6, 'language', 'l02', '演說稿通常需要清楚的開頭、內容和？', ['結尾', '塗鴉', '亂碼', '空白頁'], 0, '演說稿需要完整結構。'),
  q(6, 'science', 's01', '月亮本身不發光，我們看到月亮是因為它反射什麼？', ['太陽光', '路燈', '火山光', '海浪光'], 0, '月亮反射太陽光。'),
  q(6, 'science', 's02', '食物鏈中，植物通常扮演什麼角色？', ['生產者', '消費者', '分解者', '觀察者'], 0, '植物能製造養分，通常是生產者。'),
  q(6, 'social', 'so01', '討論公共議題時，較好的做法是？', ['聽取不同意見', '只大聲說話', '拒絕資料', '嘲笑別人'], 0, '公共討論需要聽取不同觀點並使用資料。'),
];

export const QUESTION_BANK: QuizQuestion[] = uniqueQuestions([...CORE_QUESTION_BANK, ...EXPANDED_QUESTION_BANK]);

export function getGradeConfig(grade: GradeId): GradeConfig {
  return GRADE_CONFIGS.find((item) => item.id === grade) ?? GRADE_CONFIGS[0];
}

export function questionsForGrade(grade: GradeId): QuizQuestion[] {
  return QUESTION_BANK.filter((question) => question.grade === grade);
}

export function questionsForSelection(grade: GradeId, filter: QuizFilter): QuizQuestion[] {
  const filtered = QUESTION_BANK.filter(
    (question) =>
      question.grade === grade &&
      (!question.term || question.term === filter.term) &&
      (!question.exam || question.exam === filter.exam) &&
      (filter.subject === 'all' || question.subject === filter.subject),
  );
  if (filtered.length > 0) return filtered;
  return questionsForGrade(grade);
}

export function getTowerType(id: TowerTypeId): TowerType {
  return TOWER_TYPES.find((tower) => tower.id === id) ?? TOWER_TYPES[0];
}

export function getEnemyType(id: EnemyTypeId): EnemyType {
  return ENEMY_TYPES.find((enemy) => enemy.id === id) ?? ENEMY_TYPES[0];
}

function uniqueQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}
