import { generateContentWithFallback } from './geminiCore.service'
import {
  IToeicExam,
  IToeicPassageGroup,
  IToeicQuestion,
  ToeicOptionKey,
  ToeicPartNumber,
} from '@/models/toeic.model'

export type ToeicDifficulty = '450-600' | '600-750' | '750-900+'

export interface IGenerateToeicExamConfig {
  title: string
  topic: string
  difficulty: ToeicDifficulty
  durationMinutes: number
  /** Exact number of questions (Parts 1, 2, 5) or groups (Parts 3, 4, 6, 7) */
  part1Count: number // standard: 6
  part2Count: number // standard: 25
  part3Groups: number // standard: 13 (x3 = 39)
  part4Groups: number // standard: 10 (x3 = 30)
  part5Count: number // standard: 30
  part6Groups: number // standard: 4 (x4 = 16)
  part7SingleGroups: number // standard: 10 (total 29 Qs)
  part7DoubleGroups: number // standard: 2 (x5 = 10 Qs)
  part7TripleGroups: number // standard: 3 (x5 = 15 Qs)
}

export const STANDARD_ETS_CONFIG: IGenerateToeicExamConfig = {
  title: 'Đề thi TOEIC Chuẩn ETS (200 câu)',
  topic: 'Tổng hợp chuẩn ETS (Văn phòng, Kinh doanh, Du lịch, Mua sắm, Nhân sự)',
  difficulty: '600-750',
  durationMinutes: 120,
  part1Count: 6,
  part2Count: 25,
  part3Groups: 13,
  part4Groups: 10,
  part5Count: 30,
  part6Groups: 4,
  part7SingleGroups: 10,
  part7DoubleGroups: 2,
  part7TripleGroups: 3,
}

export const MINI_TOEIC_CONFIG: IGenerateToeicExamConfig = {
  title: 'Đề thi TOEIC Mini Test AI (50 câu)',
  topic: 'Tổng hợp chuẩn ETS (Văn phòng, Kinh doanh, Giao tiếp công sở)',
  difficulty: '600-750',
  durationMinutes: 30,
  part1Count: 2,
  part2Count: 6,
  part3Groups: 3,
  part4Groups: 2,
  part5Count: 10,
  part6Groups: 2,
  part7SingleGroups: 3,
  part7DoubleGroups: 0,
  part7TripleGroups: 0,
}

export interface IGenerateProgress {
  stepIndex: number
  totalSteps: number
  currentLabel: string
}

const cleanJsonText = (raw: string): string => {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  const firstBracket = text.indexOf('[')
  const firstBrace = text.indexOf('{')
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = text.lastIndexOf(']')
    if (lastBracket !== -1) return text.slice(firstBracket, lastBracket + 1)
  }
  if (firstBrace !== -1) {
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1)
  }
  return text
}

const parseJsonArray = <T>(raw: string): T[] => {
  const cleaned = cleanJsonText(raw)
  const parsed = JSON.parse(cleaned)
  if (Array.isArray(parsed)) return parsed
  if (parsed && Array.isArray(parsed.items)) return parsed.items
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions
  if (parsed && Array.isArray(parsed.groups)) return parsed.groups
  throw new Error('AI response is not a JSON array')
}

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const normalizeOptionKey = (val: string, fallback: ToeicOptionKey = 'A'): ToeicOptionKey => {
  const upper = String(val || '')
    .trim()
    .toUpperCase()
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') return upper
  return fallback
}

