import {
  IToeicAttempt,
  IToeicExam,
  IToeicInProgressState,
  IToeicPartMeta,
  IToeicPartStat,
  IToeicPassageGroup,
  IToeicQuestion,
  TOEIC_PARTS_META,
  ToeicOptionKey,
  ToeicPartNumber,
} from '@/models/toeic.model'
import { localDb } from '@/services/localDb/db'
import { toeicApi } from '@/services/firebase/api/toeic.api'

const EXAMS_STORAGE_KEY = 'enmory_toeic_exams_v1'
const ATTEMPTS_STORAGE_KEY = 'enmory_toeic_attempts_v1'

export interface IFlattenedToeicItem {
  kind: 'single' | 'group'
  part: ToeicPartNumber
  question?: IToeicQuestion
  group?: IToeicPassageGroup
  questions: IToeicQuestion[]
}

export const getPartMeta = (part: ToeicPartNumber): IToeicPartMeta => {
  return TOEIC_PARTS_META.find((p) => p.part === part) || TOEIC_PARTS_META[0]
}

/**
 * Format TOEIC listening transcript so each option label (e.g. A:, B:, (A), (B))
 * starts on its own line for readability.
 */
export const formatTranscriptLines = (script?: string): string => {
  if (!script) return ''
  return script.trim().replace(/\s+(?=(?:\([A-D]\)|[A-D]:)\s*)/g, '\n')
}

/**
 * Flatten an exam into ordered renderable items (single questions & passage groups),
 * optionally filtered by selected parts, and assign sequential display numbers.
 */
export const getExamRenderItems = (
  exam: IToeicExam,
  selectedParts?: ToeicPartNumber[],
): IFlattenedToeicItem[] => {
  const partsToInclude: ToeicPartNumber[] =
    selectedParts && selectedParts.length > 0 ? selectedParts : [1, 2, 3, 4, 5, 6, 7]

  const items: IFlattenedToeicItem[] = []

  for (const part of partsToInclude) {
    const meta = getPartMeta(part)
    if (!meta.isGrouped) {
      const partQuestions = exam.questions
        .filter((q) => q.part === part)
        .sort((a, b) => a.questionNumber - b.questionNumber)
      for (const q of partQuestions) {
        items.push({
          kind: 'single',
          part,
          question: q,
          questions: [q],
        })
      }
    } else {
      const partGroups = exam.passageGroups.filter((g) => g.part === part)
      for (const g of partGroups) {
        const sortedQs = [...g.questions].sort((a, b) => a.questionNumber - b.questionNumber)
        if (sortedQs.length > 0) {
          items.push({
            kind: 'group',
            part,
            group: { ...g, questions: sortedQs },
            questions: sortedQs,
          })
        }
      }
    }
  }

  return items
}

export const getExamAllQuestions = (
  exam: IToeicExam,
  selectedParts?: ToeicPartNumber[],
): IToeicQuestion[] => {
  return getExamRenderItems(exam, selectedParts).flatMap((item) => item.questions)
}

/**
 * Standard ETS-like scaled score conversion (5 - 495 per section, rounded to nearest 5).
 */
export const calculateSectionScore = (correct: number, total: number): number => {
  if (total <= 0) return 0
  const ratio = Math.max(0, Math.min(1, correct / total))
  // Slight S-curve / standard TOEIC scaling approximation
  const raw = 5 + ratio * 490
  const rounded = Math.round(raw / 5) * 5
  return Math.max(5, Math.min(495, rounded))
}

