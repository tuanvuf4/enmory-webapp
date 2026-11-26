export type ToeicSection = 'listening' | 'reading'

export type ToeicPartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ToeicOptionKey = 'A' | 'B' | 'C' | 'D'

export interface IToeicOption {
  key: ToeicOptionKey
  text: string
}

export interface IToeicQuestion {
  id: string
  part: ToeicPartNumber
  questionNumber: number
  prompt: string
  imageUrl?: string
  audioUrl?: string
  audioScript?: string
  options: IToeicOption[]
  correctAnswer: ToeicOptionKey
  explanation?: string
}

export interface IToeicPassageGroup {
  id: string
  part: 3 | 4 | 6 | 7
  title?: string
  /** Reading passage(s) for Part 6 & 7, or transcript for Part 3 & 4 */
  passages?: string[]
  /** Optional image/graphic for Part 3, 4, or 7 */
  imageUrl?: string
  /** Audio URL for Part 3 & 4 */
  audioUrl?: string
  /** TTS script / transcript for Part 3 & 4 */
  audioScript?: string
  questions: IToeicQuestion[]
}

export interface IToeicExam {
  id: string
  uid?: string
  title: string
  description?: string
  durationMinutes: number
  createdAt: number
  updatedAt: number
  isSample?: boolean
  is_deleted?: boolean
  /** Single questions for Part 1, 2, 5 */
  questions: IToeicQuestion[]
  /** Grouped questions for Part 3, 4, 6, 7 */
  passageGroups: IToeicPassageGroup[]
}

export interface IToeicPartStat {
  part: ToeicPartNumber
  section: ToeicSection
  total: number
  correct: number
  wrong: number
  unanswered: number
}

export interface IToeicAttempt {
  id: string
  uid?: string
  examId: string
  examTitle: string
  submittedAt: number
  durationSeconds: number
  selectedParts: ToeicPartNumber[]
  answers: Record<string, ToeicOptionKey>
  flaggedIds: string[]
  listeningCorrect: number
  listeningTotal: number
  readingCorrect: number
  readingTotal: number
  listeningScore: number
  readingScore: number
  totalScore: number
  partStats: IToeicPartStat[]
}

export interface IToeicInProgressState {
  examId: string
  selectedParts: ToeicPartNumber[]
  durationMinutes: number
  currentIndex: number
  answers: Record<string, ToeicOptionKey>
  flaggedIds: string[]
  elapsedSeconds: number
  remainingSeconds: number
  updatedAt: number
}

export interface IToeicPartMeta {
  part: ToeicPartNumber
  name: string
  viName: string
  section: ToeicSection
  standardCount: number
  optionsCount: 3 | 4
  isGrouped: boolean
  description: string
}

export const TOEIC_PARTS_META: IToeicPartMeta[] = [
  {
    part: 1,
    name: 'Photographs',
    viName: 'Mô tả tranh',
    section: 'listening',
    standardCount: 6,
    optionsCount: 4,
    isGrouped: false,
    description: 'Nghe 4 câu mô tả (A-D) và chọn câu mô tả đúng nhất bức tranh.',
  },
  {
    part: 2,
    name: 'Question-Response',
    viName: 'Hỏi - Đáp',
    section: 'listening',
    standardCount: 25,
    optionsCount: 3,
    isGrouped: false,
    description: 'Nghe 1 câu hỏi hoặc câu nói và chọn 1 trong 3 đáp án (A-C) phù hợp nhất.',
  },
  {
    part: 3,
    name: 'Conversations',
    viName: 'Đoạn hội thoại',
    section: 'listening',
    standardCount: 39,
    optionsCount: 4,
    isGrouped: true,
    description: 'Nghe đoạn hội thoại giữa 2-3 người và trả lời các câu hỏi đi kèm.',
  },
  {
    part: 4,
    name: 'Talks',
    viName: 'Bài nói chuyện ngắn',
    section: 'listening',
    standardCount: 30,
    optionsCount: 4,
    isGrouped: true,
    description: 'Nghe bài độc thoại (thông báo, tin nhắn, giới thiệu...) và trả lời câu hỏi.',
  },
  {
    part: 5,
    name: 'Incomplete Sentences',
    viName: 'Hoàn thành câu',
    section: 'reading',
    standardCount: 30,
    optionsCount: 4,
    isGrouped: false,
    description: 'Chọn từ hoặc cụm từ phù hợp về ngữ pháp, từ vựng để điền vào chỗ trống.',
  },
  {
    part: 6,
    name: 'Text Completion',
    viName: 'Hoàn thành đoạn văn',
    section: 'reading',
    standardCount: 16,
    optionsCount: 4,
    isGrouped: true,
    description: 'Đọc đoạn văn có chỗ trống và chọn từ, cụm từ hoặc câu phù hợp nhất.',
  },
  {
    part: 7,
    name: 'Reading Comprehension',
    viName: 'Đọc hiểu',
    section: 'reading',
    standardCount: 54,
    optionsCount: 4,
    isGrouped: true,
    description: 'Đọc hiểu đoạn đơn, đoạn kép hoặc đoạn ba và trả lời câu hỏi.',
  },
]