const buildPart1SceneSvg = (sceneTitle: string, sceneDetails: string): string => {
  const safeTitle = (sceneTitle || 'TOEIC Part 1 Photograph').slice(0, 48).replace(/[<>&"]/g, '')
  const safeDetails = (sceneDetails || '').slice(0, 90).replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" fill="none">
    <rect width="520" height="220" rx="12" fill="#EEF2FF"/>
    <rect x="16" y="16" width="488" height="188" rx="10" fill="#FFFFFF" stroke="#C7D2FE" stroke-width="2"/>
    <circle cx="80" cy="82" r="24" fill="#6366F1" fill-opacity="0.16"/>
    <path d="M68 86 L77 75 L86 84 L92 78 L100 88 H64 Z" fill="#4F46E5"/>
    <text x="120" y="76" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#312E81">${safeTitle}</text>
    <text x="120" y="102" font-family="Arial, sans-serif" font-size="12" fill="#475569">${safeDetails}</text>
    <text x="28" y="176" font-family="Arial, sans-serif" font-size="11" fill="#6366F1">AI Generated Scene • Listen to the 4 statements (A–D) and choose the best match</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

async function callGeminiJson<T>(prompt: string, serviceName: string): Promise<T[]> {
  const result = await generateContentWithFallback({
    serviceName,
    category: 'general',
    requestParams: {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    },
    validateResponse: (text) => {
      try {
        const arr = parseJsonArray<T>(text)
        return arr.length > 0
      } catch {
        return false
      }
    },
  })
  return parseJsonArray<T>(result.text)
}

export async function generatePart1Questions(
  count: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicQuestion[]> {
  if (count <= 0) return []
  const prompt = `Generate exactly ${count} TOEIC Part 1 (Photographs) questions.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Return a JSON array of ${count} objects, each with:
- "sceneTitle": short 4-7 word English title of the photo scene
- "sceneDetails": concise 1-sentence visual description of the scene
- "audioScript": "A: <statement A>\\nB: <statement B>\\nC: <statement C>\\nD: <statement D>" (4 realistic TOEIC Part 1 statements describing the scene, only 1 is completely accurate)
- "correctAnswer": "A" | "B" | "C" | "D"
- "explanation": clear Vietnamese explanation of why the correct option matches the scene and why distractors are wrong.`

  const items = await callGeminiJson<any>(prompt, 'toeic_gen_part1')
  return items.slice(0, count).map((item, idx) => ({
    id: uid('p1'),
    part: 1 as ToeicPartNumber,
    questionNumber: idx + 1,
    prompt: 'Look at the scene and listen to the four statements. Choose the best description.',
    imageUrl: buildPart1SceneSvg(item.sceneTitle, item.sceneDetails),
    audioScript: String(item.audioScript || ''),
    options: [
      { key: 'A', text: '(A) Statement A' },
      { key: 'B', text: '(B) Statement B' },
      { key: 'C', text: '(C) Statement C' },
      { key: 'D', text: '(D) Statement D' },
    ],
    correctAnswer: normalizeOptionKey(item.correctAnswer, 'A'),
    explanation: String(item.explanation || ''),
  }))
}

export async function generatePart2Questions(
  count: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicQuestion[]> {
  if (count <= 0) return []
  const batchSize = 15
  const results: IToeicQuestion[] = []

  for (let offset = 0; offset < count; offset += batchSize) {
    const currentCount = Math.min(batchSize, count - offset)
    const prompt = `Generate exactly ${currentCount} TOEIC Part 2 (Question-Response) questions.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Include varied Wh-questions, Yes/No questions, tag questions, and indirect responses.
Return a JSON array of ${currentCount} objects, each with:
- "audioScript": "<Question or statement>\\nA: <Response A>\\nB: <Response B>\\nC: <Response C>"
- "correctAnswer": "A" | "B" | "C"
- "explanation": concise Vietnamese explanation.`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part2')
    for (const item of items.slice(0, currentCount)) {
      results.push({
        id: uid('p2'),
        part: 2,
        questionNumber: results.length + 1,
        prompt: 'Listen to the question and choose the best response.',
        audioScript: String(item.audioScript || ''),
        options: [
          { key: 'A', text: '(A) Response A' },
          { key: 'B', text: '(B) Response B' },
          { key: 'C', text: '(C) Response C' },
        ],
        correctAnswer:
          normalizeOptionKey(item.correctAnswer, 'A') === 'D'
            ? 'A'
            : normalizeOptionKey(item.correctAnswer, 'A'),
        explanation: String(item.explanation || ''),
      })
    }
  }
  return results
}

export async function generatePart3Groups(
  groupCount: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicPassageGroup[]> {
  if (groupCount <= 0) return []
  const batchSize = 5
  const groups: IToeicPassageGroup[] = []

  for (let offset = 0; offset < groupCount; offset += batchSize) {
    const currentCount = Math.min(batchSize, groupCount - offset)
    const prompt = `Generate exactly ${currentCount} TOEIC Part 3 (Conversations) sets.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Each set MUST have a realistic workplace/daily conversation between "Woman:" and "Man:" (4-6 turns, each turn on a new line) and exactly 3 multiple-choice questions (A, B, C, D).
Return a JSON array of ${currentCount} objects, each with:
- "title": short conversation title
- "audioScript": multi-line dialogue using "Woman: ..." and "Man: ..." on separate lines
- "questions": array of 3 objects, each with:
  - "prompt": question text
  - "options": array of 4 strings [A_text, B_text, C_text, D_text]
  - "correctAnswer": "A" | "B" | "C" | "D"
  - "explanation": concise Vietnamese explanation.`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part3')
    for (const g of items.slice(0, currentCount)) {
      const qs: IToeicQuestion[] = (g.questions || []).slice(0, 3).map((q: any, qIdx: number) => ({
        id: uid('p3q'),
        part: 3 as ToeicPartNumber,
        questionNumber: qIdx + 1,
        prompt: String(q.prompt || ''),
        options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, idx) => ({
          key,
          text: String(q.options?.[idx] || ''),
        })),
        correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
        explanation: String(q.explanation || ''),
      }))
      groups.push({
        id: uid('p3g'),
        part: 3,
        title: String(g.title || `Conversation ${groups.length + 1}`),
        audioScript: String(g.audioScript || ''),
        questions: qs,
      })
    }
  }
  return groups
}

export async function generatePart4Groups(
  groupCount: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicPassageGroup[]> {
  if (groupCount <= 0) return []
  const batchSize = 5
  const groups: IToeicPassageGroup[] = []

  for (let offset = 0; offset < groupCount; offset += batchSize) {
    const currentCount = Math.min(batchSize, groupCount - offset)
    const prompt = `Generate exactly ${currentCount} TOEIC Part 4 (Short Talks) sets.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Include varied talk types: announcements, voice messages, advertisements, tour guides, meeting excerpts.
Each set has a monologue script (70-100 words) and exactly 3 multiple-choice questions (A, B, C, D).
Return a JSON array of ${currentCount} objects, each with:
- "title": short talk title
- "audioScript": monologue text
- "questions": array of 3 objects, each with:
  - "prompt": question text
  - "options": array of 4 strings [A_text, B_text, C_text, D_text]
  - "correctAnswer": "A" | "B" | "C" | "D"
  - "explanation": concise Vietnamese explanation.`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part4')
    for (const g of items.slice(0, currentCount)) {
      const qs: IToeicQuestion[] = (g.questions || []).slice(0, 3).map((q: any, qIdx: number) => ({
        id: uid('p4q'),
        part: 4 as ToeicPartNumber,
        questionNumber: qIdx + 1,
        prompt: String(q.prompt || ''),
        options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, idx) => ({
          key,
          text: String(q.options?.[idx] || ''),
        })),
        correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
        explanation: String(q.explanation || ''),
      }))
      groups.push({
        id: uid('p4g'),
        part: 4,
        title: String(g.title || `Talk ${groups.length + 1}`),
        audioScript: String(g.audioScript || ''),
        questions: qs,
      })
    }
  }
  return groups
}

export async function generatePart5Questions(
  count: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicQuestion[]> {
  if (count <= 0) return []
  const batchSize = 15
  const results: IToeicQuestion[] = []

  for (let offset = 0; offset < count; offset += batchSize) {
    const currentCount = Math.min(batchSize, count - offset)
    const prompt = `Generate exactly ${currentCount} TOEIC Part 5 (Incomplete Sentences) questions.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Mix grammar (parts of speech, verb tenses, prepositions, conjunctions, relative clauses) and business vocabulary.
Each sentence must contain "_______" for the blank.
Return a JSON array of ${currentCount} objects, each with:
- "prompt": sentence with "_______"
- "options": array of 4 strings [A_text, B_text, C_text, D_text]
- "correctAnswer": "A" | "B" | "C" | "D"
- "explanation": concise Vietnamese grammar/vocab explanation.`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part5')
    for (const item of items.slice(0, currentCount)) {
      results.push({
        id: uid('p5'),
        part: 5,
        questionNumber: results.length + 1,
        prompt: String(item.prompt || ''),
        options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, idx) => ({
          key,
          text: String(item.options?.[idx] || ''),
        })),
        correctAnswer: normalizeOptionKey(item.correctAnswer, 'A'),
        explanation: String(item.explanation || ''),
      })
    }
  }
  return results
}

export async function generatePart6Groups(
  groupCount: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicPassageGroup[]> {
  if (groupCount <= 0) return []
  const prompt = `Generate exactly ${groupCount} TOEIC Part 6 (Text Completion) passages.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Each passage (email, memo, notice, or article) MUST have 4 blanks labeled [1], [2], [3], [4] (where one blank tests inserting a full sentence).
Return a JSON array of ${groupCount} objects, each with:
- "title": short passage title
- "passage": passage text containing [1] _______, [2] _______, [3] _______, [4] _______
- "questions": array of 4 objects (for [1] to [4]), each with:
  - "prompt": e.g. "Choose the best option for blank [1]."
  - "options": array of 4 strings [A_text, B_text, C_text, D_text]
  - "correctAnswer": "A" | "B" | "C" | "D"
  - "explanation": concise Vietnamese explanation.`

  const items = await callGeminiJson<any>(prompt, 'toeic_gen_part6')
  return items.slice(0, groupCount).map((g, gIdx) => ({
    id: uid('p6g'),
    part: 6 as const,
    title: String(g.title || `Part 6 Passage ${gIdx + 1}`),
    passages: [String(g.passage || '')],
    questions: (g.questions || []).slice(0, 4).map((q: any, qIdx: number) => ({
      id: uid('p6q'),
      part: 6 as ToeicPartNumber,
      questionNumber: qIdx + 1,
      prompt: String(q.prompt || `Choose the best option for blank [${qIdx + 1}].`),
      options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, idx) => ({
        key,
        text: String(q.options?.[idx] || ''),
      })),
      correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
      explanation: String(q.explanation || ''),
    })),
  }))
}

export async function generatePart7Groups(
  singleCount: number,
  doubleCount: number,
  tripleCount: number,
  topic: string,
  difficulty: ToeicDifficulty,
): Promise<IToeicPassageGroup[]> {
  const groups: IToeicPassageGroup[] = []

  // Standard ETS Part 7 single passages distribution for 10 passages = 29 questions:
  // [2, 2, 2, 2, 3, 3, 3, 4, 4, 4] -> sum = 29
  const singleQuestionCounts: number[] =
    singleCount === 10
      ? [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]
      : Array.from({ length: singleCount }, (_, i) => (i % 3 === 0 ? 2 : i % 3 === 1 ? 3 : 4))

  // Batch single passages in chunks of 4
  for (let offset = 0; offset < singleCount; offset += 4) {
    const sliceCounts = singleQuestionCounts.slice(offset, offset + 4)
    const prompt = `Generate exactly ${sliceCounts.length} TOEIC Part 7 Single Passage sets.
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Passage types: emails, notices, advertisements, text message chains, news articles.
Question counts per set MUST be: ${JSON.stringify(sliceCounts)}.
Return a JSON array of ${sliceCounts.length} objects, each with:
- "title": short passage title
- "passages": array with 1 passage string
- "questions": array of exactly the requested number of questions, each with:
  - "prompt": reading comprehension question
  - "options": array of 4 strings [A_text, B_text, C_text, D_text]
  - "correctAnswer": "A" | "B" | "C" | "D"
  - "explanation": concise Vietnamese explanation citing evidence from the passage.`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part7_single')
    items.slice(0, sliceCounts.length).forEach((g: any, idx: number) => {
      const targetQ = sliceCounts[idx]
      groups.push({
        id: uid('p7s'),
        part: 7,
        title: String(g.title || `Single Passage ${groups.length + 1}`),
        passages: Array.isArray(g.passages) ? g.passages.map(String) : [String(g.passage || '')],
        questions: (g.questions || []).slice(0, targetQ).map((q: any, qIdx: number) => ({
          id: uid('p7q'),
          part: 7 as ToeicPartNumber,
          questionNumber: qIdx + 1,
          prompt: String(q.prompt || ''),
          options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, oIdx) => ({
            key,
            text: String(q.options?.[oIdx] || ''),
          })),
          correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
          explanation: String(q.explanation || ''),
        })),
      })
    })
  }

  // Double passages (5 questions each)
  if (doubleCount > 0) {
    const prompt = `Generate exactly ${doubleCount} TOEIC Part 7 Double Passage sets (each set has 2 related documents, e.g., an email + an invoice/schedule, and exactly 5 questions including cross-document questions).
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Return a JSON array of ${doubleCount} objects, each with:
- "title": short title
- "passages": array of 2 document strings
- "questions": array of 5 objects ("prompt", "options": [4 strings], "correctAnswer": "A"|"B"|"C"|"D", "explanation": Vietnamese).`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part7_double')
    items.slice(0, doubleCount).forEach((g: any, idx: number) => {
      groups.push({
        id: uid('p7d'),
        part: 7,
        title: String(g.title || `Double Passage ${idx + 1}`),
        passages: Array.isArray(g.passages) ? g.passages.map(String) : [],
        questions: (g.questions || []).slice(0, 5).map((q: any, qIdx: number) => ({
          id: uid('p7q'),
          part: 7 as ToeicPartNumber,
          questionNumber: qIdx + 1,
          prompt: String(q.prompt || ''),
          options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, oIdx) => ({
            key,
            text: String(q.options?.[oIdx] || ''),
          })),
          correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
          explanation: String(q.explanation || ''),
        })),
      })
    })
  }

  // Triple passages (5 questions each)
  if (tripleCount > 0) {
    const prompt = `Generate exactly ${tripleCount} TOEIC Part 7 Triple Passage sets (each set has 3 related documents, e.g., web page + email + reply/schedule, and exactly 5 questions requiring cross-referencing).
Topic: ${topic}. Target TOEIC score level: ${difficulty}.
Return a JSON array of ${tripleCount} objects, each with:
- "title": short title
- "passages": array of 3 document strings
- "questions": array of 5 objects ("prompt", "options": [4 strings], "correctAnswer": "A"|"B"|"C"|"D", "explanation": Vietnamese).`

    const items = await callGeminiJson<any>(prompt, 'toeic_gen_part7_triple')
    items.slice(0, tripleCount).forEach((g: any, idx: number) => {
      groups.push({
        id: uid('p7t'),
        part: 7,
        title: String(g.title || `Triple Passage ${idx + 1}`),
        passages: Array.isArray(g.passages) ? g.passages.map(String) : [],
        questions: (g.questions || []).slice(0, 5).map((q: any, qIdx: number) => ({
          id: uid('p7q'),
          part: 7 as ToeicPartNumber,
          questionNumber: qIdx + 1,
          prompt: String(q.prompt || ''),
          options: (['A', 'B', 'C', 'D'] as ToeicOptionKey[]).map((key, oIdx) => ({
            key,
            text: String(q.options?.[oIdx] || ''),
          })),
          correctAnswer: normalizeOptionKey(q.correctAnswer, 'A'),
          explanation: String(q.explanation || ''),
        })),
      })
    })
  }

  return groups
}