export const evaluateToeicAttempt = (
  exam: IToeicExam,
  answers: Record<string, ToeicOptionKey>,
  flaggedIds: string[],
  selectedParts: ToeicPartNumber[],
  durationSeconds: number,
): IToeicAttempt => {
  const questions = getExamAllQuestions(exam, selectedParts)

  const partMap = new Map<ToeicPartNumber, IToeicPartStat>()
  for (const p of selectedParts) {
    const meta = getPartMeta(p)
    partMap.set(p, {
      part: p,
      section: meta.section,
      total: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
    })
  }

  let listeningCorrect = 0
  let listeningTotal = 0
  let readingCorrect = 0
  let readingTotal = 0

  for (const q of questions) {
    const meta = getPartMeta(q.part)
    const stat = partMap.get(q.part) || {
      part: q.part,
      section: meta.section,
      total: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
    }
    const userAns = answers[q.id]
    stat.total += 1
    if (!userAns) {
      stat.unanswered += 1
    } else if (userAns === q.correctAnswer) {
      stat.correct += 1
    } else {
      stat.wrong += 1
    }
    partMap.set(q.part, stat)

    if (meta.section === 'listening') {
      listeningTotal += 1
      if (userAns === q.correctAnswer) listeningCorrect += 1
    } else {
      readingTotal += 1
      if (userAns === q.correctAnswer) readingCorrect += 1
    }
  }

  const listeningScore =
    listeningTotal > 0 ? calculateSectionScore(listeningCorrect, listeningTotal) : 0
  const readingScore = readingTotal > 0 ? calculateSectionScore(readingCorrect, readingTotal) : 0

  return {
    id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    examId: exam.id,
    examTitle: exam.title,
    submittedAt: Date.now(),
    durationSeconds,
    selectedParts,
    answers,
    flaggedIds,
    listeningCorrect,
    listeningTotal,
    readingCorrect,
    readingTotal,
    listeningScore,
    readingScore,
    totalScore: listeningScore + readingScore,
    partStats: Array.from(partMap.values()).sort((a, b) => a.part - b.part),
  }
}

// Inline SVG illustration for Part 1 sample question (no external network required)
const SAMPLE_PART1_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" fill="none">
    <rect width="480" height="280" rx="12" fill="#EEF2FF"/>
    <rect x="40" y="175" width="400" height="16" rx="4" fill="#6366F1"/>
    <rect x="70" y="191" width="14" height="65" fill="#4F46E5"/>
    <rect x="396" y="191" width="14" height="65" fill="#4F46E5"/>
    <rect x="130" y="110" width="110" height="65" rx="4" fill="#1E293B"/>
    <rect x="136" y="116" width="98" height="50" rx="2" fill="#93C5FD"/>
    <rect x="172" y="175" width="26" height="4" fill="#334155"/>
    <circle cx="315" cy="95" r="24" fill="#FDBA74"/>
    <path d="M275 175 C275 135, 355 135, 355 175 Z" fill="#3B82F6"/>
    <rect x="285" y="150" width="60" height="25" rx="4" fill="#1D4ED8"/>
    <rect x="70" y="152" width="38" height="23" rx="3" fill="#FDE047"/>
    <rect x="370" y="142" width="28" height="33" rx="6" fill="#F87171"/>
    <text x="24" y="34" font-family="Arial, sans-serif" font-size="14" fill="#4338CA" font-weight="bold">Office Desk Scene - TOEIC Part 1 Sample</text>
  </svg>`,
)}`

