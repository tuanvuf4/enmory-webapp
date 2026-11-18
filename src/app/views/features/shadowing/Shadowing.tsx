import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  SyncOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  LinkOutlined,
  BulbOutlined,
  AudioOutlined,
  RedoOutlined,
  RobotOutlined,
  StopOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Flex,
  Skeleton,
  Slider,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
  Progress,
  Divider,
  Checkbox,
  Alert,
} from 'antd'
import clsx from 'clsx'
import { useSelector } from '@/core/hooks'
import { localDb } from '@/services/localDb'
import { exampleApi } from '@/services/firebase/api/example.api'
import {
  geminiTtsService,
  geminiPronunciationService,
  IPronunciationEvaluationResult,
} from '@/services/gemini'
import {
  useAudioRecorder,
  useSpeechRecognition,
  computeInstantSpeechStats,
  IInstantSpeechStats,
} from '@/helpers/hooks'
import { IExample, IItem } from '@/models/item.model'
import { IChecklistItem } from '@/models/checklist.model'
import styles from './shadowing.module.scss'

const { Text, Title } = Typography

// ─── Technique Definition ───────────────────────────────────────────────────

export interface IActiveTechniques {
  linking: boolean // Nối âm
  stress: boolean // Trọng âm
  intonation: boolean // Ngữ điệu
  shadow: boolean // Shadowing
}