export async function generateFullToeicExamWithAI(
  config: IGenerateToeicExamConfig,
  onProgress?: (progress: IGenerateProgress) => void,
  signal?: AbortSignal,
): Promise<IToeicExam> {
  const steps = [
    { label: `Part 1 (${config.part1Count} câu mô tả tranh)`, active: config.part1Count > 0 },
    { label: `Part 2 (${config.part2Count} câu hỏi - đáp)`, active: config.part2Count > 0 },
    { label: `Part 3 (${config.part3Groups * 3} câu hội thoại)`, active: config.part3Groups > 0 },
    { label: `Part 4 (${config.part4Groups * 3} câu bài nói)`, active: config.part4Groups > 0 },
    { label: `Part 5 (${config.part5Count} câu hoàn thành câu)`, active: config.part5Count > 0 },
    {
      label: `Part 6 (${config.part6Groups * 4} câu hoàn thành đoạn)`,
      active: config.part6Groups > 0,
    },
    {
      label: `Part 7 (Đọc hiểu: ${config.part7SingleGroups} đơn, ${config.part7DoubleGroups} kép, ${config.part7TripleGroups} ba)`,
      active: config.part7SingleGroups + config.part7DoubleGroups + config.part7TripleGroups > 0,
    },
  ].filter((s) => s.active)

  let stepIdx = 0
  const checkAbort = () => {
    if (signal?.aborted) throw new Error('Đã hủy quá trình tạo đề bằng AI')
  }

  const p1 =
    config.part1Count > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 1 (${config.part1Count} câu)...`,
        }),
        await generatePart1Questions(config.part1Count, config.topic, config.difficulty))
      : []
  checkAbort()

  const p2 =
    config.part2Count > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 2 (${config.part2Count} câu)...`,
        }),
        await generatePart2Questions(config.part2Count, config.topic, config.difficulty))
      : []
  checkAbort()

  const p3 =
    config.part3Groups > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 3 (${config.part3Groups * 3} câu)...`,
        }),
        await generatePart3Groups(config.part3Groups, config.topic, config.difficulty))
      : []
  checkAbort()

  const p4 =
    config.part4Groups > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 4 (${config.part4Groups * 3} câu)...`,
        }),
        await generatePart4Groups(config.part4Groups, config.topic, config.difficulty))
      : []
  checkAbort()

  const p5 =
    config.part5Count > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 5 (${config.part5Count} câu)...`,
        }),
        await generatePart5Questions(config.part5Count, config.topic, config.difficulty))
      : []
  checkAbort()

  const p6 =
    config.part6Groups > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: `Đang tạo Part 6 (${config.part6Groups * 4} câu)...`,
        }),
        await generatePart6Groups(config.part6Groups, config.topic, config.difficulty))
      : []
  checkAbort()

  const p7 =
    config.part7SingleGroups + config.part7DoubleGroups + config.part7TripleGroups > 0
      ? (onProgress?.({
          stepIndex: ++stepIdx,
          totalSteps: steps.length,
          currentLabel: 'Đang tạo Part 7 (Đọc hiểu)...',
        }),
        await generatePart7Groups(
          config.part7SingleGroups,
          config.part7DoubleGroups,
          config.part7TripleGroups,
          config.topic,
          config.difficulty,
        ))
      : []
  checkAbort()

  // Number all questions sequentially from 1..N
  let counter = 1
  const singles: IToeicQuestion[] = [...p1, ...p2, ...p5].map((q) => ({
    ...q,
    questionNumber: counter++,
  }))

  // Proper order: Part 1 -> Part 2 -> Part 3 -> Part 4 -> Part 5 -> Part 6 -> Part 7
  counter = 1
  const p1Numbered = p1.map((q) => ({ ...q, questionNumber: counter++ }))
  const p2Numbered = p2.map((q) => ({ ...q, questionNumber: counter++ }))
  const p3Numbered = p3.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ ...q, questionNumber: counter++ })),
  }))
  const p4Numbered = p4.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ ...q, questionNumber: counter++ })),
  }))
  const p5Numbered = p5.map((q) => ({ ...q, questionNumber: counter++ }))
  const p6Numbered = p6.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ ...q, questionNumber: counter++ })),
  }))
  const p7Numbered = p7.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ ...q, questionNumber: counter++ })),
  }))

  void singles

  const now = Date.now()
  return {
    id: uid('toeic_ai'),
    title: config.title.trim() || 'Đề thi TOEIC AI',
    description: `Đề thi tạo tự động bằng Gemini AI • Chủ đề: ${config.topic} • Mục tiêu: ${config.difficulty}`,
    durationMinutes: config.durationMinutes,
    createdAt: now,
    updatedAt: now,
    questions: [...p1Numbered, ...p2Numbered, ...p5Numbered],
    passageGroups: [...p3Numbered, ...p4Numbered, ...p6Numbered, ...p7Numbered],
  }
}
