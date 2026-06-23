import type { ExamId, GradeId, QuestionDifficulty, QuizQuestion, SubjectId, TermId } from './content';

interface DraftQuestion {
  grade: GradeId;
  subject: SubjectId;
  term: TermId;
  exam: ExamId;
  difficulty: QuestionDifficulty;
  id: string;
  prompt: string;
  answer: string;
  wrongs: string[];
  hint: string;
  explanation: string;
}

type TextTemplate = {
  prompt: string;
  answer: string;
  wrongs: string[];
  hint: string;
  explanation: string;
};

const GRADES: GradeId[] = [1, 2, 3, 4, 5, 6];
const TERMS: TermId[] = ['first', 'second'];
const EXAMS: ExamId[] = ['midterm', 'final'];
const SUBJECTS: SubjectId[] = ['language', 'english', 'math', 'science', 'social'];

export const EXPANDED_QUESTION_BANK: QuizQuestion[] = GRADES.flatMap((grade) =>
  TERMS.flatMap((term) =>
    EXAMS.flatMap((exam) =>
      SUBJECTS.flatMap((subject) => buildSubjectQuestions(grade, term, exam, subject)),
    ),
  ),
);

function buildSubjectQuestions(grade: GradeId, term: TermId, exam: ExamId, subject: SubjectId): QuizQuestion[] {
  if (subject === 'math') return buildMathQuestions(grade, term, exam);
  const templates = subjectTemplates(subject, grade, term, exam);
  return templates.map((template, index) =>
    question({
      grade,
      subject,
      term,
      exam,
      difficulty: difficultyFor(grade, index),
      id: `${subject}-${term}-${exam}-${index}`,
      ...template,
    }),
  );
}