export const TECHNIQUE_CONFIGS = [
  {
    key: 'linking' as const,
    label: 'Nối âm',
    icon: <LinkOutlined />,
    color: '#1677ff',
    desc: 'Hiển thị vòng cung nối âm giữa phụ âm và nguyên âm, nguyên âm với nguyên âm.',
  },
  {
    key: 'stress' as const,
    label: 'Trọng âm',
    icon: <ThunderboltOutlined />,
    color: '#fa541c',
    desc: 'Làm nổi bật từ nội dung quan trọng cần nhấn và làm mờ từ chức năng.',
  },
  {
    key: 'intonation' as const,
    label: 'Ngữ điệu',
    icon: <RiseOutlined />,
    color: '#52c41a',
    desc: 'Hiển thị mũi tên lên/xuống giọng và phân loại ngữ điệu toàn câu.',
  },
  {
    key: 'shadow' as const,
    label: 'Ngắt cụm từ',
    icon: null,
    color: '#722ed1',
    desc: 'Chia câu thành các cụm từ có ý nghĩa (thought groups) và cho phép nghe - lặp lại từng cụm.',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stripHtml = (html?: string): string => {
  if (!html) return ''
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

interface IUnifiedToken {
  word: string
  cleanWord: string
  index: number
  // Nối âm
  linkType: 'consonant-vowel' | 'vowel-vowel' | 'silent' | null
  nextWord?: string
  // Trọng âm
  isStressed: boolean
  // Ngữ điệu
  tone: 'up' | 'down' | 'neutral'
  // Shadowing
  chunkIndex: number
  isChunkEnd: boolean
  isSentenceEnd: boolean
}

/**
 * Phân tách câu thành các cụm từ có ý nghĩa (Thought Groups) tự nhiên
 * Dựa trên cấu trúc ngữ pháp tiếng Anh: dấu câu, liên từ kết hợp, mệnh đề phụ thuộc,
 * đại từ quan hệ, cụm giới từ, và nhịp điệu hơi thở khi nói.
 */
const splitIntoThoughtGroups = (words: string[]): string[][] => {
  const n = words.length
  if (n === 0) return []
  if (n <= 4) return [words]

  const clean = (w: string) =>
    stripHtml(w)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

  const DETERMINERS = new Set([
    'a',
    'an',
    'the',
    'this',
    'that',
    'these',
    'those',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'each',
    'every',
    'some',
    'any',
    'no',
    'another',
    'either',
    'neither',
    'many',
    'much',
    'few',
    'little',
    'several',
    'all',
    'both',
  ])

  const PREPOSITIONS = new Set([
    'in',
    'on',
    'at',
    'with',
    'without',
    'by',
    'from',
    'to',
    'for',
    'about',
    'into',
    'through',
    'during',
    'under',
    'over',
    'between',
    'among',
    'against',
    'towards',
    'toward',
    'behind',
    'beyond',
    'across',
    'along',
    'of',
    'near',
    'upon',
    'throughout',
    'within',
  ])

  const PARTICLES = new Set([
    'on',
    'off',
    'up',
    'down',
    'in',
    'out',
    'away',
    'back',
    'over',
    'by',
    'around',
    'through',
    'along',
    'about',
  ])

  const AUXILIARY_VERBS = new Set([
    'can',
    'could',
    'will',
    'would',
    'shall',
    'should',
    'may',
    'might',
    'must',
    'is',
    'are',
    'am',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'having',
    'do',
    'does',
    'did',
  ])

  const SUBORDINATING = new Set([
    'because',
    'although',
    'though',
    'while',
    'whereas',
    'since',
    'unless',
    'if',
    'whether',
    'whenever',
    'wherever',
    'before',
    'after',
    'until',
    'once',
  ])

  const RELATIVE_WH = new Set(['which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how'])

  const COORDINATING = new Set(['and', 'but', 'or', 'so', 'yet', 'nor'])

  const DISCOURSE_MARKERS = new Set([
    'however',
    'therefore',
    'furthermore',
    'moreover',
    'meanwhile',
    'otherwise',
    'actually',
    'indeed',
    'finally',
    'instead',
    'besides',
    'anyway',
    'first',
    'second',
    'third',
  ])

  const COMMON_VERBS = new Set([
    'come',
    'comes',
    'came',
    'coming',
    'go',
    'goes',
    'went',
    'gone',
    'going',
    'get',
    'gets',
    'got',
    'gotten',
    'getting',
    'take',
    'takes',
    'took',
    'taken',
    'taking',
    'put',
    'puts',
    'putting',
    'turn',
    'turns',
    'turned',
    'turning',
    'look',
    'looks',
    'looked',
    'looking',
    'give',
    'gives',
    'gave',
    'given',
    'giving',
    'bring',
    'brings',
    'brought',
    'bringing',
    'run',
    'runs',
    'ran',
    'running',
    'make',
    'makes',
    'made',
    'making',
    'pick',
    'picks',
    'picked',
    'picking',
    'hold',
    'holds',
    'held',
    'holding',
    'keep',
    'keeps',
    'kept',
    'keeping',
    'call',
    'calls',
    'called',
    'calling',
    'set',
    'sets',
    'setting',
    'stand',
    'stands',
    'stood',
    'standing',
    'sit',
    'sits',
    'sat',
    'sitting',
    'move',
    'moves',
    'moved',
    'moving',
    'show',
    'shows',
    'showed',
    'shown',
    'showing',
    'end',
    'ends',
    'ended',
    'ending',
    'grow',
    'grows',
    'grew',
    'grown',
    'growing',
    'fall',
    'falls',
    'fell',
    'fallen',
    'falling',
    'carry',
    'carries',
    'carried',
    'carrying',
    'break',
    'breaks',
    'broke',
    'broken',
    'breaking',
    'drop',
    'drops',
    'dropped',
    'dropping',
    'hang',
    'hangs',
    'hung',
    'hanging',
    'wake',
    'wakes',
    'woke',
    'woken',
    'waking',
    'step',
    'steps',
    'stepped',
    'stepping',
    'walk',
    'walks',
    'walked',
    'walking',
    'talk',
    'talks',
    'talked',
    'talking',
    'listen',
    'listens',
    'listened',
    'listening',
    'wait',
    'waits',
    'waited',
    'waiting',
    'rely',
    'relies',
    'relied',
    'relying',
    'depend',
    'depends',
    'depended',
    'depending',
    'belong',
    'belongs',
    'belonged',
    'belonging',
    'agree',
    'agrees',
    'agreed',
    'agreeing',
    'pay',
    'pays',
    'paid',
    'paying',
    'work',
    'works',
    'worked',
    'working',
    'live',
    'lives',
    'lived',
    'living',
    'stay',
    'stays',
    'stayed',
    'staying',
    'start',
    'starts',
    'started',
    'starting',
    'stop',
    'stops',
    'stopped',
    'stopping',
    'lead',
    'leads',
    'led',
    'leading',
    'pass',
    'passes',
    'passed',
    'passing',
    'check',
    'checks',
    'checked',
    'checking',
    'point',
    'points',
    'pointed',
    'pointing',
    'stare',
    'stares',
    'stared',
    'staring',
    'base',
    'bases',
    'based',
    'basing',
    'focus',
    'focuses',
    'focused',
    'focusing',
    'apply',
    'applies',
    'applied',
    'applying',
    'deal',
    'deals',
    'dealt',
    'dealing',
  ])

  const COGNITIVE_REPORTING_VERBS = new Set([
    'realize',
    'realizes',
    'realized',
    'realizing',
    'think',
    'thinks',
    'thought',
    'thinking',
    'know',
    'knows',
    'knew',
    'known',
    'knowing',
    'say',
    'says',
    'said',
    'saying',
    'tell',
    'tells',
    'told',
    'telling',
    'believe',
    'believes',
    'believed',
    'believing',
    'feel',
    'feels',
    'felt',
    'feeling',
    'hope',
    'hopes',
    'hoped',
    'hoping',
    'notice',
    'notices',
    'noticed',
    'noticing',
    'remember',
    'remembers',
    'remembered',
    'remembering',
    'find',
    'finds',
    'found',
    'finding',
    'assume',
    'assumes',
    'assumed',
    'assuming',
    'hear',
    'hears',
    'heard',
    'hearing',
    'see',
    'sees',
    'saw',
    'seen',
    'seeing',
    'understand',
    'understands',
    'understood',
    'understanding',
    'guess',
    'guesses',
    'guessed',
    'guessing',
    'suppose',
    'supposes',
    'supposed',
    'supposing',
  ])

  const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'there'])

  const BOUND_VERB_PREP_PAIRS = new Set([
    'look for',
    'look at',
    'look after',
    'look forward',
    'listen to',
    'wait for',
    'depend on',
    'rely on',
    'belong to',
    'talk to',
    'speak to',
    'agree with',
    'think about',
    'care about',
    'pay for',
    'search for',
    'ask for',
    'apply for',
    'believe in',
    'focus on',
    'deal with',
    'cope with',
    'worry about',
    'interested in',
    'good at',
    'bad at',
    'afraid of',
    'proud of',
    'tired of',
    'go to',
    'went to',
    'come from',
    'came from',
    'arrive at',
    'arrive in',
  ])

  const BOUND_PHRASES = new Set([
    'as well',
    'in order',
    'so that',
    'a lot',
    'each other',
    'one another',
    'because of',
    'instead of',
    'due to',
    'according to',
    'in front',
    'out of',
    'next to',
    'up to',
    'as soon',
    'as long',
    'even though',
    'even if',
    'a little',
    'a bit',
  ])

  const ABBREVIATIONS = new Set([
    'mr',
    'mrs',
    'ms',
    'dr',
    'prof',
    'sr',
    'jr',
    'vs',
    'etc',
    'eg',
    'ie',
    'us',
    'uk',
  ])

  // Bước 1: Phát hiện ngắt câu bắt buộc theo dấu câu (Hard boundaries)
  const hardBreakIndices = new Set<number>()
  for (let i = 0; i < n - 1; i++) {
    const rawWord = words[i]
    const cl = clean(rawWord)
    if (/[,;:—–!?]$/.test(rawWord)) {
      hardBreakIndices.add(i)
    } else if (/\.$/.test(rawWord) && !ABBREVIATIONS.has(cl)) {
      hardBreakIndices.add(i)
    }
  }

  // Chia thành các đoạn ban đầu theo dấu câu
  const initialSegments: string[][] = []
  let currentSeg: string[] = []
  for (let i = 0; i < n; i++) {
    currentSeg.push(words[i])
    if (hardBreakIndices.has(i) || i === n - 1) {
      if (currentSeg.length > 0) {
        initialSegments.push(currentSeg)
        currentSeg = []
      }
    }
  }

  // Bước 2: Hàm chấm điểm ranh giới ngắt cụm ý nghĩa giữa seg[i] và seg[i+1]
  const scoreBoundary = (seg: string[], i: number): number => {
    const w1 = seg[i]
    const w2 = seg[i + 1]
    const cl1 = clean(w1)
    const cl2 = clean(w2)
    const cl3 = i + 2 < seg.length ? clean(seg[i + 2]) : ''

    // CẤM ngắt sau từ hạn định (mạo từ, sở hữu)
    if (DETERMINERS.has(cl1)) return -9999
    // CẤM ngắt ngay sau giới từ
    if (PREPOSITIONS.has(cl1)) return -9999
    // CẤM ngắt sau trợ động từ / modal verb
    if (AUXILIARY_VERBS.has(cl1)) return -9999
    // CẤM ngắt sau 'to'
    if (cl1 === 'to') return -9999
    // CẤM ngắt sau 'not' / 'never'
    if (cl1 === 'not' || cl1 === 'never') return -9999
    // CẤM tách cụm động từ đi liền giới từ (phrasal verbs)
    if (BOUND_VERB_PREP_PAIRS.has(`${cl1} ${cl2}`)) return -9999
    // CẤM tách các cụm cố định
    if (BOUND_PHRASES.has(`${cl1} ${cl2}`)) return -9999

    // CẤM ngắt giữa động từ và tiểu từ / giới từ đi liền kề (phrasal verbs & verb-preposition attachments)
    const isVerb =
      COMMON_VERBS.has(cl1) ||
      COGNITIVE_REPORTING_VERBS.has(cl1) ||
      cl1.endsWith('ing') ||
      cl1.endsWith('ed')
    if (isVerb && (PARTICLES.has(cl2) || PREPOSITIONS.has(cl2))) {
      return -9999
    }

    let score = 0

    // Mệnh đề phụ thuộc (Subordinating conjunctions)
    if (SUBORDINATING.has(cl2)) {
      score += 85
    } else if (cl2 === 'even' && (cl3 === 'though' || cl3 === 'if')) {
      score += 85
    } else if (cl2 === 'in' && cl3 === 'order') {
      score += 85
    } else if (cl2 === 'as' && (cl3 === 'soon' || cl3 === 'long')) {
      score += 85
    } else if ((cl2 === 'only' || cl2 === 'just' || cl2 === 'simply') && cl3 === 'because') {
      score += 85
    }

    // Mệnh đề danh ngữ lược bỏ 'that' (Contact clause): động từ nhận thức/tường thuật + đại từ chủ ngữ hoặc từ hạn định
    // Ví dụ: "I realize / I come on a little strong...", "I think / you're amazing"
    if (COGNITIVE_REPORTING_VERBS.has(cl1) && (SUBJECT_PRONOUNS.has(cl2) || DETERMINERS.has(cl2))) {
      score += 75
    }

    // Đại từ quan hệ / từ để hỏi dẫn mệnh đề phụ
    if (RELATIVE_WH.has(cl2) && i >= 1) {
      score += 70
    }

    // Từ 'that' dẫn mệnh đề danh ngữ / quan hệ
    if (cl2 === 'that') {
      if (COGNITIVE_REPORTING_VERBS.has(cl1) || SUBJECT_PRONOUNS.has(cl3)) {
        score += 70
      }
    }

    // Liên từ kết hợp (Coordinating conjunctions: and, but, or, so...)
    if (COORDINATING.has(cl2)) {
      const subjectStarters = new Set([
        'i',
        'he',
        'she',
        'it',
        'we',
        'they',
        'you',
        'there',
        'the',
        'this',
        'that',
      ])
      if (subjectStarters.has(cl3) || AUXILIARY_VERBS.has(cl3) || cl3 === 'it') {
        score += 65
      } else if (i >= 2 && seg.length - (i + 1) >= 2) {
        score += 45
      }
    }

    // Từ nối / Chuyển ý (Discourse markers)
    if (DISCOURSE_MARKERS.has(cl2)) {
      score += 75
    }

    // Giới từ mở đầu cụm trạng ngữ (Prepositional phrases) - chỉ ngắt khi KHÔNG đi liền ngay sau động từ
    if (PREPOSITIONS.has(cl2) && cl2 !== 'of' && !isVerb) {
      if (i >= 2 && seg.length - (i + 1) >= 2) {
        score += 45
      }
    }

    // Động từ nguyên mẫu chỉ mục đích (to + verb)
    if (cl2 === 'to' && cl3 && !DETERMINERS.has(cl3) && !PREPOSITIONS.has(cl3)) {
      if (i >= 2 && seg.length - (i + 1) >= 2) {
        score += 45
      }
    }

    // Ưu tiên các điểm chia cân bằng độ dài cụm (3-6 từ)
    const mid = seg.length / 2
    const distFromMid = Math.abs(i + 1 - mid)
    const balanceBonus = Math.max(0, 20 - distFromMid * 4)
    score += balanceBonus

    // Phạt nặng nếu để lại cụm quá ngắn (< 2 từ) ở hai bên
    const leftLen = i + 1
    const rightLen = seg.length - (i + 1)
    if (leftLen < 2 || rightLen < 2) {
      score -= 50
    }

    return score
  }

  // Bước 3: Tinh chỉnh chia nhỏ các đoạn dài (> 6 từ)
  const refineSegment = (seg: string[]): string[][] => {
    if (seg.length <= 6) {
      return [seg]
    }

    let bestIdx = -1
    let bestScore = 0

    for (let i = 0; i < seg.length - 1; i++) {
      const s = scoreBoundary(seg, i)
      if (s > bestScore) {
        bestScore = s
        bestIdx = i
      }
    }

    if (bestIdx !== -1 && bestScore > 0) {
      const left = seg.slice(0, bestIdx + 1)
      const right = seg.slice(bestIdx + 1)
      return [...refineSegment(left), ...refineSegment(right)]
    }

    // Fallback: Tìm điểm ngắt an toàn gần trung tâm nhất không vi phạm quy tắc cấm
    const mid = Math.floor(seg.length / 2)
    let fallbackIdx = mid - 1
    for (let offset = 0; offset < mid; offset++) {
      for (const idx of [mid - 1 + offset, mid - 1 - offset]) {
        if (idx >= 1 && idx < seg.length - 2) {
          const s = scoreBoundary(seg, idx)
          if (s > -1000) {
            fallbackIdx = idx
            break
          }
        }
      }
      if (fallbackIdx !== mid - 1) break
    }

    const left = seg.slice(0, fallbackIdx + 1)
    const right = seg.slice(fallbackIdx + 1)
    return [left, right]
  }

  const finalGroups: string[][] = []
  for (const seg of initialSegments) {
    finalGroups.push(...refineSegment(seg))
  }

  return finalGroups
}

/**
 * Phân tích câu thành chuỗi token tích hợp đồng thời cả 4 kỹ thuật
 * Trong đó kỹ thuật Shadowing chia câu theo các cụm từ có ý nghĩa (Thought Groups) chuẩn.
 */
const buildUnifiedSentence = (
  sentence: string,
): {
  tokens: IUnifiedToken[]
  pattern: 'falling' | 'rising' | 'fall-rise'
  chunks: string[]
} => {
  const words = sentence.trim().split(/\s+/).filter(Boolean)
  const n = words.length
  if (n === 0) return { tokens: [], pattern: 'falling', chunks: [] }

  const VOWELS = /^[aeiouAEIOU]/
  const ENDS_CONSONANT = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]$/

  const FUNCTION_WORDS = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'do',
    'does',
    'did',
    'have',
    'has',
    'had',
    'will',
    'would',
    'can',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'to',
    'of',
    'in',
    'at',
    'on',
    'for',
    'with',
    'by',
    'from',
    'and',
    'or',
    'but',
    'if',
    'so',
    'as',
    'than',
    'that',
    'it',
    'its',
    'this',
    'those',
    'these',
    'their',
    'they',
    'he',
    'she',
    'we',
    'you',
    'i',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'our',
    'not',
    'no',
  ])

  const isQuestion = /\?$/.test(sentence.trim())
  const isWHQuestion = /^(what|where|when|why|who|how|which)\b/i.test(sentence.trim())
  const pattern: 'falling' | 'rising' | 'fall-rise' = isWHQuestion
    ? 'falling'
    : isQuestion
      ? 'rising'
      : 'falling'

  const thoughtGroupWordArrays = splitIntoThoughtGroups(words)
  const chunks: string[] = thoughtGroupWordArrays.map((g) => g.join(' '))

  let currentGroupIdx = 0
  let wordInGroupIdx = 0

  const tokens: IUnifiedToken[] = words.map((word, i) => {
    const cleanWord = stripHtml(word).replace(/[^a-zA-Z]/g, '')
    const next = words[i + 1]
    let linkType: 'consonant-vowel' | 'vowel-vowel' | 'silent' | null = null

    if (next) {
      const cleanNext = stripHtml(next).replace(/^[^a-zA-Z]/, '')
      if (ENDS_CONSONANT.test(cleanWord) && VOWELS.test(cleanNext)) {
        linkType = 'consonant-vowel'
      } else if (/[aeiouAEIOU]$/.test(cleanWord) && VOWELS.test(cleanNext)) {
        linkType = 'vowel-vowel'
      } else if (/[td]$/.test(cleanWord) && /^[aeiouAEIOU]/.test(cleanNext)) {
        linkType = 'silent'
      }
    }

    const isStressed = !FUNCTION_WORDS.has(cleanWord.toLowerCase()) || i === n - 1

    let tone: 'up' | 'down' | 'neutral' = 'neutral'
    if (i === n - 1) tone = pattern === 'rising' ? 'up' : 'down'

    const group = thoughtGroupWordArrays[currentGroupIdx] || []
    const isChunkEnd = wordInGroupIdx === group.length - 1 || i === n - 1
    const chunkIndex = currentGroupIdx

    wordInGroupIdx++
    if (wordInGroupIdx >= group.length && currentGroupIdx < thoughtGroupWordArrays.length - 1) {
      currentGroupIdx++
      wordInGroupIdx = 0
    }

    return {
      word,
      cleanWord,
      index: i,
      linkType,
      nextWord: next,
      isStressed,
      tone,
      chunkIndex,
      isChunkEnd,
      isSentenceEnd: i === n - 1,
    }
  })

  return { tokens, pattern, chunks }
}

