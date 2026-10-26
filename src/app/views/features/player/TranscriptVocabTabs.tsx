import React, { useState, useEffect, useMemo } from 'react'
import {
  Tabs,
  Badge,
  Tag,
  Button,
  Space,
  Input,
  Popover,
  Spin,
  Empty,
  Tooltip,
  theme,
  Segmented,
} from 'antd'
import {
  RobotOutlined,
  SoundOutlined,
  PlusCircleOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  BookOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useLiveQuery } from 'dexie-react-hooks'
import { localDb } from '@/services/localDb'
import { itemApi } from '@/services/firebase/api/item.api'
import { IItem, ECategory, EType } from '@/models/item.model'
import { useDispatch } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { IMediaForm, ITracks } from '@/models/media.model'
import {
  IClassifiedVocabItem,
  ITranscriptClassificationData,
  TCEFRLevel,
  TVocabCategory,
  CEFR_LEVELS,
} from '@/models/vocabClassification.model'
import {
  geminiVocabClassifierService,
  getTranscriptHash,
} from '@/services/gemini/geminiVocabClassifier.service'
import { tracksApi } from '@/services/firebase/api/tracks.api'
import { usePrompt, useItemModal } from '@/helpers/hooks'
import { initItem } from '@/views/features/modals/itemModal/data'
import { parseTranscript } from './transcriptUtils'
import styles from './transcriptVocabTabs.module.scss'

export const CEFR_LEVEL_COLORS: Record<TCEFRLevel, string> = {
  A1: '#52c41a', // Green
  A2: '#13c2c2', // Cyan
  B1: '#1677ff', // Blue
  B2: '#2f54eb', // Geekblue
  C1: '#722ed1', // Purple
  C2: '#eb2f96', // Magenta
}

export const LEVEL_DESCRIPTIONS: Record<TCEFRLevel, string> = {
  A1: 'Beginner - Căn bản',
  A2: 'Elementary - Sơ cấp',
  B1: 'Intermediate - Trung cấp',
  B2: 'Upper-Intermediate - Trung cao cấp',
  C1: 'Advanced - Nâng cao',
  C2: 'Proficiency - Thành thạo',
}

export const CATEGORY_COLORS: Record<TVocabCategory, string> = {
  word: 'blue',
  phrase: 'cyan',
  collocation: 'purple',
  idiom: 'gold',
  phrasal_verb: 'volcano',
  slang: 'magenta',
  other: 'default',
}

export const CATEGORY_LABELS: Record<TVocabCategory, string> = {
  word: 'Word',
  phrase: 'Phrase',
  collocation: 'Collocation',
  idiom: 'Idiom',
  phrasal_verb: 'Phrasal Verb',
  slang: 'Slang',
  other: 'Other',
}

interface ITranscriptVocabTabsProps {
  track: IMediaForm | null
  transcript: string
}