function buildMathQuestions(grade: GradeId, term: TermId, exam: ExamId): QuizQuestion[] {
  const level = grade * 10 + (term === 'second' ? 4 : 0) + (exam === 'final' ? 2 : 0);
  const questions: DraftQuestion[] = [];

  if (grade === 1) {
    const a = 8 + level;
    const b = 5 + (level % 7);
    questions.push(
      mathDraft(grade, term, exam, 'math-add', `${a} + ${b} = ?`, a + b, [a + b - 1, a + b + 1, a + b + 3], '先從較大的數往後數。', `${a} 加 ${b} 等於 ${a + b}。`),
      mathDraft(grade, term, exam, 'math-sub', `${a + 12} - ${b} = ?`, a + 12 - b, [a + 10 - b, a + 12 - b + 2, a + 12 - b - 1], '減法可以想成往回數。', `${a + 12} 減 ${b} 等於 ${a + 12 - b}。`),
      textDraft(grade, term, exam, 'math-order', `下列哪個數最大？`, String(a + 14), [String(a + 4), String(a + 9), String(a + 1)], '比較十位，再比較個位。', `${a + 14} 比其他選項都大。`, 'math'),
    );
  } else if (grade === 2) {
    const a = 24 + level;
    const b = 17 + (level % 9);
    questions.push(
      mathDraft(grade, term, exam, 'math-two-add', `${a} + ${b} = ?`, a + b, [a + b - 10, a + b + 1, a + b + 10], '個位相加滿十要進位。', `${a} 加 ${b} 等於 ${a + b}。`),
      mathDraft(grade, term, exam, 'math-two-sub', `${a + 35} - ${b} = ?`, a + 35 - b, [a + 34 - b, a + 25 - b, a + 35 - b + 10], '個位不夠減時要向十位借位。', `${a + 35} 減 ${b} 等於 ${a + 35 - b}。`),
      mathDraft(grade, term, exam, 'math-times', `${3 + (level % 5)} × ${4 + (level % 4)} = ?`, (3 + (level % 5)) * (4 + (level % 4)), [18, 24, 32], '可以用連加或九九乘法。', '乘法表示幾個相同數相加。'),
    );
  } else if (grade === 3) {
    const a = 18 + level;
    const b = 3 + (level % 6);
    questions.push(
      mathDraft(grade, term, exam, 'math-mul', `${a} × ${b} = ?`, a * b, [a * b - b, a * b + a, a + b], '先拆成十位與個位再乘。', `${a} 乘以 ${b} 等於 ${a * b}。`),
      mathDraft(grade, term, exam, 'math-div', `${a * b} ÷ ${b} = ?`, a, [a - 2, a + 3, b], '除法可以用乘法反推。', `因為 ${a} × ${b} = ${a * b}，所以答案是 ${a}。`),
      mathDraft(grade, term, exam, 'math-perimeter', `長方形長 ${b + 5} 公分、寬 ${b + 2} 公分，周長是多少？`, (b + 5 + b + 2) * 2, [b * 2 + 7, (b + 5) * (b + 2), (b + 5 + b + 2)], '周長是四條邊加起來。', '長方形周長=(長+寬)×2。', '公分'),
    );
  } else if (grade === 4) {
    const a = 3 + (level % 5);
    const b = 6 + (level % 7);
    questions.push(
      textDraft(grade, term, exam, 'math-frac', `下列哪個分數和 ${a}/${a * 2} 一樣大？`, '1/2', [`${a}/${a + 2}`, `${a + 1}/${a * 2}`, `${a * 2}/${a}`], '分子分母同除以相同數。', `${a}/${a * 2} 約分後是 1/2。`, 'math'),
      mathDraft(grade, term, exam, 'math-dec', `${a}.${b} + ${b}.${a} = ?`, Number(`${a}.${b}`) + Number(`${b}.${a}`), [a + b, a + b + 0.1, a + b + 1.1], '小數點要上下對齊。', '小數相加時，整數位與小數位分別相加。'),
      mathDraft(grade, term, exam, 'math-area', `長方形長 ${a + 7} 公分、寬 ${b} 公分，面積是多少？`, (a + 7) * b, [a + 7 + b, (a + 7 + b) * 2, (a + 7) * b + 10], '面積是長乘以寬。', `面積=${a + 7}×${b}=${(a + 7) * b}。`, '平方公分'),
    );
  } else if (grade === 5) {
    const a = 12 + (level % 8);
    const b = 4 + (level % 6);
    questions.push(
      mathDraft(grade, term, exam, 'math-percent', `${a * 20} 的 25% 是多少？`, a * 5, [a * 4, a * 6, a * 10], '25% 是四分之一。', `${a * 20} ÷ 4 = ${a * 5}。`),
      mathDraft(grade, term, exam, 'math-volume', `長方體長 ${a}、寬 ${b}、高 3，體積是多少？`, a * b * 3, [a * b, (a + b) * 3, a * b * 2], '體積是長×寬×高。', `${a}×${b}×3=${a * b * 3}。`),
      textDraft(grade, term, exam, 'math-factor', `${a * b} 和 ${a * 3} 的最大公因數最可能是多少？`, String(a), [String(b), String(a * 3), String(a * b)], '找兩個數共同的最大因數。', `${a} 同時可以整除 ${a * b} 和 ${a * 3}。`, 'math'),
    );
  } else {
    const a = 20 + (level % 9);
    const b = 3 + (level % 5);
    questions.push(
      mathDraft(grade, term, exam, 'math-ratio', `甲乙比為 ${b}:${b + 2}，總量 ${a * (b * 2 + 2)}，甲是多少？`, a * b, [a * (b + 2), a * 2, a * (b + 1)], '先算總份數，再求一份量。', `總份數 ${b + b + 2}，一份是 ${a}，甲是 ${a * b}。`),
      mathDraft(grade, term, exam, 'math-circle', `半徑 ${b + 4} 公分的圓，直徑是多少？`, (b + 4) * 2, [b + 4, (b + 4) * 3.14, (b + 4) * 4], '直徑是半徑的 2 倍。', `${b + 4}×2=${(b + 4) * 2}。`, '公分'),
      mathDraft(grade, term, exam, 'math-speed', `${a * b} 公里用 ${b} 小時走完，平均時速是多少？`, a, [a - 5, a + 5, a * b], '速率=距離÷時間。', `${a * b}÷${b}=${a}。`, '公里'),
    );
  }

  const reasoningBase = grade * 9 + (term === 'second' ? 6 : 0) + (exam === 'final' ? 4 : 0);
  questions.push(
    mathDraft(
      grade,
      term,
      exam,
      'math-word',
      `知識塔有 ${reasoningBase} 點能量，又答對 ${grade + 4} 題，每題加 ${grade + 5} 點，總共增加後是多少？`,
      reasoningBase + (grade + 4) * (grade + 5),
      [reasoningBase + grade + 4 + grade + 5, reasoningBase + (grade + 4) * grade, reasoningBase + (grade + 5) * 2],
      '先算答題得到的總能量，再加上原本能量。',
      `答題能量是 ${grade + 4}×${grade + 5}，再加 ${reasoningBase}。`,
    ),
    mathDraft(
      grade,
      term,
      exam,
      'math-pattern',
      `數列 ${grade + 2}、${grade + 5}、${grade + 8}、${grade + 11}，下一個數是？`,
      grade + 14,
      [grade + 12, grade + 13, grade + 16],
      '先找相鄰兩數差多少。',
      '每次增加 3，所以下一個是再加 3。',
    ),
  );

  return questions.map(question);
}