const TIPS: string[] = [
  'Nối âm: Khi phụ âm cuối gặp nguyên âm đầu của từ kế tiếp, hãy phát âm liền mạch (pick it up → pi·ki·tup).',
  'Trọng âm: Nhấn mạnh vào từ chứa nội dung chính (danh từ, động từ) và lướt nhẹ các từ chức năng (a, an, the, in, to).',
  'Ngữ điệu: Lên giọng ↗ ở cuối câu hỏi Yes/No; xuống giọng ↘ ở câu trần thuật hoặc câu hỏi bắt đầu bằng WH-.',
  'Shadowing: Chia câu thành các cụm từ có ý nghĩa (thought groups) theo nhịp thở tự nhiên, nghe và nhại lại ngay lập tức theo ngữ điệu người bản xứ.',
]

const getPronunciationSessionKey = (uid?: string) =>
  `pronunciation_practice_session_${uid || 'default'}`

interface IPronunciationSession {
  items: IExample[]
  currentIndex: number
  updatedAt: number
}

export type TShadowingItem = IItem | IExample | IChecklistItem

export const normalizeToExamples = (
  items?: TShadowingItem | TShadowingItem[] | null,
): IExample[] => {
  if (!items) return []

  const list = Array.isArray(items) ? items : [items]
  if (list.length === 0) return []

  const result: IExample[] = []

  for (const item of list) {
    if (!item) continue

    // If it's already an IExample (has translation and no meanings array)
    if (
      'translation' in item &&
      typeof (item as any).translation === 'string' &&
      !('meanings' in item)
    ) {
      result.push(item as IExample)
      continue
    }

    const asItem = item as IItem | IChecklistItem
    const meanings = asItem.meanings || []
    const primaryMeaning = meanings.find((m) => m.common) || meanings[0]
    const translation = primaryMeaning?.translation || primaryMeaning?.definition || ''

    const mainExample: IExample = {
      id: ('checklistId' in asItem ? asItem.checklistId : asItem.id) || '',
      origin: asItem.origin || '',
      translation,
      itemOrigin: asItem.origin,
    }
    result.push(mainExample)
  }

  return result
}