export const SAMPLE_TOEIC_EXAM: IToeicExam = {
  id: 'sample_toeic_mini_01',
  title: 'TOEIC Mini Test #01 (Full 7 Parts)',
  description:
    'Đề thi mẫu chuẩn cấu trúc ETS gồm đầy đủ 7 phần (Listening Parts 1–4 & Reading Parts 5–7), hỗ trợ phát âm tự động (TTS) và giải thích chi tiết.',
  durationMinutes: 30,
  createdAt: 1730000000000,
  updatedAt: 1730000000000,
  isSample: true,
  questions: [
    // PART 1
    {
      id: 's1_q1',
      part: 1,
      questionNumber: 1,
      prompt: 'Look at the picture and listen to the four statements. Choose the best description.',
      imageUrl: SAMPLE_PART1_SVG,
      audioScript:
        'A: A man is sitting in front of a computer monitor. B: The office desk is completely empty. C: Two people are shaking hands near a window. D: A woman is watering plants in the hallway.',
      options: [
        { key: 'A', text: '(A) Statement A' },
        { key: 'B', text: '(B) Statement B' },
        { key: 'C', text: '(C) Statement C' },
        { key: 'D', text: '(D) Statement D' },
      ],
      correctAnswer: 'A',
      explanation:
        'Đáp án A ("A man is sitting in front of a computer monitor") mô tả đúng cảnh người đàn ông đang ngồi trước màn hình máy tính trên bàn làm việc.',
    },
    // PART 2
    {
      id: 's1_q2',
      part: 2,
      questionNumber: 2,
      prompt: 'Listen to the question and choose the best response.',
      audioScript:
        'Where is the quarterly budget meeting being held? A: At three o clock this afternoon. B: In Conference Room B on the fourth floor. C: Yes, the budget was approved yesterday.',
      options: [
        { key: 'A', text: '(A) Response A' },
        { key: 'B', text: '(B) Response B' },
        { key: 'C', text: '(C) Response C' },
      ],
      correctAnswer: 'B',
      explanation:
        'Câu hỏi "Where..." hỏi về địa điểm, nên đáp án B ("In Conference Room B on the fourth floor") là chính xác.',
    },
    {
      id: 's1_q3',
      part: 2,
      questionNumber: 3,
      prompt: 'Listen to the question and choose the best response.',
      audioScript:
        'Have you finished reviewing the client proposal yet? A: No, I still have two pages left to read. B: The client arrived from Tokyo. C: Please put it on the top shelf.',
      options: [
        { key: 'A', text: '(A) Response A' },
        { key: 'B', text: '(B) Response B' },
        { key: 'C', text: '(C) Response C' },
      ],
      correctAnswer: 'A',
      explanation:
        'Câu hỏi Yes/No "Have you finished... yet?" được trả lời hợp lý bằng A ("No, I still have two pages left to read").',
    },
    // PART 5
    {
      id: 's1_q10',
      part: 5,
      questionNumber: 10,
      prompt: 'Ms. Chen will _______ the new marketing campaign during tomorrow’s board meeting.',
      options: [
        { key: 'A', text: 'present' },
        { key: 'B', text: 'presentation' },
        { key: 'C', text: 'presently' },
        { key: 'D', text: 'presented' },
      ],
      correctAnswer: 'A',
      explanation:
        'Sau trợ động từ "will" cần một động từ nguyên mẫu (bare infinitive) → "present".',
    },
    {
      id: 's1_q11',
      part: 5,
      questionNumber: 11,
      prompt:
        'All employees are required to submit their travel expense reports _______ Friday afternoon.',
      options: [
        { key: 'A', text: 'by' },
        { key: 'B', text: 'into' },
        { key: 'C', text: 'among' },
        { key: 'D', text: 'during' },
      ],
      correctAnswer: 'A',
      explanation:
        '"by + mốc thời gian" mang nghĩa "trước hoặc muộn nhất là vào..." (deadline nộp báo cáo).',
    },
    {
      id: 's1_q12',
      part: 5,
      questionNumber: 12,
      prompt:
        'Because the downtown branch is undergoing renovations, customer service inquiries have been _______ redirected to the main office.',
      options: [
        { key: 'A', text: 'temporary' },
        { key: 'B', text: 'temporarily' },
        { key: 'C', text: 'temporize' },
        { key: 'D', text: 'temporaries' },
      ],
      correctAnswer: 'B',
      explanation:
        'Cần một trạng từ bổ nghĩa cho động từ "redirected" (have been + adv + V3/ed) → "temporarily".',
    },
  ],
  passageGroups: [
    // PART 3
    {
      id: 's1_g_p3',
      part: 3,
      title: 'Conversation 1: Office Printer Issue',
      audioScript: `Woman: Hi David, have you noticed that the color printer on the second floor is out of ink again?
Man: Really? I just replaced the cyan cartridge on Monday.
Woman: Well, the marketing team printed over three hundred brochures yesterday for the trade show.
Man: That explains it. I will order a few extra cartridges from our supplier right away.`,
      questions: [
        {
          id: 's1_q4',
          part: 3,
          questionNumber: 4,
          prompt: 'What problem does the woman mention?',
          options: [
            { key: 'A', text: 'A printer is out of ink.' },
            { key: 'B', text: 'The trade show was postponed.' },
            { key: 'C', text: 'A delivery arrived late.' },
            { key: 'D', text: 'The second-floor office is locked.' },
          ],
          correctAnswer: 'A',
          explanation:
            'Người phụ nữ nói: "the color printer on the second floor is out of ink again".',
        },
        {
          id: 's1_q5',
          part: 3,
          questionNumber: 5,
          prompt: 'Why did the marketing team use the printer yesterday?',
          options: [
            { key: 'A', text: 'To print employee badges' },
            { key: 'B', text: 'To produce brochures for an event' },
            { key: 'C', text: 'To copy financial contracts' },
            { key: 'D', text: 'To test a new software update' },
          ],
          correctAnswer: 'B',
          explanation:
            'Họ in hơn 300 tập tài liệu (brochures) cho hội chợ thương mại (trade show).',
        },
        {
          id: 's1_q6',
          part: 3,
          questionNumber: 6,
          prompt: 'What will the man do next?',
          options: [
            { key: 'A', text: 'Call the repair technician' },
            { key: 'B', text: 'Move the printer to another room' },
            { key: 'C', text: 'Order additional supplies' },
            { key: 'D', text: 'Attend the trade show' },
          ],
          correctAnswer: 'C',
          explanation:
            'Người đàn ông nói: "I will order a few extra cartridges from our supplier right away."',
        },
      ],
    },
    // PART 4
    {
      id: 's1_g_p4',
      part: 4,
      title: 'Talk 1: Museum Tour Announcement',
      audioScript:
        'Welcome to the National Maritime Museum. Before we begin our guided tour of the nineteenth-century shipbuilding gallery, please note that flash photography is not permitted inside the exhibition halls. Our tour will last approximately forty-five minutes, and afterward you are welcome to visit the rooftop cafe, which offers a twenty percent discount today for all tour guests. Let us head through the double doors on your left.',
      questions: [
        {
          id: 's1_q7',
          part: 4,
          questionNumber: 7,
          prompt: 'Where is this announcement most likely taking place?',
          options: [
            { key: 'A', text: 'At an airport terminal' },
            { key: 'B', text: 'At a museum' },
            { key: 'C', text: 'At a shipyard factory' },
            { key: 'D', text: 'At a train station' },
          ],
          correctAnswer: 'B',
          explanation: 'Người nói chào mừng khách đến "National Maritime Museum".',
        },
        {
          id: 's1_q8',
          part: 4,
          questionNumber: 8,
          prompt: 'What are listeners asked NOT to do?',
          options: [
            { key: 'A', text: 'Touch the display cases' },
            { key: 'B', text: 'Bring food into the lobby' },
            { key: 'C', text: 'Use flash when taking photos' },
            { key: 'D', text: 'Leave the tour group early' },
          ],
          correctAnswer: 'C',
          explanation:
            'Thông báo nhắc: "flash photography is not permitted inside the exhibition halls".',
        },
        {
          id: 's1_q9',
          part: 4,
          questionNumber: 9,
          prompt: 'What special offer is mentioned for tour guests?',
          options: [
            { key: 'A', text: 'Free museum souvenirs' },
            { key: 'B', text: 'A discount at the rooftop cafe' },
            { key: 'C', text: 'Complimentary parking passes' },
            { key: 'D', text: 'Extended evening hours' },
          ],
          correctAnswer: 'B',
          explanation:
            'Khách tham quan được giảm 20% tại quán cà phê trên sân thượng ("rooftop cafe, which offers a twenty percent discount today").',
        },
      ],
    },
    // PART 6
    {
      id: 's1_g_p6',
      part: 6,
      title: 'Passage: Internal Memo – Software Migration',
      passages: [
        `MEMORANDUM\nTo: All Staff\nFrom: IT Department\nSubject: Cloud Storage Upgrade\n\nNext weekend, our IT team will migrate all shared department folders to a new cloud platform. This upgrade will [13] _______ file synchronization speed and strengthen data security across all devices.\n\nPlease make sure to back up any local files before 6:00 P.M. on Friday. [14] _______, you will not be able to access shared drives from Saturday morning until Sunday noon while the transfer is in progress.\n\n[15] _______ If you experience any login issues on Monday morning, please submit a ticket through the internal helpdesk portal.`,
      ],
      questions: [
        {
          id: 's1_q13',
          part: 6,
          questionNumber: 13,
          prompt: 'Choose the best word for blank [13].',
          options: [
            { key: 'A', text: 'improve' },
            { key: 'B', text: 'improvement' },
            { key: 'C', text: 'improved' },
            { key: 'D', text: 'improving' },
          ],
          correctAnswer: 'A',
          explanation: 'Sau "will" cần động từ nguyên mẫu → "improve".',
        },
        {
          id: 's1_q14',
          part: 6,
          questionNumber: 14,
          prompt: 'Choose the best transition for blank [14].',
          options: [
            { key: 'A', text: 'In addition' },
            { key: 'B', text: 'However' },
            { key: 'C', text: 'Instead' },
            { key: 'D', text: 'For instance' },
          ],
          correctAnswer: 'A',
          explanation:
            'Bổ sung thêm thông tin lưu ý ngoài việc sao lưu file → "In addition" (Ngoài ra).',
        },
        {
          id: 's1_q15',
          part: 6,
          questionNumber: 15,
          prompt: 'Choose the best sentence for blank [15].',
          options: [
            { key: 'A', text: 'The new office furniture arrived earlier than expected.' },
            {
              key: 'B',
              text: 'Once the migration is complete, you will receive a confirmation email with a quick-start guide.',
            },
            { key: 'C', text: 'Parking permits can be renewed at the reception desk.' },
            { key: 'D', text: 'Please remember to turn off the lights before leaving.' },
          ],
          correctAnswer: 'B',
          explanation:
            'Câu B liên kết mạch lạc với việc hoàn tất quá trình chuyển dữ liệu (migration) và hướng dẫn đăng nhập sáng thứ Hai.',
        },
      ],
    },
    // PART 7
    {
      id: 's1_g_p7',
      part: 7,
      title: 'Reading Passage: Notice of Store Relocation',
      passages: [
        `GREENLEAF ORGANIC MARKET – RELOCATION NOTICE\n\nDear Valued Customers,\n\nAfter eight wonderful years on Oak Street, Greenleaf Organic Market is moving to a larger location just two blocks away at 420 Maple Avenue! Our new store will officially open on Monday, May 12, at 8:00 A.M.\n\nThe expanded space allows us to offer a wider selection of locally grown produce, a full-service bakery, and a dedicated seating area where shoppers can enjoy fresh coffee and sandwiches. Customer parking will also be available free of charge behind the building.\n\nTo celebrate our grand opening week (May 12–18), all loyalty card members will receive double reward points on every purchase, plus a reusable canvas tote bag while supplies last. Our Oak Street location will remain open until 6:00 P.M. on Saturday, May 10.`,
      ],
      questions: [
        {
          id: 's1_q16',
          part: 7,
          questionNumber: 16,
          prompt: 'Why is Greenleaf Organic Market moving?',
          options: [
            { key: 'A', text: 'Its Oak Street lease expired.' },
            { key: 'B', text: 'It wants a bigger space with more offerings.' },
            { key: 'C', text: 'Road construction blocked the old entrance.' },
            { key: 'D', text: 'It merged with another grocery chain.' },
          ],
          correctAnswer: 'B',
          explanation:
            'Thông báo ghi: "moving to a larger location... The expanded space allows us to offer a wider selection...".',
        },
        {
          id: 's1_q17',
          part: 7,
          questionNumber: 17,
          prompt: 'What new feature will be available at the Maple Avenue store?',
          options: [
            { key: 'A', text: '24-hour home delivery' },
            { key: 'B', text: 'A seating area for coffee and sandwiches' },
            { key: 'C', text: 'An underground paid garage' },
            { key: 'D', text: 'Cooking classes on weekends' },
          ],
          correctAnswer: 'B',
          explanation:
            'Đoạn 2 đề cập "a dedicated seating area where shoppers can enjoy fresh coffee and sandwiches".',
        },
        {
          id: 's1_q18',
          part: 7,
          questionNumber: 18,
          prompt: 'What benefit do loyalty card members receive during the grand opening week?',
          options: [
            { key: 'A', text: '50% off all bakery items' },
            { key: 'B', text: 'Free home shipping' },
            { key: 'C', text: 'Double reward points on purchases' },
            { key: 'D', text: 'A complimentary coffee voucher every month' },
          ],
          correctAnswer: 'C',
          explanation:
            'Đoạn 3 ghi: "all loyalty card members will receive double reward points on every purchase".',
        },
      ],
    },
  ],
}