function mathDraft(
  grade: GradeId,
  term: TermId,
  exam: ExamId,
  id: string,
  prompt: string,
  answer: number,
  wrongs: number[],
  hint: string,
  explanation: string,
  unit = '',
): DraftQuestion {
  const format = (value: number) => `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${unit}`;
  return {
    grade,
    subject: 'math',
    term,
    exam,
    difficulty: difficultyFor(grade, 1),
    id: `${id}-${term}-${exam}`,
    prompt,
    answer: format(answer),
    wrongs: wrongs.map(format),
    hint,
    explanation,
  };
}

function textDraft(
  grade: GradeId,
  term: TermId,
  exam: ExamId,
  id: string,
  prompt: string,
  answer: string,
  wrongs: string[],
  hint: string,
  explanation: string,
  subject: SubjectId,
): DraftQuestion {
  return {
    grade,
    subject,
    term,
    exam,
    difficulty: difficultyFor(grade, 2),
    id: `${id}-${term}-${exam}`,
    prompt,
    answer,
    wrongs,
    hint,
    explanation,
  };
}

function subjectTemplates(subject: Exclude<SubjectId, 'math'>, grade: GradeId, term: TermId, exam: ExamId): TextTemplate[] {
  const phase = `${term === 'first' ? '上學期' : '下學期'}${exam === 'midterm' ? '期中' : '期末'}`;
  if (subject === 'english') return englishTemplates(grade, phase);
  if (subject === 'language') return languageTemplates(grade, phase);
  if (subject === 'science') return scienceTemplates(grade, phase);
  return socialTemplates(grade, phase);
}

function languageTemplates(grade: GradeId, phase: string): TextTemplate[] {
  const idioms = ['一目了然', '循序漸進', '舉一反三', '聚精會神', '有條不紊', '見微知著'];
  return [
    {
      prompt: `${phase}國語：閱讀短文時，最能幫助找出主旨的是？`,
      answer: '找出每段重點並合併',
      wrongs: ['只看插圖顏色', '只數有幾個逗號', '跳過標題'],
      hint: '主旨通常和段落重點有關。',
      explanation: '先抓各段重點，再整合成文章主要意思。',
    },
    {
      prompt: `${phase}國語：「${idioms[grade - 1]}」較接近哪個意思？`,
      answer: idiomMeaning(idioms[grade - 1]),
      wrongs: ['完全沒有順序', '故意拖延時間', '只看表面字數'],
      hint: '先從成語中的關鍵字推意思。',
      explanation: `「${idioms[grade - 1]}」常用來表示${idiomMeaning(idioms[grade - 1])}。`,
    },
    {
      prompt: `${phase}國語：寫作時「先總說，再分點說明，最後收束」屬於？`,
      answer: '清楚的文章結構',
      wrongs: ['錯字訂正', '標點省略', '無關描寫'],
      hint: '這是在安排文章的先後順序。',
      explanation: '總分總結構能讓讀者更容易掌握內容。',
    },
    {
      prompt: `${phase}國語：看到「但是、然而、卻」時，通常要注意什麼？`,
      answer: '前後意思可能轉折',
      wrongs: ['一定是時間順序', '一定沒有重點', '只能看第一個字'],
      hint: '這些詞常讓語氣或方向改變。',
      explanation: '但是、然而、卻常提示轉折關係。',
    },
    {
      prompt: `${phase}國語：回答閱讀推論題時，最可靠的方法是？`,
      answer: '根據文章線索判斷',
      wrongs: ['只憑心情猜', '只看選項長短', '完全不讀題目'],
      hint: '推論題需要回到文章找證據。',
      explanation: '推論要根據文本線索，而不是任意猜測。',
    },
  ];
}