export interface ShadowingProps {
  items?: TShadowingItem[] | TShadowingItem
  initialItems?: TShadowingItem[] | TShadowingItem
  exposeReload?: (reloadFn: () => void) => void
  onReload?: () => void | Promise<void>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const Shadowing: React.FC<ShadowingProps> = ({
  items,
  initialItems,
  exposeReload,
  onReload,
}) => {
  const rawItems = items || initialItems
  const normalizedItems = useMemo(() => normalizeToExamples(rawItems), [rawItems])
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)

  // Kỹ thuật được kích hoạt qua checkbox (mặc định bật tất cả để người học thấy bức tranh toàn cảnh)
  const [activeTechniques, setActiveTechniques] = useState<IActiveTechniques>(() => {
    try {
      const saved = localStorage.getItem('pronunciation_active_techniques')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      linking: true,
      stress: true,
      intonation: true,
      shadow: true,
    }
  })

  const [examples, setExamples] = useState<IExample[]>(() => normalizedItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speed, setSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pronunciation_speed')
      if (saved) return Number(saved) || 1
    } catch {}
    return 1
  })
  const [shadowChunk, setShadowChunk] = useState<number | null>(null)
  const [shadowPlaying, setShadowPlaying] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Track latest state for safe persistence
  const stateRef = useRef({
    examples,
    currentIndex,
  })
  useEffect(() => {
    stateRef.current = {
      examples,
      currentIndex,
    }
  }, [examples, currentIndex])

  const handleTechniqueChange = useCallback((key: keyof IActiveTechniques, checked: boolean) => {
    setActiveTechniques((prev) => {
      const updated = { ...prev, [key]: checked }
      try {
        localStorage.setItem('pronunciation_active_techniques', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const handleSpeedChange = useCallback((v: number) => {
    setSpeed(v)
    try {
      localStorage.setItem('pronunciation_speed', String(v))
    } catch {}
  }, [])

  // Gemini model được chọn để đánh giá thu âm
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<IPronunciationEvaluationResult | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Web Speech API: Nhận diện giọng nói tức thời tại client (<200ms)
  const {
    isSupported: isSpeechSupported,
    transcript: speechTranscript,
    interimTranscript: speechInterimTranscript,
    startListening: startSpeechListening,
    stopListening: stopSpeechListening,
    resetTranscript: resetSpeechTranscript,
  } = useSpeechRecognition('en-US')
  const [instantStats, setInstantStats] = useState<IInstantSpeechStats | null>(null)
  const [finalInstantTranscript, setFinalInstantTranscript] = useState<string>('')

  // Dynamic step animation cho trải nghiệm chờ AI
  const [evalStepIndex, setEvalStepIndex] = useState(0)
  const evalIdRef = useRef(0)
  const lastEvaluatedBlobRef = useRef<Blob | null>(null)

  const EVAL_STEPS = useMemo(
    () => [
      'Đang phân tích âm thanh & nhận diện giọng nói...',
      'Đang kiểm tra kỹ thuật nối âm (Connected Speech)...',
      'Đang đo lường trọng âm câu & giảm âm (Stress)...',
      'Đang đánh giá ngữ điệu (Intonation) & độ lưu loát...',
    ],
    [],
  )

  useEffect(() => {
    let interval: any = null
    if (isEvaluating) {
      setEvalStepIndex(0)
      interval = setInterval(() => {
        setEvalStepIndex((prev) => (prev + 1) % EVAL_STEPS.length)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isEvaluating, EVAL_STEPS.length])

  // Hook thu âm audio
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder(60)

  // Reset toàn bộ bản ghi âm và kết quả tức thì
  const handleFullResetRecording = useCallback(() => {
    evalIdRef.current++
    lastEvaluatedBlobRef.current = null
    resetRecording()
    resetSpeechTranscript()
    setInstantStats(null)
    setFinalInstantTranscript('')
    setEvalResult(null)
    setEvalError(null)
    setIsEvaluating(false)
  }, [resetRecording, resetSpeechTranscript])

  const handleFullResetRecordingRef = useRef(handleFullResetRecording)
  useEffect(() => {
    handleFullResetRecordingRef.current = handleFullResetRecording
  }, [handleFullResetRecording])

  const currentExample = examples[currentIndex]
  const plainOrigin = useMemo(() => stripHtml(currentExample?.origin), [currentExample])
  const plainTranslation = useMemo(() => stripHtml(currentExample?.translation), [currentExample])

  // Phân tích đồng thời cả 4 kỹ thuật
  const { tokens, chunks } = useMemo(() => buildUnifiedSentence(plainOrigin), [plainOrigin])

  // Lưu session (danh sách câu và câu hiện tại) vào localDb & localStorage
  const saveSession = useCallback(
    async (patch: { items?: IExample[]; currentIndex?: number }) => {
      if (normalizedItems.length > 0) return
      try {
        const key = getPronunciationSessionKey(user?.uid)
        const cur = stateRef.current
        const sessionData: IPronunciationSession = {
          items: patch.items ?? cur.examples,
          currentIndex: patch.currentIndex ?? cur.currentIndex,
          updatedAt: Date.now(),
        }

        try {
          localStorage.setItem(key, JSON.stringify(sessionData))
        } catch {}

        await localDb.syncMeta.put({
          key,
          value: sessionData,
        })
      } catch (err) {
        console.warn('Failed to save pronunciation session:', err)
      }
    },
    [user?.uid, normalizedItems],
  )

  // Fetch hoặc phục hồi session câu ví dụ
  const fetchExamples = useCallback(
    async (forceNew = false) => {
      setLoading(true)
      setRevealed(false)
      setShadowChunk(null)
      setEvalResult(null)
      setEvalError(null)
      handleFullResetRecordingRef.current()

      if (normalizedItems.length > 0) {
        setExamples(normalizedItems)
        setCurrentIndex(0)
        setLoading(false)
        return
      }

      const key = getPronunciationSessionKey(user?.uid)

      // 1. Phục hồi bộ câu đã lưu nếu không ép tải mới (tránh đổi bộ câu khi refresh page)
      if (!forceNew) {
        try {
          let savedSession: IPronunciationSession | null = null

          // Thử lấy từ localDb.syncMeta
          try {
            const record = await localDb.syncMeta.get(key)
            if (
              record?.value &&
              Array.isArray(record.value.items) &&
              record.value.items.length > 0
            ) {
              savedSession = record.value
            }
          } catch (e) {
            console.warn('Failed to restore pronunciation from localDb:', e)
          }

          // Fallback sang localStorage nếu localDb chưa có
          if (!savedSession) {
            try {
              const raw = localStorage.getItem(key)
              if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                  savedSession = parsed
                }
              }
            } catch (e) {
              console.warn('Failed to restore pronunciation from localStorage:', e)
            }
          }

          if (savedSession && savedSession.items.length > 0) {
            const savedItems = savedSession.items
            const savedIndex = Math.min(
              Math.max(0, savedSession.currentIndex || 0),
              savedItems.length - 1,
            )
            setExamples(savedItems)
            setCurrentIndex(savedIndex)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Failed to restore pronunciation session:', err)
        }
      }

      // 2. Tải bộ câu ngẫu nhiên mới khi không có session lưu hoặc khi bấm tải lại
      setCurrentIndex(0)
      try {
        const { isSuccess, content } = await exampleApi.getRandomExamples(15)
        if (isSuccess && content) {
          const filtered = content.filter((ex) => {
            const text = stripHtml(ex.origin)
            return text.split(/\s+/).length >= 4
          })
          const newItems = filtered.length >= 3 ? filtered : content
          setExamples(newItems)

          // Lưu vào session để giữ nguyên khi refresh
          const sessionData: IPronunciationSession = {
            items: newItems,
            currentIndex: 0,
            updatedAt: Date.now(),
          }

          try {
            localStorage.setItem(key, JSON.stringify(sessionData))
          } catch {}

          try {
            await localDb.syncMeta.put({
              key,
              value: sessionData,
            })
          } catch (e) {
            console.warn('Failed to save pronunciation session to localDb:', e)
          }
        }
      } catch (err) {
        console.error('Shadowing fetch error:', err)
      } finally {
        setLoading(false)
      }
    },
    [user?.uid, normalizedItems],
  )

  const reload = useCallback(() => {
    if (onReload) {
      onReload()
      return
    }
    fetchExamples(true)
  }, [onReload, fetchExamples])

  useEffect(() => {
    if (exposeReload) {
      exposeReload(reload)
    }
  }, [exposeReload, reload])

  useEffect(() => {
    if (normalizedItems.length > 0) {
      setExamples(normalizedItems)
      setCurrentIndex(0)
      setRevealed(false)
      setShadowChunk(null)
      setEvalResult(null)
      setEvalError(null)
      handleFullResetRecordingRef.current()
      return
    }
    fetchExamples(false)
  }, [normalizedItems, fetchExamples])

  // Dừng mọi âm thanh đang phát
  const handleStop = useCallback(() => {
    geminiTtsService.stop()
    setSpeaking(false)
    setShadowPlaying(false)
    setShadowChunk(null)
  }, [])

  // Phát âm toàn câu hoặc 1 đoạn với Gemini TTS
  const handleSpeak = useCallback(
    async (text?: string, rate?: number) => {
      const t = text || plainOrigin
      if (!t) return
      if (speaking || shadowPlaying) {
        handleStop()
        return
      }
      setSpeaking(true)
      try {
        await geminiTtsService.playSpeech(t, {
          voice: 'Aoede',
          playbackRate: rate ?? speed,
          onEnd: () => setSpeaking(false),
          onError: () => setSpeaking(false),
        })
      } catch {
        setSpeaking(false)
      }
    },
    [plainOrigin, speaking, shadowPlaying, speed, handleStop],
  )

  // Phát âm từng cụm từ có ý nghĩa (Thought Group) để người học nghe và nhại lại
  const handlePlayChunk = useCallback(
    async (chunkIdx: number, chunkText: string) => {
      if (shadowPlaying && shadowChunk === chunkIdx) {
        handleStop()
        return
      }
      handleStop()
      setShadowChunk(chunkIdx)
      setShadowPlaying(true)
      try {
        await geminiTtsService.playSpeech(chunkText, {
          voice: 'Aoede',
          playbackRate: speed,
          onEnd: () => {
            setShadowPlaying(false)
            setShadowChunk(null)
          },
          onError: () => {
            setShadowPlaying(false)
            setShadowChunk(null)
          },
        })
      } catch {
        setShadowPlaying(false)
        setShadowChunk(null)
      }
    },
    [handleStop, shadowPlaying, shadowChunk, speed],
  )

  // Chuyển câu trước / tiếp
  const handleNext = useCallback(() => {
    handleStop()
    setRevealed(false)
    setShadowChunk(null)
    handleFullResetRecording()
    setCurrentIndex((prev) => {
      const nextIdx = (prev + 1) % Math.max(examples.length, 1)
      saveSession({ currentIndex: nextIdx, items: examples })
      return nextIdx
    })
  }, [examples, handleStop, handleFullResetRecording, saveSession])

  const handlePrev = useCallback(() => {
    handleStop()
    setRevealed(false)
    setShadowChunk(null)
    handleFullResetRecording()
    setCurrentIndex((prev) => {
      const prevIdx = (prev - 1 + examples.length) % Math.max(examples.length, 1)
      saveSession({ currentIndex: prevIdx, items: examples })
      return prevIdx
    })
  }, [examples, handleStop, handleFullResetRecording, saveSession])

  // Khởi động thu âm và nhận diện giọng nói tức thời song song
  const handleStartRecording = useCallback(async () => {
    handleFullResetRecording()
    if (isSpeechSupported) {
      startSpeechListening()
    }
    await startRecording()
  }, [handleFullResetRecording, isSpeechSupported, startSpeechListening, startRecording])

  // Dừng thu âm và chốt kết quả client STT
  const handleStopRecording = useCallback(() => {
    stopRecording()
    if (isSpeechSupported) {
      stopSpeechListening()
    }
  }, [isSpeechSupported, stopSpeechListening, stopRecording])

  // Gửi audio tới Gemini model để nhận xét và đánh giá
  const handleEvaluateAudio = useCallback(
    async (blobToEval?: Blob) => {
      const targetBlob = blobToEval || audioBlob
      if (!targetBlob || isEvaluating) return

      const currentEvalId = ++evalIdRef.current
      setIsEvaluating(true)
      setEvalError(null)

      try {
        const response = await geminiPronunciationService.evaluateAudio({
          audioBlob: targetBlob,
          originalText: plainOrigin,
          translation: plainTranslation,
        })

        // Tránh race condition khi người học đã chuyển câu hoặc ghi âm lại
        if (evalIdRef.current !== currentEvalId) return

        if (response.isSuccess && response.content) {
          setEvalResult(response.content)
          setCooldownSeconds(0)
        } else {
          setEvalError(response.message || 'Không thể đánh giá lúc này. Vui lòng thử lại.')
          if (response.statusCode === 429) {
            setCooldownSeconds(15)
          }
        }
      } catch (err: any) {
        if (evalIdRef.current !== currentEvalId) return
        console.error('Audio evaluation error:', err)
        setEvalError(err?.message || 'Có lỗi xảy ra khi gửi.')
      } finally {
        if (evalIdRef.current === currentEvalId) {
          setIsEvaluating(false)
        }
      }
    },
    [audioBlob, isEvaluating, plainOrigin, plainTranslation],
  )

  const plainOriginRef = useRef(plainOrigin)
  plainOriginRef.current = plainOrigin

  const recordingDurationRef = useRef(recordingDuration)
  recordingDurationRef.current = recordingDuration

  const speechTranscriptRef = useRef('')
  speechTranscriptRef.current = speechTranscript || speechInterimTranscript

  // Phản hồi nhận diện giọng nói tức thì ngay tại client (< 200ms) khi kết thúc thu âm
  useEffect(() => {
    if (audioBlob && !isRecording && audioBlob !== lastEvaluatedBlobRef.current) {
      lastEvaluatedBlobRef.current = audioBlob

      const currentTranscript = speechTranscriptRef.current
      if (currentTranscript) {
        const stats = computeInstantSpeechStats(
          currentTranscript,
          plainOriginRef.current,
          recordingDurationRef.current,
        )
        setInstantStats(stats)
        setFinalInstantTranscript(currentTranscript)
      }
    }
  }, [audioBlob, isRecording])

  const randomTip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], [currentIndex])

  return (
    <div className={styles.wrapper}>
      {/* ── Checkboxes gộp 4 kỹ thuật: Nối âm, Trọng âm, Ngữ điệu, Shadowing ── */}
      <div className={styles.techniqueBar}>
        <div className={styles.techniqueCheckboxes}>
          {TECHNIQUE_CONFIGS.map((cfg) => {
            const isChecked = activeTechniques[cfg.key]
            return (
              <Tooltip key={cfg.key} title={cfg.desc} placement='top'>
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => handleTechniqueChange(cfg.key, e.target.checked)}
                >
                  <span
                    className={styles.techniqueLabel}
                    style={{ color: isChecked ? cfg.color : token.colorTextSecondary }}
                  >
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </span>
                </Checkbox>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {/* ── Main Practice Card ── */}
      {loading ? (
        <Card className={styles.practiceCard}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ) : !currentExample ? (
        <Card className={styles.practiceCard}>
          <Flex vertical align='center' gap={12}>
            <Text type='secondary'>Không tìm thấy câu ví dụ.</Text>
            <Button icon={<SyncOutlined />} onClick={() => fetchExamples(true)}>
              Tải lại
            </Button>
          </Flex>
        </Card>
      ) : (
        <Card
          className={styles.practiceCard}
          styles={{ body: { padding: token.size } }}
          style={{
            borderColor: token.colorBorder,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.05)`,
          }}
        >
          {/* Header */}
          <Flex justify='space-between' align='center' style={{ marginBottom: token.size * 0.5 }}>
            <Flex align='center' gap={8}>
              <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                Luyện Nói & Ngữ Âm
              </Title>
              {examples.length > 0 && (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {currentIndex + 1}/{examples.length}
                </Text>
              )}
            </Flex>

            <Flex gap={4} align='center'>
              {(normalizedItems.length !== 1 || Boolean(onReload)) && (
                <Button
                  size='small'
                  icon={<SyncOutlined spin={loading} />}
                  onClick={reload}
                  type='text'
                />
              )}
            </Flex>
          </Flex>

          {/* Tip Panel */}
          <div className={styles.tipBox}>
            <BulbOutlined style={{ color: '#faad14', flexShrink: 0, marginTop: 2 }} />
            <Text style={{ fontSize: 13 }}>{randomTip}</Text>
          </div>

          {/* ── UNIFIED SENTENCE VISUALIZER ── */}
          <div className={styles.visualizerBox}>
            {/* Header thông tin ngữ điệu & chunk khi được kích hoạt */}
            <div className={styles.visualizerHeader}>
              {/* Shadowing: Danh sách các cụm từ để luyện nhại */}
              {activeTechniques.shadow && chunks.length > 0 && (
                <div className={styles.shadowChunksBar}>
                  <Flex justify='space-between' align='center' wrap='wrap' gap={6}>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>
                      Luyện shadowing từng cụm từ:
                    </Text>
                  </Flex>
                  <div className={styles.shadowChunksList} style={{ marginTop: 4 }}>
                    {chunks.map((chunk, cIdx) => {
                      const isChunkActive = shadowChunk === cIdx && shadowPlaying
                      return (
                        <button
                          key={cIdx}
                          type='button'
                          className={clsx(
                            styles.shadowChunkItem,
                            isChunkActive && styles.shadowChunkActive,
                          )}
                          onClick={() => handlePlayChunk(cIdx, chunk)}
                          title='Bấm để nghe riêng cụm này'
                        >
                          {isChunkActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          <span>{chunk}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Khối hiển thị câu với các kỹ thuật được gộp và ẩn/hiện theo checkbox */}
            <div className={styles.tokensRow}>
              {tokens.map((t, idx) => {
                const isCurrentChunkActive =
                  activeTechniques.shadow && shadowChunk === t.chunkIndex && shadowPlaying

                return (
                  <React.Fragment key={idx}>
                    <div className={styles.wordContainer}>
                      {/* Ngữ điệu: Mũi tên tone phía trên từ */}
                      <div className={styles.intonationSlot}>
                        {activeTechniques.intonation && t.tone !== 'neutral' && (
                          <span
                            className={clsx(
                              t.tone === 'up' && styles.arrowUp,
                              t.tone === 'down' && styles.arrowDown,
                            )}
                          >
                            {t.tone === 'up' ? '↗' : '↘'}
                          </span>
                        )}
                      </div>

                      {/* Từ vựng: Kiểu chữ thay đổi theo Trọng âm */}
                      <span
                        className={clsx(
                          styles.token,
                          speaking && styles.tokenSpeaking,
                          isCurrentChunkActive && styles.tokenSpeaking,
                          activeTechniques.stress && t.isStressed && styles.tokenStressed,
                          activeTechniques.stress && !t.isStressed && styles.tokenUnstressed,
                        )}
                        style={{
                          color:
                            activeTechniques.stress && t.isStressed
                              ? '#fa541c'
                              : token.colorTextHeading,
                        }}
                      >
                        {t.word}
                      </span>

                      {/* Nối âm: Vòng cung nối ở phía dưới khoảng cách giữa 2 từ */}
                      {activeTechniques.linking && t.linkType && (
                        <Tooltip
                          title={
                            t.linkType === 'consonant-vowel'
                              ? `Nối phụ âm cuối "${t.cleanWord.slice(-1)}" với nguyên âm đầu của "${t.nextWord}"`
                              : t.linkType === 'vowel-vowel'
                                ? `Nối nguyên âm - nguyên âm (lướt âm /w/ hoặc /j/)`
                                : `Âm câm / nối mờ lướt nhẹ`
                          }
                          placement='bottom'
                        >
                          <span
                            className={clsx(
                              styles.linkSlot,
                              t.linkType === 'consonant-vowel' && styles.linkCV,
                              t.linkType === 'vowel-vowel' && styles.linkVV,
                              t.linkType === 'silent' && styles.linkSilent,
                            )}
                          />
                        </Tooltip>
                      )}
                    </div>

                    {/* Shadowing: Dấu gạch chéo phân chia cụm nhịp điệu */}
                    {activeTechniques.shadow && t.isChunkEnd && !t.isSentenceEnd && (
                      <span className={styles.chunkDivider}>/</span>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* ── Translation reveal ── */}
          <div className={styles.translationArea}>
            {!revealed ? (
              <Button
                type='dashed'
                size='small'
                icon={<InfoCircleOutlined />}
                onClick={() => setRevealed(true)}
                style={{ fontSize: 12 }}
              >
                Xem bản dịch tiếng Việt
              </Button>
            ) : (
              <Flex align='flex-start' gap={8}>
                <CheckCircleOutlined style={{ color: token.colorSuccess, marginTop: 2 }} />
                <Text type='secondary' style={{ fontSize: 13 }}>
                  {plainTranslation}
                </Text>
              </Flex>
            )}
          </div>

          <Divider style={{ margin: `${token.size * 0.5}px 0` }} />

          {/* ── Controls: Tốc độ, Nghe mẫu và Chuyển câu ── */}
          <Flex vertical gap={token.size * 0.75}>
            {/* Speed slider */}
            <Flex align='center' gap={12}>
              <Text style={{ fontSize: 12, color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>
                Tốc độ đọc: {Math.round(speed * 100)}%
              </Text>
              <Slider
                min={0.5}
                max={1.5}
                step={0.05}
                value={speed}
                onChange={handleSpeedChange}
                style={{ flex: 1 }}
                tooltip={{ formatter: (v) => `${Math.round((v || 1) * 100)}%` }}
              />
            </Flex>

            {/* Buttons row */}
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Button onClick={handlePrev} disabled={examples.length <= 1}>
                ← Trước
              </Button>

              <Button
                type='primary'
                icon={speaking ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={speaking ? handleStop : () => handleSpeak()}
                style={{
                  background: speaking ? '#ff4d4f' : token.colorPrimary,
                  borderColor: speaking ? '#ff4d4f' : token.colorPrimary,
                  minWidth: 100,
                }}
              >
                {speaking ? 'Dừng' : 'Nghe'}
              </Button>

              <Button type='primary' onClick={handleNext} disabled={examples.length <= 1}>
                Tiếp →
              </Button>
            </Flex>
          </Flex>

          <Divider style={{ margin: `${token.size * 0.5}px 0` }} />

          {/* ── THU ÂM & ĐÁNH GIÁ VỚI GEMINI MODELS ── */}
          <Card
            size='small'
            className={styles.recorderCard}
            title={
              <Flex
                justify='space-between'
                align='center'
                wrap='wrap'
                gap={8}
                className={'mt-2 mb-2'}
              >
                <Flex align='center' gap={8}>
                  <AudioOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Thu âm & Đánh giá với Gemini AI
                  </span>
                </Flex>
              </Flex>
            }
          >
            {/* Lỗi microphone nếu có */}
            {recorderError && (
              <Alert
                type='error'
                message={recorderError}
                showIcon
                closable
                style={{ marginBottom: 12, fontSize: 12 }}
              />
            )}

            {/* Bảng điều khiển thu âm */}
            <div className={styles.recordConsole}>
              {!isRecording && !audioUrl && (
                <Flex vertical align='center' gap={token.size}>
                  <Button
                    type='primary'
                    danger
                    size='large'
                    icon={<AudioOutlined />}
                    onClick={handleStartRecording}
                    style={{ borderRadius: 24, paddingLeft: 24, paddingRight: 24, height: 42 }}
                  >
                    Bắt đầu thu âm giọng bạn
                  </Button>
                  <Text type='secondary' style={{ fontSize: 12, textAlign: 'center' }}>
                    Đọc to câu trên và AI sẽ phân tích nối âm, trọng âm, ngữ điệu & shadowing.
                  </Text>
                </Flex>
              )}

              {/* Đang thu âm */}
              {isRecording && (
                <Flex vertical align='center' gap={10}>
                  <Flex align='center' gap={12}>
                    <div className={styles.recordWaveAnimation}>
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                    </div>
                    <Tag color='error' style={{ fontSize: 13, fontWeight: 700, borderRadius: 12 }}>
                      ● Đang ghi âm: {recordingDuration}s
                    </Tag>
                  </Flex>

                  {/* Real-time transcript preview trong lúc thu âm */}
                  {isSpeechSupported && (
                    <Text
                      type='secondary'
                      style={{
                        fontSize: 12,
                        fontStyle: 'italic',
                        maxWidth: 420,
                        textAlign: 'center',
                        color: token.colorPrimary,
                      }}
                    >
                      {speechInterimTranscript || speechTranscript
                        ? `"${speechInterimTranscript || speechTranscript}"`
                        : '🎙️ Hãy đọc to câu mẫu ở trên...'}
                    </Text>
                  )}

                  <Button
                    type='primary'
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStopRecording}
                    style={{ borderRadius: 20 }}
                  >
                    Dừng thu âm
                  </Button>
                </Flex>
              )}

              {/* Đã thu âm xong - Nghe lại & Gửi đánh giá */}
              {!isRecording && audioUrl && (
                <Flex vertical align='center' gap={12} style={{ width: '100%' }}>
                  <audio controls src={audioUrl} className={styles.audioPlayer} />

                  {/* ⚡ Phản hồi tức thì ngay tại client (< 200ms) */}
                  {instantStats && finalInstantTranscript && (
                    <div className={styles.instantSpeechBox}>
                      <Flex justify='space-between' align='center' wrap='wrap' gap={6}>
                        <Flex align='center' gap={6}>
                          <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                          <Text strong style={{ fontSize: 12 }}>
                            Nhận diện tức thì (Client Speech):
                          </Text>
                        </Flex>
                        <Space size={6}>
                          <Tag
                            color={
                              instantStats.matchPercentage >= 80
                                ? 'success'
                                : instantStats.matchPercentage >= 50
                                  ? 'warning'
                                  : 'error'
                            }
                            style={{ borderRadius: 6, fontWeight: 700 }}
                          >
                            {instantStats.matchPercentage}% khớp từ
                          </Tag>
                          <Tag color='cyan' style={{ borderRadius: 6, fontSize: 11 }}>
                            ~{instantStats.wpm} WPM (tốc độ đọc)
                          </Tag>
                        </Space>
                      </Flex>
                      <Text type='secondary' style={{ fontSize: 12, fontStyle: 'italic' }}>
                        "{finalInstantTranscript}"
                      </Text>
                    </div>
                  )}

                  <Flex gap={8} wrap='wrap' justify='center'>
                    <Button
                      icon={<RedoOutlined />}
                      onClick={handleFullResetRecording}
                      disabled={isEvaluating}
                      style={{ fontSize: 12 }}
                    >
                      Thu âm lại
                    </Button>

                    <Button
                      type='primary'
                      icon={isEvaluating ? <SyncOutlined spin /> : <RobotOutlined />}
                      onClick={() => handleEvaluateAudio()}
                      loading={isEvaluating}
                      disabled={isEvaluating || cooldownSeconds > 0}
                      style={{
                        background: 'linear-gradient(90deg, #1677ff 0%, #722ed1 100%)',
                        borderColor: '#1677ff',
                        fontWeight: 600,
                      }}
                    >
                      {isEvaluating
                        ? 'AI đang phân tích...'
                        : cooldownSeconds > 0
                          ? `Chờ thử lại (${cooldownSeconds}s)`
                          : evalResult
                            ? 'AI Đánh giá lại'
                            : 'AI Đánh giá'}
                    </Button>
                  </Flex>
                </Flex>
              )}
            </div>

            {/* Trạng thái tiến trình AI sinh động thay vì spinner chặn màn hình */}
            {isEvaluating && (
              <div className={styles.evaluatingBox}>
                <div className={styles.evaluatingStepRow}>
                  <LoadingOutlined spin style={{ fontSize: 16 }} />
                  <span>{EVAL_STEPS[evalStepIndex]}</span>
                </div>
                <Progress
                  percent={Math.min(95, (evalStepIndex + 1) * 25)}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#1677ff',
                    '100%': '#722ed1',
                  }}
                  size={['100%', 4]}
                  status='active'
                />
                <div className={styles.evaluatingTip}>
                  <BulbOutlined style={{ color: '#faad14', marginTop: 1, flexShrink: 0 }} />
                  <span>
                    <strong>Mẹo hữu ích:</strong> {randomTip}
                  </span>
                </div>
              </div>
            )}

            {/* Thông báo lỗi AI */}
            {evalError && (
              <Alert
                type='warning'
                message='Đánh giá chưa thành công'
                description={evalError}
                showIcon
                style={{ marginTop: 12, fontSize: 12 }}
              />
            )}

            {/* ── KẾT QUẢ ĐÁNH GIÁ TỪ GEMINI ── */}
            {evalResult && !isEvaluating && (
              <div className={styles.evaluationBox}>
                {/* Banner điểm tổng quan */}
                <div className={styles.scoreBanner}>
                  <Flex align='center' gap={16}>
                    <Progress
                      type='circle'
                      percent={evalResult.overallScore}
                      size={60}
                      strokeColor={
                        evalResult.overallScore >= 80
                          ? '#52c41a'
                          : evalResult.overallScore >= 60
                            ? '#faad14'
                            : '#ff4d4f'
                      }
                      format={(pct) => `${pct}đ`}
                    />
                    <div>
                      <Flex align='center' gap={8}>
                        <Title level={5} style={{ margin: 0 }}>
                          {evalResult.overallScore >= 85
                            ? 'Xuất sắc! 🎉'
                            : evalResult.overallScore >= 70
                              ? 'Khá tốt! 👍'
                              : 'Cần luyện tập thêm 💪'}
                        </Title>
                        {evalResult.modelUsed && (
                          <Tag color='geekblue' style={{ borderRadius: 6, fontSize: 10 }}>
                            {evalResult.modelUsed}
                          </Tag>
                        )}
                      </Flex>
                      <Text
                        type='secondary'
                        style={{ fontSize: 12, display: 'block', marginTop: 2 }}
                      >
                        {evalResult.overallFeedback}
                      </Text>
                    </div>
                  </Flex>
                </div>

                {/* Đối chiếu câu AI nghe được */}
                <div className={styles.transcribeBox}>
                  <Text strong style={{ fontSize: 12, color: token.colorPrimary }}>
                    AI nghe được bạn đọc:
                  </Text>
                  <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: 13 }}>
                    "{evalResult.transcribedText}"
                  </p>
                </div>

                {/* 4 Khối đánh giá tương ứng 4 kỹ thuật */}
                <div className={styles.techniquesGrid}>
                  {/* 1. Nối âm */}
                  <div className={styles.techniqueCard}>
                    <div className={styles.techniqueCardHeader}>
                      <Space size={6}>
                        <LinkOutlined style={{ color: '#1677ff' }} />
                        <Text strong style={{ fontSize: 12 }}>
                          Nối âm
                        </Text>
                      </Space>
                      <Tag color='blue' style={{ fontWeight: 700, margin: 0 }}>
                        {evalResult.techniques.linking.score}%
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12 }}>{evalResult.techniques.linking.feedback}</Text>
                    {evalResult.techniques.linking.details && (
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        💡 {evalResult.techniques.linking.details}
                      </Text>
                    )}
                  </div>

                  {/* 2. Trọng âm */}
                  <div className={styles.techniqueCard}>
                    <div className={styles.techniqueCardHeader}>
                      <Space size={6}>
                        <ThunderboltOutlined style={{ color: '#fa541c' }} />
                        <Text strong style={{ fontSize: 12 }}>
                          Trọng âm
                        </Text>
                      </Space>
                      <Tag color='orange' style={{ fontWeight: 700, margin: 0 }}>
                        {evalResult.techniques.stress.score}%
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12 }}>{evalResult.techniques.stress.feedback}</Text>
                    {evalResult.techniques.stress.details && (
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        💡 {evalResult.techniques.stress.details}
                      </Text>
                    )}
                  </div>

                  {/* 3. Ngữ điệu */}
                  <div className={styles.techniqueCard}>
                    <div className={styles.techniqueCardHeader}>
                      <Space size={6}>
                        <RiseOutlined style={{ color: '#52c41a' }} />
                        <Text strong style={{ fontSize: 12 }}>
                          Ngữ điệu
                        </Text>
                      </Space>
                      <Tag color='green' style={{ fontWeight: 700, margin: 0 }}>
                        {evalResult.techniques.intonation.score}%
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12 }}>
                      {evalResult.techniques.intonation.feedback}
                    </Text>
                    {evalResult.techniques.intonation.details && (
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        💡 {evalResult.techniques.intonation.details}
                      </Text>
                    )}
                  </div>

                  {/* 4. Shadowing / Lưu loát */}
                  <div className={styles.techniqueCard}>
                    <div className={styles.techniqueCardHeader}>
                      <Space size={6}>
                        <PlayCircleOutlined style={{ color: '#722ed1' }} />
                        <Text strong style={{ fontSize: 12 }}>
                          Nhịp điệu & Lưu loát
                        </Text>
                      </Space>
                      <Tag color='purple' style={{ fontWeight: 700, margin: 0 }}>
                        {evalResult.techniques.shadowing.score}%
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12 }}>{evalResult.techniques.shadowing.feedback}</Text>
                    {evalResult.techniques.shadowing.details && (
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        💡 {evalResult.techniques.shadowing.details}
                      </Text>
                    )}
                  </div>
                </div>

                {/* Từ vựng cần lưu ý */}
                {evalResult.wordsReview && evalResult.wordsReview.length > 0 ? (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      Từ cần cải thiện phát âm:
                    </Text>
                    <div className={styles.wordTagsList}>
                      {evalResult.wordsReview.map((w, wIdx) => (
                        <Tooltip
                          key={wIdx}
                          title={`${w.ipa ? `Phát âm: ${w.ipa}. ` : ''}${w.note || ''}`}
                        >
                          <Tag
                            color={
                              w.status === 'correct'
                                ? 'success'
                                : w.status === 'imprecise'
                                  ? 'warning'
                                  : 'error'
                            }
                            style={{ cursor: 'pointer', borderRadius: 6, fontSize: 12 }}
                          >
                            {w.word} {w.ipa && `(${w.ipa})`}
                          </Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert
                    type='success'
                    showIcon
                    message='Phát âm các từ rất chuẩn xác! 🎉'
                    description='AI không ghi nhận từ nào bị phát âm sai hoặc lỗi phụ âm/nguyên âm nghiêm trọng.'
                    style={{ fontSize: 12, padding: '8px 12px' }}
                  />
                )}

                {/* Lời khuyên hành động */}
                {evalResult.actionableTips && evalResult.actionableTips.length > 0 && (
                  <div className={styles.tipsBox}>
                    <Text strong style={{ fontSize: 12, color: '#389e0d' }}>
                      Mẹo nâng cao từ huấn luyện viên AI:
                    </Text>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      {evalResult.actionableTips.map((tip, tIdx) => (
                        <li key={tIdx} style={{ fontSize: 12, lineHeight: 1.6 }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Card>
      )}

      {/* ── Chú thích biểu tượng cho các kỹ thuật đang bật ── */}
      {(activeTechniques.linking || activeTechniques.stress || activeTechniques.intonation) && (
        <Card
          size='small'
          className={styles.legendCard}
          title={
            <Flex gap={6} align='center'>
              <InfoCircleOutlined />
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                Chú thích kỹ thuật đang hiển thị
              </span>
            </Flex>
          }
        >
          <Flex wrap='wrap' gap={16}>
            {activeTechniques.linking && (
              <Flex align='center' gap={6}>
                <span
                  className={clsx(styles.linkSlot, styles.linkCV)}
                  style={{
                    position: 'static',
                    display: 'inline-block',
                    width: 22,
                    height: 8,
                    transform: 'none',
                  }}
                />
                <Text style={{ fontSize: 12 }}>Nối phụ âm → nguyên âm</Text>
              </Flex>
            )}

            {activeTechniques.stress && (
              <Flex align='center' gap={6}>
                <span className={styles.stressDot} style={{ display: 'inline-block', margin: 0 }} />
                <span style={{ fontWeight: 800, color: '#fa541c', fontSize: 13 }}>WORD</span>
                <Text style={{ fontSize: 12 }}>Từ nội dung được nhấn</Text>
              </Flex>
            )}

            {activeTechniques.intonation && (
              <Flex align='center' gap={8}>
                <span style={{ color: '#52c41a', fontWeight: 800 }}>↗</span>
                <Text style={{ fontSize: 12 }}>Lên giọng</Text>
                <span style={{ color: '#1677ff', fontWeight: 800, marginLeft: 4 }}>↘</span>
                <Text style={{ fontSize: 12 }}>Xuống giọng</Text>
              </Flex>
            )}

            {activeTechniques.shadow && (
              <Flex align='center' gap={6}>
                <span style={{ color: '#722ed1', fontWeight: 700, fontSize: 14 }}>/</span>
                <Text style={{ fontSize: 12 }}>Ngắt cụm từ</Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}
    </div>
  )
}
