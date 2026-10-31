import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  SoundOutlined,
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
  Select,
  Alert,
  Spin,
} from 'antd'
import clsx from 'clsx'
import { exampleApi } from '@/services/firebase/api/example.api'
import {
  geminiTtsService,
  geminiPronunciationService,
  GEMINI_SPEECH_EVAL_MODELS,
  DEFAULT_SPEECH_EVAL_MODEL,
  TGeminiModel,
  IPronunciationEvaluationResult,
} from '@/services/gemini'
import { useAudioRecorder } from '@/helpers/hooks'
import { IExample } from '@/models/item.model'
import styles from './pronunciation.module.scss'

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
    label: 'Shadowing',
    icon: <PlayCircleOutlined />,
    color: '#722ed1',
    desc: 'Chia câu thành các cụm nhịp điệu (chunks) và cho phép nghe - lặp lại từng cụm.',
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
 * Phân tích câu thành chuỗi token tích hợp đồng thời cả 4 kỹ thuật
 */
const buildUnifiedSentence = (
  sentence: string,
  chunkSize: number = 3,
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

  const chunks: string[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }

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

    const chunkIndex = Math.floor(i / chunkSize)
    const isChunkEnd = (i + 1) % chunkSize === 0 || i === n - 1

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
  'Shadowing: Chia câu thành các cụm nghĩa nhỏ (chunks) 2-4 từ, nghe và nhại lại ngay lập tức theo ngữ điệu người bản xứ.',
]

// ─── Main Component ───────────────────────────────────────────────────────────