function englishTemplates(grade: GradeId, phase: string): TextTemplate[] {
  const wordSets: Array<[string, string, string[]]> = [
    ['cat', '貓', ['狗', '鳥', '魚']],
    ['book', '書', ['筆', '桌子', '門']],
    ['weather', '天氣', ['早餐', '鉛筆', '鞋子']],
    ['library', '圖書館', ['操場', '廚房', '醫院']],
    ['because', '因為', ['但是', '如果', '從不']],
    ['environment', '環境', ['運動', '聲音', '假期']],
  ];
  const [word, meaning, wrongs] = wordSets[grade - 1];
  const sentence = grade <= 2 ? 'I like apples.' : grade <= 4 ? 'She is reading a book.' : 'We should protect the environment.';
  return [
    {
      prompt: `${phase}英文：${word} 的中文意思是？`,
      answer: meaning,
      wrongs,
      hint: '先看單字是否和生活物品、地點或概念有關。',
      explanation: `${word} 的意思是「${meaning}」。`,
    },
    {
      prompt: `${phase}英文：句子「${sentence}」最接近哪個意思？`,
      answer: translateSentence(sentence),
      wrongs: ['他們正在跑步。', '我昨天沒有上學。', '這是一張地圖。'],
      hint: '先找主詞和主要動作。',
      explanation: `這句的主要意思是「${translateSentence(sentence)}」。`,
    },
    {
      prompt: `${phase}英文：下列哪一個是疑問句常見開頭？`,
      answer: grade <= 2 ? 'What' : 'Why',
      wrongs: ['Happy', 'Desk', 'Blue'],
      hint: '疑問句常用 What、Where、Why、How 開頭。',
      explanation: `${grade <= 2 ? 'What' : 'Why'} 可用來引導英文問句。`,
    },
    {
      prompt: `${phase}英文：選出較完整的英文句子。`,
      answer: grade <= 2 ? 'I am happy.' : 'They are playing soccer.',
      wrongs: ['Happy I.', 'Soccer they.', 'Are book the.'],
      hint: '英文句子通常需要主詞加動詞。',
      explanation: '完整英文句子要有合理的字序和動詞。',
    },
    {
      prompt: `${phase}英文：Which word means「朋友」？`,
      answer: 'friend',
      wrongs: ['window', 'river', 'cloud'],
      hint: '想想常見的人際關係單字。',
      explanation: 'friend 的意思是朋友。',
    },
  ];
}

function scienceTemplates(grade: GradeId, phase: string): TextTemplate[] {
  const lower = grade <= 2;
  return [
    {
      prompt: `${phase}${lower ? '生活/自然' : '自然'}：做實驗時，最重要的態度是？`,
      answer: '仔細觀察並記錄',
      wrongs: ['只猜答案', '故意改資料', '不看變化'],
      hint: '科學重視證據。',
      explanation: '觀察與記錄能幫助我們根據證據判斷。',
    },
    {
      prompt: `${phase}${lower ? '生活/自然' : '自然'}：下列哪個說法較符合科學觀察？`,
      answer: '植物有光和水較容易生長',
      wrongs: ['植物不需要任何東西', '冰塊遇熱會變石頭', '聲音不需要振動'],
      hint: '想想植物生長和物質變化。',
      explanation: '植物通常需要光、水和空氣等條件。',
    },
    {
      prompt: `${phase}${lower ? '生活/自然' : '自然'}：遇到不確定的現象，較好的做法是？`,
      answer: '提出問題並查證',
      wrongs: ['立刻下結論', '只聽傳言', '不再觀察'],
      hint: '科學學習會先問問題。',
      explanation: '提出問題、蒐集資料與查證，是科學探究的重要步驟。',
    },
    {
      prompt: `${phase}${lower ? '生活/自然' : '自然'}：比較兩盆植物生長時，最好讓哪一項保持相同？`,
      answer: '除了要測試的條件外，其他條件盡量相同',
      wrongs: ['每一項都亂改', '只看花盆顏色', '不記錄結果'],
      hint: '公平實驗要控制變因。',
      explanation: '控制其他條件，才能比較單一因素的影響。',
    },
    {
      prompt: `${phase}${lower ? '生活/自然' : '自然'}：下列哪一項較像「證據」？`,
      answer: '連續三天量到的植物高度',
      wrongs: ['我覺得它很高', '朋友隨口說的話', '沒有日期的猜測'],
      hint: '證據通常可觀察、可記錄。',
      explanation: '測量資料比感覺更能作為科學證據。',
    },
  ];
}