export const loadToeicExams = (): IToeicExam[] => {
  try {
    const raw = localStorage.getItem(EXAMS_STORAGE_KEY)
    if (!raw) {
      return [SAMPLE_TOEIC_EXAM]
    }
    const parsed = JSON.parse(raw) as IToeicExam[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [SAMPLE_TOEIC_EXAM]
    }
    return parsed
  } catch {
    return [SAMPLE_TOEIC_EXAM]
  }
}

export const saveToeicExams = (exams: IToeicExam[]): void => {
  localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams))
}

export const loadToeicAttempts = (): IToeicAttempt[] => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as IToeicAttempt[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveToeicAttempts = (attempts: IToeicAttempt[]): void => {
  localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
}

const getProgressStorageKey = (examId: string, uid?: string) =>
  `enmory_toeic_progress_${uid || 'guest'}_${examId}`

export const loadToeicProgress = (examId: string, uid?: string): IToeicInProgressState | null => {
  try {
    const raw = localStorage.getItem(getProgressStorageKey(examId, uid))
    if (!raw) return null
    const parsed = JSON.parse(raw) as IToeicInProgressState
    if (!parsed || parsed.examId !== examId) return null
    return parsed
  } catch {
    return null
  }
}

export const saveToeicProgress = (state: IToeicInProgressState, uid?: string): void => {
  try {
    localStorage.setItem(getProgressStorageKey(state.examId, uid), JSON.stringify(state))
  } catch {}
}

export const clearToeicProgress = (examId: string, uid?: string): void => {
  try {
    localStorage.removeItem(getProgressStorageKey(examId, uid))
  } catch {}
}

/**
 * Load shared TOEIC exams from Dexie IndexedDB (migrating any legacy localStorage exams once).
 */
export const loadToeicExamsLocal = async (): Promise<IToeicExam[]> => {
  try {
    // Always migrate any legacy localStorage exams not yet in localDb
    const legacyRaw = localStorage.getItem(EXAMS_STORAGE_KEY)
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as IToeicExam[]
        if (Array.isArray(legacy) && legacy.length > 0) {
          const existingIds = new Set(await localDb.toeicExams.toCollection().primaryKeys())
          const toMigrate = legacy.filter((e) => e && e.id && !existingIds.has(e.id))
          if (toMigrate.length > 0) {
            await localDb.toeicExams.bulkPut(toMigrate)
          }
          localStorage.removeItem(EXAMS_STORAGE_KEY)
        }
      } catch {}
    }

    const existing = await localDb.toeicExams.toArray()
    if (existing.length > 0) {
      return existing
        .filter((e) => !e.is_deleted)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }

    await localDb.toeicExams.bulkPut([SAMPLE_TOEIC_EXAM])
    return [SAMPLE_TOEIC_EXAM]
  } catch {
    return [SAMPLE_TOEIC_EXAM]
  }
}