export const TranscriptVocabTabs: React.FC<ITranscriptVocabTabsProps> = ({ track, transcript }) => {
  const { token } = theme.useToken()
  const { message } = usePrompt()
  const { openItemModal } = useItemModal()
  const dispatch = useDispatch()

  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const [classificationData, setClassificationData] =
    useState<ITranscriptClassificationData | null>(null)

  // Real-time query of user's vocabulary items from Dexie localDb
  const localItems = useLiveQuery(async () => {
    try {
      return await localDb.items.toArray()
    } catch (err) {
      console.warn('Error reading localDb.items in TranscriptVocabTabs:', err)
      return []
    }
  }, [])

  // Create a map of existing items by lowercased origin for fast O(1) lookups
  const existingItemsMap = useMemo(() => {
    const map = new Map<string, IItem>()
    if (localItems && localItems.length > 0) {
      for (const it of localItems) {
        if (it.origin) {
          map.set(it.origin.trim().toLowerCase(), it)
        }
      }
    }
    return map
  }, [localItems])

  // Parse transcript segments for timestamp seeking
  const segments = useMemo(() => parseTranscript(transcript || ''), [transcript])

  // Cache key based on trackId or transcript content hash
  const currentKey = useMemo(() => {
    if (track?.id) return String(track.id)
    if (transcript) return getTranscriptHash(transcript)
    return ''
  }, [track?.id, transcript])

  // Hydrate classification data on track change
  useEffect(() => {
    if (!transcript?.trim()) {
      setClassificationData(null)
      return
    }

    // 1. Check if track already has vocabClassification in memory/model (stored from Firestore)
    if (track?.vocabClassification && track.vocabClassification.length > 0) {
      setClassificationData({
        trackId: track.id,
        items: track.vocabClassification,
        summary: `Đã phân loại ${track.vocabClassification.length} từ vựng, cụm từ & collocation theo chuẩn CEFR.`,
        updatedAt: Date.now(),
      })
      return
    }

    // 2. Check localStorage cache
    if (currentKey) {
      const cached = geminiVocabClassifierService.getCached(currentKey)
      if (cached && cached.items?.length > 0) {
        setClassificationData(cached)
        return
      }
    }

    setClassificationData(null)
  }, [track?.id, track?.vocabClassification, transcript, currentKey])

  // Perform AI Classification
  const handleClassify = async () => {
    if (!transcript?.trim()) {
      message({
        type: 'warning',
        content: 'Track hiện tại chưa có nội dung transcript để phân loại.',
      })
      return
    }

    try {
      setLoading(true)
      const res = await geminiVocabClassifierService.classifyTranscript(transcript, track?.id)

      if (res.isSuccess && res.content) {
        setClassificationData(res.content)
        message({
          type: 'success',
          content: `Phân loại thành công ${res.content.items.length} từ vựng & cụm từ bằng Gemini!`,
        })

        // Persist to Redux and Firestore if track has an ID
        if (track?.id) {
          dispatch(
            listeningAction.updateTrack({
              ...track,
              vocabClassification: res.content.items,
            } as ITracks),
          )

          try {
            await tracksApi.updateTrack(String(track.id), {
              vocabClassification: res.content.items,
            } as any)
          } catch (updateErr) {
            console.warn('[TranscriptVocabTabs] Firestore updateTrack failed:', updateErr)
          }
        }
      } else {
        message({
          type: 'error',
          content: res.message || 'Không thể phân loại từ vựng bằng Gemini. Vui lòng thử lại.',
        })
      }
    } catch (err: any) {
      message({
        type: 'error',
        content: err?.message || 'Có lỗi xảy ra khi phân loại từ vựng.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Audio pronunciation via SpeechSynthesis
  const handleSpeak = (text: string, id: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.92

      setSpeakingId(id)
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)

      window.speechSynthesis.speak(utterance)
    }
  }

  // Copy word & meaning
  const handleCopy = (item: IClassifiedVocabItem) => {
    const textToCopy = `${item.text} (${item.level} - ${item.category}): ${item.vietnamese || item.meaning}`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(item.id)
      message({ type: 'success', content: `Đã sao chép "${item.text}" vào clipboard!` })
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Map category to ECategory enum
  const mapCategoryToECategory = (cat: TVocabCategory): ECategory => {
    switch (cat) {
      case 'collocation':
        return ECategory.COLLOCATION
      case 'phrase':
      case 'phrasal_verb':
        return ECategory.PHRASE
      case 'idiom':
        return ECategory.IDIOM
      case 'slang':
        return ECategory.SLANG
      case 'word':
      default:
        return ECategory.WORD
    }
  }

  // Map CEFR level to 1-5 rating
  const mapLevelToNumber = (level: TCEFRLevel): number => {
    switch (level) {
      case 'A1':
        return 1
      case 'A2':
        return 2
      case 'B1':
        return 3
      case 'B2':
        return 4
      case 'C1':
      case 'C2':
        return 5
      default:
        return 1
    }
  }

  // Add item to personal vocabulary
  const handleAddToVocabulary = (item: IClassifiedVocabItem) => {
    openItemModal('add', {
      ...initItem,
      origin: item.text.trim(),
      catId: mapCategoryToECategory(item.category),
      level: mapLevelToNumber(item.level),
      tags: [item.level.toLowerCase(), item.category],
      meanings: [
        {
          typeId: EType.NOUN,
          common: true,
          enable: true,
          pronunciation: {
            us: item.phonetic || '',
            uk: '',
            common: item.phonetic || '',
          },
          note: item.notes || '',
          definition: item.meaning || '',
          translation: item.vietnamese || '',
          grammar: '',
          collocations: item.category === 'collocation' ? item.text : '',
          synonyms: [],
          antonyms: [],
          examples: item.context
            ? [
                {
                  origin: item.context,
                  translation: '',
                },
              ]
            : [],
        },
      ],
    })
  }

  // View existing item in vocabulary modal
  const handleViewVocabulary = async (item: IClassifiedVocabItem) => {
    const cleanText = item.text.trim().toLowerCase()
    let target = existingItemsMap.get(cleanText)

    if (!target) {
      try {
        const res = await itemApi.getItems({
          keyword: item.text.trim(),
          page: 0,
          size: 1,
          exact: true,
        })
        if (res.isSuccess && res.content && res.content.length > 0) {
          target = res.content[0]
        }
      } catch (err) {
        console.warn('Error fetching item by origin:', err)
      }
    }

    if (target) {
      openItemModal('view', target)
    } else {
      message({
        type: 'warning',
        content: `Không tìm thấy thông tin từ vựng "${item.text}".`,
      })
    }
  }

  // Seek audio to where the phrase appears in the transcript
  const handleSeekToAudio = (item: IClassifiedVocabItem) => {
    if (!segments || segments.length === 0) return

    const cleanWord = item.text.toLowerCase().trim()
    const cleanContext = (item.context || '').toLowerCase()

    // Find matching segment
    let matchedSeg = segments.find(
      (s) =>
        s.text.toLowerCase().includes(cleanWord) ||
        (cleanContext && s.text.toLowerCase().includes(cleanContext.slice(0, 30))),
    )

    if (matchedSeg) {
      dispatch(
        listeningAction.updatePlayer({
          seekTo: matchedSeg.timeSeconds,
          playing: true,
        }),
      )
      message({
        type: 'info',
        content: `Đang phát đoạn audio chứa "${item.text}"`,
      })
    } else {
      // Fallback
      message({
        type: 'warning',
        content: `Không tìm thấy mốc thời gian chính xác cho "${item.text}"`,
      })
    }
  }

  // Group items by CEFR level
  const itemsByLevel = useMemo(() => {
    const map: Record<TCEFRLevel, IClassifiedVocabItem[]> = {
      A1: [],
      A2: [],
      B1: [],
      B2: [],
      C1: [],
      C2: [],
    }

    if (!classificationData?.items) return map

    classificationData.items.forEach((item) => {
      if (map[item.level]) {
        map[item.level].push(item)
      } else {
        map.B1.push(item)
      }
    })

    return map
  }, [classificationData?.items])

  // Total items count
  const allItems = classificationData?.items || []

  // Filtered items based on activeTab, category, and search query
  const filteredItems = useMemo(() => {
    let list = activeTab === 'all' ? allItems : itemsByLevel[activeTab as TCEFRLevel] || []

    if (selectedCategory !== 'all') {
      list = list.filter((it) => {
        if (selectedCategory === 'phrase') {
          return it.category === 'phrase' || it.category === 'phrasal_verb'
        }
        return it.category === selectedCategory
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (it) =>
          it.text.toLowerCase().includes(q) ||
          it.vietnamese.toLowerCase().includes(q) ||
          it.meaning.toLowerCase().includes(q) ||
          (it.context && it.context.toLowerCase().includes(q)),
      )
    }

    return list
  }, [allItems, itemsByLevel, activeTab, selectedCategory, searchQuery])

  // Count items by category for filter pills
  const categoryCounts = useMemo(() => {
    const pool = activeTab === 'all' ? allItems : itemsByLevel[activeTab as TCEFRLevel] || []

    return {
      all: pool.length,
      word: pool.filter((it) => it.category === 'word').length,
      phrase: pool.filter((it) => it.category === 'phrase' || it.category === 'phrasal_verb')
        .length,
      collocation: pool.filter((it) => it.category === 'collocation').length,
      idiom: pool.filter((it) => it.category === 'idiom').length,
    }
  }, [allItems, itemsByLevel, activeTab])

  // Render Popover content for hovering item
  const renderItemPopover = (item: IClassifiedVocabItem) => {
    const isSpeaking = speakingId === item.id
    const isCopied = copiedId === item.id
    const levelColor = CEFR_LEVEL_COLORS[item.level] || token.colorPrimary
    const catColor = CATEGORY_COLORS[item.category] || 'default'

    const cleanText = item.text.trim().toLowerCase()
    const existingItem = existingItemsMap.get(cleanText)
    const isSaved = !!existingItem

    return (
      <div className={styles.popoverContent}>
        {/* Header: Word title, Speaker, Level & Category badges */}
        <div className={styles.popoverHeader}>
          <div className={styles.wordTitle}>
            <span>{item.text}</span>
            <Tooltip title='Phát âm từ vựng'>
              <Button
                type='text'
                size='small'
                icon={
                  <SoundOutlined style={{ color: isSpeaking ? token.colorPrimary : undefined }} />
                }
                loading={isSpeaking}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeak(item.text, item.id)
                }}
              />
            </Tooltip>
          </div>

          <div className={styles.badges}>
            {isSaved && (
              <Tag color='success' icon={<CheckOutlined />}>
                Đã có
              </Tag>
            )}
            <Tag color={levelColor} className={styles.levelTag}>
              {item.level}
            </Tag>
            <Tag color={catColor}>{CATEGORY_LABELS[item.category] || item.category}</Tag>
          </div>
        </div>

        {/* Phonetic & Part of Speech */}
        {(item.phonetic || item.type) && (
          <div className={styles.phoneticRow}>
            {item.phonetic && <span className={styles.phonetic}>{item.phonetic}</span>}
            {item.type && <span className={styles.pos}>{item.type}</span>}
          </div>
        )}

        {/* Meaning Box */}
        <div className={styles.meaningBox}>
          {item.vietnamese && <div className={styles.vietnamese}>🇻🇳 {item.vietnamese}</div>}
          {item.meaning && <div className={styles.definition}>💡 {item.meaning}</div>}
        </div>

        {/* Context Sentence in Transcript */}
        {item.context && (
          <div className={styles.contextBox}>
            <div className={styles.contextLabel}>🎧 Ngữ cảnh trong bài nghe:</div>
            <div className={styles.contextText}>"{item.context}"</div>
          </div>
        )}

        {/* Notes / Tips */}
        {item.notes && (
          <div className={styles.notesBox}>
            📌 <strong>Ghi chú:</strong> {item.notes}
          </div>
        )}

        {/* Actions Footer */}
        <div className={styles.popoverFooter}>
          <Space size='small'>
            <Tooltip title='Nghe đoạn audio chứa từ này'>
              <Button
                size='small'
                icon={<PlayCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSeekToAudio(item)
                }}
              >
                Nghe trong bài
              </Button>
            </Tooltip>

            <Tooltip title='Sao chép'>
              <Button
                size='small'
                icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(item)
                }}
              />
            </Tooltip>
          </Space>

          {isSaved ? (
            <Button
              type='primary'
              size='small'
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleViewVocabulary(item)
              }}
            >
              Xem từ vựng
            </Button>
          ) : (
            <Button
              type='primary'
              size='small'
              icon={<PlusCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleAddToVocabulary(item)
              }}
            >
              Lưu lại từ vựng
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render individual vocabulary chip with Popover
  const renderVocabChip = (item: IClassifiedVocabItem) => {
    const levelColor = CEFR_LEVEL_COLORS[item.level] || token.colorPrimary
    const catColor = CATEGORY_COLORS[item.category] || 'default'
    const isSaved = existingItemsMap.has(item.text.trim().toLowerCase())

    return (
      <Popover
        key={item.id}
        content={renderItemPopover(item)}
        trigger={['hover', 'click']}
        placement='top'
        mouseEnterDelay={0.15}
        mouseLeaveDelay={0.15}
        overlayStyle={{ maxWidth: '92vw' }}
      >
        <div
          className={styles.vocabChip}
          style={isSaved ? { borderColor: token.colorSuccess } : undefined}
        >
          {isSaved && (
            <Tooltip title='Đã lưu trong bộ từ vựng'>
              <CheckOutlined style={{ color: token.colorSuccess, fontSize: 11 }} />
            </Tooltip>
          )}
          <span className={styles.chipText}>{item.text}</span>
          {item.type && <span className={styles.chipType}>({item.type})</span>}
          <Tag
            color={levelColor}
            style={{
              margin: 0,
              fontSize: '10.5px',
              lineHeight: '16px',
              padding: '0 4px',
              fontWeight: 600,
            }}
          >
            {item.level}
          </Tag>
          <Tag
            color={catColor}
            style={{
              margin: 0,
              fontSize: '10.5px',
              lineHeight: '16px',
              padding: '0 4px',
            }}
          >
            {CATEGORY_LABELS[item.category] || item.category}
          </Tag>
        </div>
      </Popover>
    )
  }

  // Build Tab Items for A1 -> C2 difficulty levels
  const tabItems = useMemo(() => {
    const tabs = [
      {
        key: 'all',
        label: (
          <span>
            Tất cả{' '}
            <Badge
              count={allItems.length}
              overflowCount={999}
              style={{ backgroundColor: token.colorPrimary }}
            />
          </span>
        ),
      },
      ...CEFR_LEVELS.map((lvl) => {
        const count = itemsByLevel[lvl]?.length || 0
        const color = CEFR_LEVEL_COLORS[lvl]
        return {
          key: lvl,
          label: (
            <Tooltip title={LEVEL_DESCRIPTIONS[lvl]}>
              <span>
                <Tag
                  color={color}
                  style={{
                    marginRight: 4,
                    fontWeight: 700,
                    padding: '0 5px',
                    borderRadius: 4,
                  }}
                >
                  {lvl}
                </Tag>
                <Badge
                  count={count}
                  overflowCount={999}
                  style={{
                    backgroundColor: count > 0 ? color : token.colorTextQuaternary,
                  }}
                />
              </span>
            </Tooltip>
          ),
        }
      }),
    ]

    return tabs
  }, [allItems.length, itemsByLevel, token.colorPrimary, token.colorTextQuaternary])

  // Don't display anything if no track is selected
  if (!track) {
    return null
  }

  return (
    <div className={styles.vocabContainer}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h4>
            <BookOutlined style={{ color: token.colorPrimary }} />
            Từ vựng (A1 → C2)
          </h4>
          {classificationData && (
            <Tag
              color={track?.vocabClassification?.length ? 'success' : 'processing'}
              icon={<RobotOutlined />}
            >
              {track?.vocabClassification?.length ? 'Đã lưu' : 'Đã phân loại'}: {allItems.length}{' '}
              mục
            </Tag>
          )}
        </div>

        <div className={styles.headerActions}>
          <Button
            size='small'
            type={classificationData ? 'default' : 'primary'}
            icon={classificationData ? <ReloadOutlined /> : <ThunderboltOutlined />}
            loading={loading}
            onClick={handleClassify}
          >
            {classificationData ? 'Phân loại' : 'Phân loại'}
          </Button>
        </div>
      </div>

      {/* Loading Spin */}
      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin
            tip='Gemini đang phân tích transcript và phân loại từ vựng, cụm từ, collocation theo cấp độ A1 → C2...'
            size='large'
          />
        </div>
      )}

      {/* Unclassified Empty State */}
      {!loading && !classificationData && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <RobotOutlined />
          </div>
          <h5>Chưa phân loại từ vựng cho bài nghe này</h5>
          <Button
            type='primary'
            size='middle'
            icon={<ThunderboltOutlined />}
            onClick={handleClassify}
            disabled={!transcript?.trim()}
          >
            Phân loại từ vựng
          </Button>
        </div>
      )}

      {/* Classified Content: Tabs & Items */}
      {!loading && classificationData && (
        <>
          {/* Level Tabs Component: A1 -> C2 */}
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)} items={tabItems} />

          {/* Filter Bar: Category & Search */}
          <div className={styles.filterBar}>
            <div className={styles.categoryGroup}>
              <Segmented
                size='small'
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val as string)}
                options={[
                  { label: `Tất cả (${categoryCounts.all})`, value: 'all' },
                  { label: `Từ đơn (${categoryCounts.word})`, value: 'word' },
                  { label: `Cụm từ (${categoryCounts.phrase})`, value: 'phrase' },
                  { label: `Collocation (${categoryCounts.collocation})`, value: 'collocation' },
                  { label: `Thành ngữ (${categoryCounts.idiom})`, value: 'idiom' },
                ]}
              />
            </div>

            <Input
              size='small'
              placeholder='Tìm từ vựng, nghĩa tiếng Việt...'
              prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 220 }}
            />
          </div>

          {/* Items Grid with Popover on Hover */}
          {filteredItems.length > 0 ? (
            <div className={styles.itemsGrid}>
              {filteredItems.map((item) => renderVocabChip(item))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchQuery
                  ? `Không tìm thấy từ vựng nào khớp với "${searchQuery}"`
                  : `Chưa có từ vựng hoặc cụm từ nào ở cấp độ ${activeTab.toUpperCase()}`
              }
              style={{ margin: '20px 0' }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default TranscriptVocabTabs