function socialTemplates(grade: GradeId, phase: string): TextTemplate[] {
  const lower = grade <= 2;
  return [
    {
      prompt: `${phase}${lower ? '生活/社會' : '社會'}：討論班級規則時，較好的做法是？`,
      answer: '聽取不同意見再決定',
      wrongs: ['只讓一個人決定', '大聲嘲笑別人', '完全不說理由'],
      hint: '公共討論需要尊重和理由。',
      explanation: '聽取不同意見能讓決定更公平。',
    },
    {
      prompt: `${phase}${lower ? '生活/社會' : '社會'}：看地圖或路線圖時，圖例的功能是？`,
      answer: '說明符號代表什麼',
      wrongs: ['改變天氣', '刪除道路', '增加人口'],
      hint: '圖例通常放在地圖旁邊。',
      explanation: '圖例能幫助我們理解地圖符號。',
    },
    {
      prompt: `${phase}${lower ? '生活/社會' : '社會'}：面對公共物品，正確態度是？`,
      answer: '共同維護並珍惜使用',
      wrongs: ['任意破壞', '帶回家收藏', '不用管別人'],
      hint: '公共物品屬於大家共同使用。',
      explanation: '公共物品需要大家一起維護。',
    },
    {
      prompt: `${phase}${lower ? '生活/社會' : '社會'}：判斷一則公共訊息是否可信，先看什麼？`,
      answer: '來源和證據',
      wrongs: ['字體顏色', '誰喊得最大聲', '圖片是不是可愛'],
      hint: '可信度和資料來源有關。',
      explanation: '來源和證據能幫助判斷訊息可靠度。',
    },
    {
      prompt: `${phase}${lower ? '生活/社會' : '社會'}：如果同學對班級活動有不同意見，較好的做法是？`,
      answer: '整理理由後一起討論',
      wrongs: ['叫他不要說話', '立刻吵架', '故意破壞活動'],
      hint: '公共討論需要理由與尊重。',
      explanation: '整理理由並討論，能讓決定更公平。',
    },
  ];
}

function question(draft: DraftQuestion): QuizQuestion {
  const options = arrangeOptions(draft.answer, draft.wrongs, draft.id);
  return {
    id: `g${draft.grade}-${draft.subject}-${draft.term}-${draft.exam}-${draft.id}`,
    grade: draft.grade,
    subject: draft.subject,
    term: draft.term,
    exam: draft.exam,
    difficulty: draft.difficulty,
    prompt: draft.prompt,
    options,
    answerIndex: options.indexOf(draft.answer),
    hint: draft.hint,
    explanation: draft.explanation,
  };
}

function arrangeOptions(answer: string, wrongs: string[], id: string): string[] {
  const candidates = [answer, ...wrongs].map((item) => item.trim()).filter(Boolean);
  const unique = [...new Set(candidates)];
  while (unique.length < 4) {
    unique.push(`接近但不正確 ${unique.length}`);
  }
  const wrongOptions = unique.filter((item) => item !== answer).slice(0, 3);
  const answerIndex = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  const options = [...wrongOptions];
  options.splice(answerIndex, 0, answer);
  return options.slice(0, 4);
}

function difficultyFor(grade: GradeId, offset: number): QuestionDifficulty {
  if (grade >= 5 || offset % 3 === 0) return '挑戰';
  if (grade >= 3 || offset % 2 === 0) return '進階';
  return '基礎';
}

function idiomMeaning(idiom: string): string {
  const meanings: Record<string, string> = {
    一目了然: '一看就很清楚',
    循序漸進: '按照順序逐步前進',
    舉一反三: '能由一件事推想到其他事',
    聚精會神: '非常專心',
    有條不紊: '做事有條理不混亂',
    見微知著: '從小地方看出大方向',
  };
  return meanings[idiom] ?? '掌握重點';
}

function translateSentence(sentence: string): string {
  const translations: Record<string, string> = {
    'I like apples.': '我喜歡蘋果。',
    'She is reading a book.': '她正在讀一本書。',
    'We should protect the environment.': '我們應該保護環境。',
  };
  return translations[sentence] ?? '這是一個英文句子。';
}