/**
 * Load a specific user's TOEIC attempt history from Dexie IndexedDB.
 */
export const loadToeicAttemptsLocal = async (uid?: string): Promise<IToeicAttempt[]> => {
  try {
    if (!uid) return []
    // Migrate legacy attempts without uid if any exist in localStorage
    const legacyRaw = localStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as IToeicAttempt[]
        if (Array.isArray(legacy) && legacy.length > 0) {
          const withUid = legacy.map((a) => ({ ...a, uid: a.uid || uid }))
          await localDb.toeicAttempts.bulkPut(withUid)
          localStorage.removeItem(ATTEMPTS_STORAGE_KEY)
        }
      } catch {}
    }

    const userAttempts = await localDb.toeicAttempts.where('uid').equals(uid).toArray()
    return userAttempts.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
  } catch {
    return []
  }
}

/**
 * Synchronize shared TOEIC exams (Admin push, Everyone pull) and per-user attempt history with Firestore.
 */
export const syncToeicWithServer = async (
  uid: string,
  isAdmin: boolean,
): Promise<{ syncedExams: number; syncedAttempts: number }> => {
  let syncedExams = 0
  let syncedAttempts = 0
  const pushErrors: string[] = []

  // 1. Sync shared exams
  const serverExamsAll = await toeicApi.getAllExamsForSync()
  const serverExamMap = new Map(serverExamsAll.map((e) => [e.id, e]))

  const localExams = await localDb.toeicExams.toArray()
  const toDeleteLocalIds: string[] = []
  const toPutLocalExams: IToeicExam[] = []

  for (const se of serverExamsAll) {
    if (se.is_deleted) {
      toDeleteLocalIds.push(se.id)
    } else {
      toPutLocalExams.push(se)
      syncedExams++
    }
  }

  // Ensure built-in sample exam stays available if server has no exams yet
  if (toPutLocalExams.length === 0 && !serverExamMap.has(SAMPLE_TOEIC_EXAM.id)) {
    toPutLocalExams.push(SAMPLE_TOEIC_EXAM)
  }

  // If admin has local-only or newer exams (or server is completely empty), push them to server
  const examIdMigrationMap = new Map<string, string>()
  if (isAdmin) {
    for (const le of localExams) {
      if (le.is_deleted) continue
      if (le.isSample && serverExamsAll.length > 0) continue
      const serverExam = serverExamMap.get(le.id)
      const isNewOrNewer =
        !serverExam || (!serverExam.is_deleted && (le.updatedAt || 0) > (serverExam.updatedAt || 0))
      if (isNewOrNewer) {
        try {
          const uploaded = await toeicApi.saveExam(le)
          if (uploaded.id !== le.id) {
            toDeleteLocalIds.push(le.id)
            examIdMigrationMap.set(le.id, uploaded.id)
          }
          const idx = toPutLocalExams.findIndex((e) => e.id === uploaded.id)
          if (idx >= 0) toPutLocalExams[idx] = uploaded
          else toPutLocalExams.push(uploaded)
          syncedExams++
        } catch (err: any) {
          pushErrors.push(`Đề "${le.title}": ${err?.message || 'Lỗi đẩy lên server'}`)
        }
      }
    }
  }

  await localDb.transaction('rw', localDb.toeicExams, async () => {
    if (toDeleteLocalIds.length > 0) {
      await localDb.toeicExams.bulkDelete(toDeleteLocalIds)
    }
    if (toPutLocalExams.length > 0) {
      await localDb.toeicExams.bulkPut(toPutLocalExams)
    }
  })

  // 2. Sync per-user attempt history
  const serverAttempts = await toeicApi.getUserAttempts(uid)
  const serverAttemptIds = new Set(serverAttempts.map((a) => a.id))
  const localAttempts = await localDb.toeicAttempts.where('uid').equals(uid).toArray()
  const attemptIdsToDelete: string[] = []
  const attemptsToPut: IToeicAttempt[] = [...serverAttempts]

  // Push any local-only attempts for this user to Firestore (replacing temp ID with Firestore ID)
  for (const la of localAttempts) {
    if (!serverAttemptIds.has(la.id)) {
      try {
        const migratedExamId = examIdMigrationMap.get(la.examId) || la.examId
        const uploaded = await toeicApi.saveAttempt({ ...la, examId: migratedExamId, uid })
        if (uploaded.id !== la.id) {
          attemptIdsToDelete.push(la.id)
        }
        attemptsToPut.push(uploaded)
        syncedAttempts++
      } catch (err: any) {
        pushErrors.push(`Lịch sử "${la.examTitle}": ${err?.message || 'Lỗi đẩy lên server'}`)
      }
    }
  }

  await localDb.transaction('rw', localDb.toeicAttempts, async () => {
    if (attemptIdsToDelete.length > 0) {
      await localDb.toeicAttempts.bulkDelete(attemptIdsToDelete)
    }
    if (attemptsToPut.length > 0) {
      await localDb.toeicAttempts.bulkPut(attemptsToPut)
    }
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('enmory:toeic-updated'))
  }

  if (pushErrors.length > 0) {
    throw new Error(pushErrors[0])
  }

  return { syncedExams, syncedAttempts }
}