export const PronunciationPractice: React.FC = () => {
  const { token } = theme.useToken()

  // Kỹ thuật được kích hoạt qua checkbox (mặc định bật tất cả để người học thấy bức tranh toàn cảnh)
  const [activeTechniques, setActiveTechniques] = useState<IActiveTechniques>({
    linking: true,
    stress: true,
    intonation: true,
    shadow: true,
  })

  const [examples, setExamples] = useState<IExample[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speed, setSpeed] = useState<number>(0.85)
  const [shadowChunk, setShadowChunk] = useState<number | null>(null)
  const [shadowPlaying, setShadowPlaying] = useState(false)
  const [chunkSize, setChunkSize] = useState<number>(4)
  const [showTip, setShowTip] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Gemini model được chọn để đánh giá thu âm
  const [evalModel, setEvalModel] = useState<TGeminiModel>(DEFAULT_SPEECH_EVAL_MODEL)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<IPronunciationEvaluationResult | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)

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

  const currentExample = examples[currentIndex]
  const plainOrigin = useMemo(() => stripHtml(currentExample?.origin), [currentExample])
  const plainTranslation = useMemo(() => stripHtml(currentExample?.translation), [currentExample])

  // Phân tích đồng thời cả 4 kỹ thuật
  const { tokens, pattern, chunks } = useMemo(
    () => buildUnifiedSentence(plainOrigin, chunkSize),
    [plainOrigin, chunkSize],
  )

  // Fetch dữ liệu câu ví dụ
  const fetchExamples = useCallback(async () => {
    setLoading(true)
    setCurrentIndex(0)
    setRevealed(false)
    setShadowChunk(null)
    setEvalResult(null)
    setEvalError(null)
    resetRecording()
    try {
      const { isSuccess, content } = await exampleApi.getRandomExamples(15)
      if (isSuccess && content) {
        const filtered = content.filter((ex) => {
          const text = stripHtml(ex.origin)
          return text.split(/\s+/).length >= 4
        })
        setExamples(filtered.length >= 3 ? filtered : content)
      }
    } catch (err) {
      console.error('PronunciationPractice fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [resetRecording])

  useEffect(() => {
    fetchExamples()
  }, [fetchExamples])

  // Phát âm toàn câu hoặc 1 đoạn với Gemini TTS
  const handleSpeak = useCallback(
    async (text?: string, rate?: number) => {
      const t = text || plainOrigin
      if (!t || speaking) return
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
    [plainOrigin, speaking, speed],
  )

  const handleStop = useCallback(() => {
    geminiTtsService.stop()
    setSpeaking(false)
    setShadowPlaying(false)
    setShadowChunk(null)
  }, [])

  // Chuyển câu trước / tiếp
  const handleNext = useCallback(() => {
    handleStop()
    setRevealed(false)
    setShadowChunk(null)
    setEvalResult(null)
    setEvalError(null)
    resetRecording()
    setCurrentIndex((prev) => (prev + 1) % Math.max(examples.length, 1))
  }, [examples.length, handleStop, resetRecording])

  const handlePrev = useCallback(() => {
    handleStop()
    setRevealed(false)
    setShadowChunk(null)
    setEvalResult(null)
    setEvalError(null)
    resetRecording()
    setCurrentIndex((prev) => (prev - 1 + examples.length) % examples.length)
  }, [examples.length, handleStop, resetRecording])

  // Phát từng chunk (Shadowing)
  const handlePlayChunk = useCallback(
    async (chunkText: string, chunkIdx: number) => {
      setShadowPlaying(true)
      setShadowChunk(chunkIdx)
      try {
        await geminiTtsService.playSpeech(chunkText, {
          voice: 'Aoede',
          playbackRate: speed,
          onEnd: () => {
            setShadowPlaying(false)
          },
          onError: () => {
            setShadowPlaying(false)
          },
        })
      } catch {
        setShadowPlaying(false)
      }
    },
    [speed],
  )

  // Bật/tắt tất cả kỹ thuật cùng lúc
  const isAllSelected = useMemo(
    () =>
      activeTechniques.linking &&
      activeTechniques.stress &&
      activeTechniques.intonation &&
      activeTechniques.shadow,
    [activeTechniques],
  )

  const handleToggleAll = useCallback(() => {
    if (isAllSelected) {
      setActiveTechniques({
        linking: false,
        stress: false,
        intonation: false,
        shadow: false,
      })
    } else {
      setActiveTechniques({
        linking: true,
        stress: true,
        intonation: true,
        shadow: true,
      })
    }
  }, [isAllSelected])

  // Gửi audio tới Gemini model để nhận xét và đánh giá
  const handleEvaluateAudio = useCallback(async () => {
    if (!audioBlob || isEvaluating) return
    setIsEvaluating(true)
    setEvalError(null)
    try {
      const response = await geminiPronunciationService.evaluateAudio({
        audioBlob,
        originalText: plainOrigin,
        translation: plainTranslation,
        preferredModel: evalModel,
      })

      if (response.isSuccess && response.content) {
        setEvalResult(response.content)
      } else {
        setEvalError(response.message || 'Không thể đánh giá âm thanh lúc này. Vui lòng thử lại.')
      }
    } catch (err: any) {
      console.error('Audio evaluation error:', err)
      setEvalError(err?.message || 'Có lỗi xảy ra khi gửi audio đến Gemini.')
    } finally {
      setIsEvaluating(false)
    }
  }, [audioBlob, isEvaluating, plainOrigin, plainTranslation, evalModel])

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
                  onChange={(e) =>
                    setActiveTechniques((prev) => ({
                      ...prev,
                      [cfg.key]: e.target.checked,
                    }))
                  }
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
            <Button icon={<SyncOutlined />} onClick={fetchExamples}>
              Tải lại
            </Button>
          </Flex>
        </Card>
      ) : (
        <Card
          className={styles.practiceCard}
          styles={{ body: { padding: token.size } }}
          style={{
            borderColor: token.colorPrimaryBorder,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.05)`,
          }}
        >
          {/* Header */}
          <Flex justify='space-between' align='center' style={{ marginBottom: token.size * 0.75 }}>
            <Flex align='center' gap={8}>
              <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                Luyện Nói & Ngữ Âm
              </Title>
            </Flex>
            <Flex gap={4} align='center'>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {currentIndex + 1} / {examples.length}
              </Text>
              <Tooltip title='Mẹo luyện phát âm'>
                <Button
                  type='text'
                  size='small'
                  icon={<BulbOutlined style={{ color: '#faad14' }} />}
                  onClick={() => setShowTip((p) => !p)}
                />
              </Tooltip>
              <Button
                size='small'
                icon={<SyncOutlined spin={loading} />}
                onClick={fetchExamples}
                type='text'
              />
            </Flex>
          </Flex>

          {/* Tip Panel */}
          {showTip && (
            <div className={styles.tipBox}>
              <BulbOutlined style={{ color: '#faad14', flexShrink: 0, marginTop: 2 }} />
              <Text style={{ fontSize: 13 }}>{randomTip}</Text>
            </div>
          )}

          {/* ── UNIFIED SENTENCE VISUALIZER ── */}
          <div className={styles.visualizerBox}>
            {/* Header thông tin ngữ điệu & chunk khi được kích hoạt */}
            <div className={styles.visualizerHeader}>
              {activeTechniques.intonation && (
                <Tag
                  color={
                    pattern === 'rising' ? 'green' : pattern === 'fall-rise' ? 'orange' : 'blue'
                  }
                  icon={<RiseOutlined />}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                >
                  {pattern === 'rising'
                    ? '↗ Lên giọng cuối câu (Yes/No Question)'
                    : pattern === 'fall-rise'
                      ? '↘↗ Lên - xuống giọng kết hợp'
                      : '↘ Xuống giọng cuối câu (Trần thuật / WH-question)'}
                </Tag>
              )}

              {activeTechniques.shadow && chunks.length > 0 && (
                <Tag color='purple' style={{ borderRadius: 6, fontSize: 11 }}>
                  {chunks.length} cụm nhịp điệu (Chunks)
                </Tag>
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
                        {/* Trọng âm: Chấm đỏ trên từ nhấn */}
                        {activeTechniques.stress && t.isStressed && (
                          <span className={styles.stressDot} />
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

            {/* Shadowing: Thanh lặp lại từng cụm khi kích hoạt Shadowing */}
            {activeTechniques.shadow && chunks.length > 0 && (
              <div className={styles.shadowChunksBar}>
                <Flex justify='space-between' align='center' wrap='wrap' gap={6}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#722ed1' }}>
                    Luyện nhại từng cụm (Shadowing):
                  </Text>
                  <Flex align='center' gap={6}>
                    <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>Độ dài:</Text>
                    <Select
                      size='small'
                      value={chunkSize}
                      onChange={(val) => setChunkSize(val)}
                      style={{ width: 80 }}
                      options={[
                        { label: '2 từ', value: 2 },
                        { label: '3 từ', value: 3 },
                        { label: '4 từ', value: 4 },
                      ]}
                    />
                  </Flex>
                </Flex>

                <div className={styles.shadowChunksList}>
                  {chunks.map((chunk, cIdx) => (
                    <button
                      key={cIdx}
                      type='button'
                      className={clsx(
                        styles.shadowChunkItem,
                        shadowChunk === cIdx && shadowPlaying && styles.shadowChunkActive,
                      )}
                      onClick={() => handlePlayChunk(chunk, cIdx)}
                    >
                      <SoundOutlined />
                      <span>{chunk}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          <Divider style={{ margin: `${token.size * 0.75}px 0` }} />

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
                onChange={(v) => setSpeed(v)}
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

          <Divider style={{ margin: `${token.size * 0.75}px 0` }} />

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

                {/* Dropdown chọn Gemini Model */}
                <Flex align='center' gap={6}>
                  <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>Mô hình AI:</Text>
                  <Select
                    size='small'
                    value={evalModel}
                    onChange={(val) => setEvalModel(val)}
                    style={{ minWidth: 190 }}
                    options={GEMINI_SPEECH_EVAL_MODELS.map((m) => ({
                      value: m.value,
                      label: (
                        <Tooltip title={m.desc} placement='left'>
                          <span>{m.label}</span>
                        </Tooltip>
                      ),
                    }))}
                  />
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
                    onClick={startRecording}
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

                  <Button
                    type='primary'
                    danger
                    icon={<StopOutlined />}
                    onClick={stopRecording}
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

                  <Flex gap={8} wrap='wrap' justify='center'>
                    <Button
                      icon={<RedoOutlined />}
                      onClick={resetRecording}
                      disabled={isEvaluating}
                      style={{ fontSize: 12 }}
                    >
                      Thu âm lại
                    </Button>

                    <Button
                      type='primary'
                      icon={isEvaluating ? <SyncOutlined spin /> : <RobotOutlined />}
                      onClick={handleEvaluateAudio}
                      loading={isEvaluating}
                      style={{
                        background: 'linear-gradient(90deg, #1677ff 0%, #722ed1 100%)',
                        borderColor: '#1677ff',
                        fontWeight: 600,
                      }}
                    >
                      {isEvaluating ? 'Gemini đang phân tích...' : 'AI Chấm điểm & Nhận xét'}
                    </Button>
                  </Flex>
                </Flex>
              )}
            </div>

            {/* Loading spinner */}
            {isEvaluating && (
              <Flex vertical align='center' justify='center' gap={12} style={{ padding: '24px 0' }}>
                <Spin size='large' />
                <Text style={{ fontSize: 13, color: token.colorPrimary }}>
                  Mô hình {evalModel} đang lắng nghe và đánh giá phát âm...
                </Text>
              </Flex>
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
                {evalResult.wordsReview && evalResult.wordsReview.length > 0 && (
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
                <Text style={{ fontSize: 12 }}>Ngắt cụm nhịp điệu (Chunk)</Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}
    </div>
  )
}
