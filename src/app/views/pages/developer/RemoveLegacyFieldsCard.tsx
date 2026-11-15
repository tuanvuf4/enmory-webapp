import React, { useState, useMemo } from 'react'
import {
  Card,
  Input,
  Button,
  Radio,
  Space,
  Tag,
  Typography,
  Alert,
  Checkbox,
  Modal,
  message,
  Table,
  theme,
  Spin,
  Tooltip,
  AutoComplete,
  Segmented,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  DeleteOutlined,
  SearchOutlined,
  BookOutlined,
  ReadOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  CheckOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { useSelector, itemKeys, checklistKeys } from '@/core/hooks'
import { blogKeys } from '@/core/hooks/useBlogs'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateSearchIndex } from '@/services/localDb'
import {
  TLegacyFieldTarget,
  IPreviewFieldResult,
  previewFieldByPathInFirebaseDb,
  removeFieldByPathFromFirebaseDb,
  normalizeFieldPath,
} from '@/services/firebase/dbIntegration'

const { Text, Paragraph } = Typography

export interface IInterfaceField {
  path: string
  name: string
  interfaceName: string
  type: string
  isLegacy?: boolean
  description: string
}

export interface IInterfaceGroup {
  id: string
  groupTitle: string
  interfaceName: string
  badgeColor: string
  fields: IInterfaceField[]
}

// =========================================================================
// Interface definitions for IItem (including IMeaning and IExample)
// =========================================================================
const itemInterfaceGroups: IInterfaceGroup[] = [
  {
    id: 'item-root',
    groupTitle: 'Cấp 1: IItem (Root Level)',
    interfaceName: 'IItem',
    badgeColor: 'blue',
    fields: [
      // Legacy fields
      {
        path: 'origin_lowercase',
        name: 'origin_lowercase',
        interfaceName: 'IItem',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: từ gốc chữ thường (đã bỏ)',
      },
      {
        path: 'keywords',
        name: 'keywords',
        interfaceName: 'IItem',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: từ khóa tìm kiếm (đã bỏ)',
      },
      {
        path: 'tags_lowercase',
        name: 'tags_lowercase',
        interfaceName: 'IItem',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: tags chữ thường (đã bỏ)',
      },
      {
        path: 'deleted_date',
        name: 'deleted_date',
        interfaceName: 'IItem',
        type: 'number',
        isLegacy: true,
        description: 'Trường legacy: soft-delete timestamp (đã bỏ)',
      },
      // Standard IItem schema fields
      {
        path: 'origin',
        name: 'origin',
        interfaceName: 'IItem',
        type: 'string',
        description: 'Từ / cụm từ gốc',
      },
      {
        path: 'catId',
        name: 'catId',
        interfaceName: 'IItem',
        type: 'ECategory',
        description: 'Danh mục từ (WORD, PHRASE, IDIOM...)',
      },
      {
        path: 'level',
        name: 'level',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Cấp độ học (1-5)',
      },
      {
        path: 'tags',
        name: 'tags',
        interfaceName: 'IItem',
        type: 'string[]',
        description: 'Danh sách nhãn / tags',
      },
      {
        path: 'favorite',
        name: 'favorite',
        interfaceName: 'IItem',
        type: 'boolean',
        description: 'Đánh dấu yêu thích',
      },
      {
        path: 'archive',
        name: 'archive',
        interfaceName: 'IItem',
        type: 'boolean',
        description: 'Trạng thái lưu trữ',
      },
      {
        path: 'count',
        name: 'count',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Số lần ôn tập',
      },
      {
        path: 'forms',
        name: 'forms',
        interfaceName: 'IItem',
        type: 'string[]',
        description: 'Các dạng của từ',
      },
      {
        path: 'collocations',
        name: 'collocations',
        interfaceName: 'IItem',
        type: 'string[]',
        description: 'Cụm từ đi kèm',
      },
      {
        path: 'word_family',
        name: 'word_family',
        interfaceName: 'IItem',
        type: 'string[]',
        description: 'Gia đình từ vựng',
      },
      {
        path: 'relation',
        name: 'relation',
        interfaceName: 'IItem',
        type: 'string[]',
        description: 'Từ liên quan',
      },
      {
        path: 'created_date',
        name: 'created_date',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Thời gian tạo (timestamp)',
      },
      {
        path: 'last_update',
        name: 'last_update',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Thời gian cập nhật (timestamp)',
      },
      {
        path: 'next_review_date',
        name: 'next_review_date',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Thời gian ôn tập tiếp theo',
      },
      {
        path: 'last_reviewed',
        name: 'last_reviewed',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Lần ôn tập gần nhất',
      },
      {
        path: 'interval_days',
        name: 'interval_days',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Khoảng cách ngày ôn tập (Spaced Repetition)',
      },
      {
        path: 'ease_factor',
        name: 'ease_factor',
        interfaceName: 'IItem',
        type: 'number',
        description: 'Hệ số ghi nhớ ease factor',
      },
      {
        path: 'user.email',
        name: 'user.email',
        interfaceName: 'IItem.user',
        type: 'string',
        description: 'Email tác giả',
      },
      {
        path: 'user.firstName',
        name: 'user.firstName',
        interfaceName: 'IItem.user',
        type: 'string',
        description: 'Tên tác giả',
      },
      {
        path: 'user.lastName',
        name: 'user.lastName',
        interfaceName: 'IItem.user',
        type: 'string',
        description: 'Họ tác giả',
      },
    ],
  },
  {
    id: 'item-meaning',
    groupTitle: 'Cấp 2: IMeaning (Mảng meanings[])',
    interfaceName: 'IMeaning',
    badgeColor: 'green',
    fields: [
      // Legacy fields in meaning
      {
        path: 'item.meaning.definition_lowercase',
        name: 'definition_lowercase',
        interfaceName: 'IMeaning',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: định nghĩa viết thường (đã bỏ)',
      },
      {
        path: 'item.meaning.translation_lowercase',
        name: 'translation_lowercase',
        interfaceName: 'IMeaning',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: bản dịch viết thường (đã bỏ)',
      },
      {
        path: 'item.meaning.keywords',
        name: 'keywords',
        interfaceName: 'IMeaning',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: từ khóa trong meaning (đã bỏ)',
      },
      // Standard IMeaning fields
      {
        path: 'item.meaning.definition',
        name: 'definition',
        interfaceName: 'IMeaning',
        type: 'string',
        description: 'Định nghĩa nghĩa từ',
      },
      {
        path: 'item.meaning.translation',
        name: 'translation',
        interfaceName: 'IMeaning',
        type: 'string',
        description: 'Bản dịch nghĩa',
      },
      {
        path: 'item.meaning.typeId',
        name: 'typeId',
        interfaceName: 'IMeaning',
        type: 'EType',
        description: 'Từ loại (Danh từ, Động từ, Tính từ...)',
      },
      {
        path: 'item.meaning.note',
        name: 'note',
        interfaceName: 'IMeaning',
        type: 'string',
        description: 'Ghi chú cho nghĩa',
      },
      {
        path: 'item.meaning.grammar',
        name: 'grammar',
        interfaceName: 'IMeaning',
        type: 'string',
        description: 'Cấu trúc ngữ pháp',
      },
      {
        path: 'item.meaning.collocations',
        name: 'collocations',
        interfaceName: 'IMeaning',
        type: 'string',
        description: 'Collocations theo nghĩa',
      },
      {
        path: 'item.meaning.common',
        name: 'common',
        interfaceName: 'IMeaning',
        type: 'boolean',
        description: 'Đánh dấu nghĩa phổ biến',
      },
      {
        path: 'item.meaning.enable',
        name: 'enable',
        interfaceName: 'IMeaning',
        type: 'boolean',
        description: 'Bật / tắt nghĩa này',
      },
      {
        path: 'item.meaning.synonyms',
        name: 'synonyms',
        interfaceName: 'IMeaning',
        type: 'string[]',
        description: 'Từ đồng nghĩa',
      },
      {
        path: 'item.meaning.antonyms',
        name: 'antonyms',
        interfaceName: 'IMeaning',
        type: 'string[]',
        description: 'Từ trái nghĩa',
      },
      {
        path: 'item.meaning.pronunciation.us',
        name: 'pronunciation.us',
        interfaceName: 'IPronouns',
        type: 'string',
        description: 'Phiên âm giọng Mỹ (US)',
      },
      {
        path: 'item.meaning.pronunciation.uk',
        name: 'pronunciation.uk',
        interfaceName: 'IPronouns',
        type: 'string',
        description: 'Phiên âm giọng Anh (UK)',
      },
      {
        path: 'item.meaning.created_date',
        name: 'created_date',
        interfaceName: 'IMeaning',
        type: 'number',
        description: 'Ngày tạo nghĩa',
      },
      {
        path: 'item.meaning.last_update',
        name: 'last_update',
        interfaceName: 'IMeaning',
        type: 'number',
        description: 'Ngày cập nhật nghĩa',
      },
    ],
  },
  {
    id: 'item-example',
    groupTitle: 'Cấp 3: IExample (Mảng examples[])',
    interfaceName: 'IExample',
    badgeColor: 'purple',
    fields: [
      // Legacy fields in example
      {
        path: 'item.meaning.example.translation_lowercase',
        name: 'translation_lowercase',
        interfaceName: 'IExample',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: dịch ví dụ viết thường (đã bỏ)',
      },
      {
        path: 'item.meaning.example.origin_lowercase',
        name: 'origin_lowercase',
        interfaceName: 'IExample',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: câu ví dụ gốc viết thường (đã bỏ)',
      },
      {
        path: 'item.meaning.example.keywords',
        name: 'keywords',
        interfaceName: 'IExample',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: từ khóa trong ví dụ (đã bỏ)',
      },
      // Standard IExample fields
      {
        path: 'item.meaning.example.origin',
        name: 'origin',
        interfaceName: 'IExample',
        type: 'string',
        description: 'Câu ví dụ tiếng Anh gốc',
      },
      {
        path: 'item.meaning.example.translation',
        name: 'translation',
        interfaceName: 'IExample',
        type: 'string',
        description: 'Bản dịch tiếng Việt của câu ví dụ',
      },
      {
        path: 'item.meaning.example.note',
        name: 'note',
        interfaceName: 'IExample',
        type: 'string',
        description: 'Ghi chú cho câu ví dụ',
      },
      {
        path: 'item.meaning.example.catId',
        name: 'catId',
        interfaceName: 'IExample',
        type: 'number',
        description: 'Phân loại của ví dụ',
      },
      {
        path: 'item.meaning.example.created_date',
        name: 'created_date',
        interfaceName: 'IExample',
        type: 'number',
        description: 'Ngày tạo ví dụ',
      },
      {
        path: 'item.meaning.example.last_update',
        name: 'last_update',
        interfaceName: 'IExample',
        type: 'number',
        description: 'Ngày cập nhật ví dụ',
      },
    ],
  },
]

// =========================================================================
// Interface definitions for IBlogItem (including IClassifiedVocabItem)
// =========================================================================
const articleInterfaceGroups: IInterfaceGroup[] = [
  {
    id: 'article-root',
    groupTitle: 'Cấp 1: IBlogItem (Root Level)',
    interfaceName: 'IBlogItem',
    badgeColor: 'blue',
    fields: [
      // Legacy fields in article
      {
        path: 'keywords',
        name: 'keywords',
        interfaceName: 'IBlogItem',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: từ khóa tìm kiếm bài viết (đã bỏ)',
      },
      {
        path: 'tags_lowercase',
        name: 'tags_lowercase',
        interfaceName: 'IBlogItem',
        type: 'string[]',
        isLegacy: true,
        description: 'Trường legacy: tags viết thường (đã bỏ)',
      },
      {
        path: 'title_lowercase',
        name: 'title_lowercase',
        interfaceName: 'IBlogItem',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: tiêu đề viết thường (đã bỏ)',
      },
      // Standard IBlogItem fields
      {
        path: 'title',
        name: 'title',
        interfaceName: 'IBlogItem',
        type: 'string',
        description: 'Tiêu đề bài viết',
      },
      {
        path: 'description',
        name: 'description',
        interfaceName: 'IBlogItem',
        type: 'string',
        description: 'Nội dung bài viết',
      },
      {
        path: 'translation',
        name: 'translation',
        interfaceName: 'IBlogItem',
        type: 'string',
        description: 'Bản dịch tiếng Việt của bài viết',
      },
      {
        path: 'tags',
        name: 'tags',
        interfaceName: 'IBlogItem',
        type: 'string[]',
        description: 'Danh sách tags của bài viết',
      },
      {
        path: 'relation',
        name: 'relation',
        interfaceName: 'IBlogItem',
        type: 'string[]',
        description: 'Danh sách ID bài viết liên quan',
      },
      {
        path: 'created_date',
        name: 'created_date',
        interfaceName: 'IBlogItem',
        type: 'number',
        description: 'Ngày tạo bài viết (timestamp)',
      },
      {
        path: 'last_update',
        name: 'last_update',
        interfaceName: 'IBlogItem',
        type: 'number',
        description: 'Ngày cập nhật bài viết (timestamp)',
      },
      {
        path: 'uid',
        name: 'uid',
        interfaceName: 'IBlogItem',
        type: 'string',
        description: 'UID tác giả bài viết',
      },
    ],
  },
  {
    id: 'article-vocab',
    groupTitle: 'Cấp 2: IClassifiedVocabItem (Mảng vocabClassification[])',
    interfaceName: 'IClassifiedVocabItem',
    badgeColor: 'geekblue',
    fields: [
      // Legacy fields in vocabClassification
      {
        path: 'article.vocabClassification.notes_lowercase',
        name: 'notes_lowercase',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        isLegacy: true,
        description: 'Trường legacy: ghi chú từ vựng viết thường (đã bỏ)',
      },
      // Standard IClassifiedVocabItem fields
      {
        path: 'article.vocabClassification.text',
        name: 'text',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Từ vựng được trích xuất',
      },
      {
        path: 'article.vocabClassification.meaning',
        name: 'meaning',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Nghĩa tiếng Anh',
      },
      {
        path: 'article.vocabClassification.vietnamese',
        name: 'vietnamese',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Nghĩa tiếng Việt',
      },
      {
        path: 'article.vocabClassification.category',
        name: 'category',
        interfaceName: 'IClassifiedVocabItem',
        type: 'TVocabCategory',
        description: 'Phân loại từ vựng (word, phrase, collocation...)',
      },
      {
        path: 'article.vocabClassification.level',
        name: 'level',
        interfaceName: 'IClassifiedVocabItem',
        type: 'TCEFRLevel',
        description: 'Trình độ CEFR (A1, A2, B1, B2, C1, C2)',
      },
      {
        path: 'article.vocabClassification.type',
        name: 'type',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Từ loại',
      },
      {
        path: 'article.vocabClassification.phonetic',
        name: 'phonetic',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Phiên âm',
      },
      {
        path: 'article.vocabClassification.context',
        name: 'context',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Câu ngữ cảnh trong bài',
      },
      {
        path: 'article.vocabClassification.contextTranslation',
        name: 'contextTranslation',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Dịch câu ngữ cảnh',
      },
      {
        path: 'article.vocabClassification.notes',
        name: 'notes',
        interfaceName: 'IClassifiedVocabItem',
        type: 'string',
        description: 'Ghi chú thêm',
      },
    ],
  },
]

export const RemoveLegacyFieldsCard: React.FC = () => {
  const { token } = theme.useToken()
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  // State
  const [targetType, setTargetType] = useState<TLegacyFieldTarget>('item')
  const [fieldPath, setFieldPath] = useState<string>('origin_lowercase')
  const [onlyCurrentUser, setOnlyCurrentUser] = useState<boolean>(true)
  const [updateLocalDb, setUpdateLocalDb] = useState<boolean>(true)

  const [filterGroup, setFilterGroup] = useState<string>('all')

  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [loadingRemove, setLoadingRemove] = useState<boolean>(false)
  const [progressStatus, setProgressStatus] = useState<string>('')
  const [previewResult, setPreviewResult] = useState<IPreviewFieldResult | null>(null)
  const [removeStatus, setRemoveStatus] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Current interface groups
  const currentGroups = useMemo(() => {
    return targetType === 'item' ? itemInterfaceGroups : articleInterfaceGroups
  }, [targetType])

  // Flattened fields for search / autocomplete
  const allCurrentFields = useMemo(() => {
    return currentGroups.flatMap((g) => g.fields)
  }, [currentGroups])

  // Filtered groups according to filterGroup selector
  const displayedGroups = useMemo(() => {
    if (filterGroup === 'all') {
      return currentGroups
    }
    if (filterGroup === 'legacy-only') {
      return currentGroups
        .map((g) => ({
          ...g,
          fields: g.fields.filter((f) => f.isLegacy),
        }))
        .filter((g) => g.fields.length > 0)
    }
    return currentGroups.filter((g) => g.id === filterGroup)
  }, [currentGroups, filterGroup])

  // AutoComplete options
  const autoCompleteOptions = useMemo(() => {
    const kw = fieldPath.trim().toLowerCase()
    return currentGroups
      .map((group) => {
        const matchingFields = group.fields.filter((f) => {
          if (!kw) return true
          return (
            f.path.toLowerCase().includes(kw) ||
            f.name.toLowerCase().includes(kw) ||
            f.description.toLowerCase().includes(kw)
          )
        })

        if (matchingFields.length === 0) return null

        return {
          label: (
            <div style={{ fontWeight: 'bold', color: token.colorPrimary, fontSize: 12 }}>
              {group.groupTitle}
            </div>
          ),
          options: matchingFields.map((f) => ({
            value: f.path,
            label: (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Space size={6}>
                  <Text code style={{ fontSize: 12 }}>
                    {f.path}
                  </Text>
                  {f.isLegacy && (
                    <Tag color='volcano' style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                      Legacy
                    </Tag>
                  )}
                </Space>
                <Text type='secondary' style={{ fontSize: 11, marginLeft: 8 }}>
                  {f.type} · {f.description}
                </Text>
              </div>
            ),
          })),
        }
      })
      .filter(Boolean) as Array<{
      label: React.ReactNode
      options: Array<{ value: string; label: React.ReactNode }>
    }>
  }, [currentGroups, fieldPath, token.colorPrimary])

  // Filter options for Segmented bar
  const segmentedOptions = useMemo(() => {
    const totalLegacy = allCurrentFields.filter((f) => f.isLegacy).length
    const base = [
      { label: `Tất cả (${allCurrentFields.length})`, value: 'all' },
      {
        label: (
          <Space size={4}>
            <FireOutlined style={{ color: token.colorError }} />
            <span>Chỉ trường Legacy ({totalLegacy})</span>
          </Space>
        ),
        value: 'legacy-only',
      },
    ]

    const groupOptions = currentGroups.map((g) => ({
      label: `${g.interfaceName} (${g.fields.length})`,
      value: g.id,
    }))

    return [...base, ...groupOptions]
  }, [allCurrentFields, currentGroups, token.colorError])

  // Handle Preview
  const handlePreview = async () => {
    if (!user) {
      message.error('Vui lòng đăng nhập Firebase để thực hiện thao tác.')
      return
    }

    const segments = normalizeFieldPath(fieldPath, targetType)
    if (segments.length === 0) {
      message.warning('Vui lòng nhập tên trường cần kiểm tra.')
      return
    }

    setLoadingPreview(true)
    setProgressStatus('Đang quét Firestore...')
    setRemoveStatus(null)

    try {
      const res = await previewFieldByPathInFirebaseDb({
        targetType,
        fieldPath,
        uid: user.uid,
        onlyCurrentUser,
        onProgress: (msg) => setProgressStatus(msg),
      })

      setPreviewResult(res)
      if (res.isSuccess) {
        if (res.affectedCount > 0) {
          message.info(
            `Tìm thấy ${res.affectedCount} tài liệu có chứa trường "${fieldPath}" (${res.totalOccurrences} vị trí).`,
          )
        } else {
          message.success(`Không tìm thấy trường "${fieldPath}". Dữ liệu đã sạch!`)
        }
      } else {
        message.error(res.message)
      }
    } catch (err: any) {
      console.error('Preview error:', err)
      message.error(`Lỗi khi quét: ${err?.message || err}`)
    } finally {
      setLoadingPreview(false)
      setProgressStatus('')
    }
  }

  // Handle Execute Remove
  const handleExecuteRemove = () => {
    if (!user) {
      message.error('Vui lòng đăng nhập Firebase để thực hiện thao tác.')
      return
    }

    const segments = normalizeFieldPath(fieldPath, targetType)
    if (segments.length === 0) {
      message.warning('Vui lòng nhập tên trường cần xóa.')
      return
    }

    const targetLabel = targetType === 'item' ? 'Item (IItem)' : 'Article (IBlogItem)'

    Modal.confirm({
      title: `Xác nhận xóa vĩnh viễn trường "${fieldPath}"?`,
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: (
        <div>
          <Paragraph>
            Hệ thống sẽ thực hiện <b>tìm kiếm sâu (Deep Search)</b> và xóa trường{' '}
            <Text code>{fieldPath}</Text> khỏi toàn bộ <b>{targetLabel}</b> trên{' '}
            <b>Firebase Firestore</b>
            {updateLocalDb ? ' và đồng bộ vào Local Database' : ''}.
          </Paragraph>
          <Paragraph type='danger'>
            Thao tác này là vĩnh viễn và không thể hoàn tác sau khi đã thực hiện!
          </Paragraph>
        </div>
      ),
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingRemove(true)
        setProgressStatus('Đang chuẩn bị xóa trường...')
        setRemoveStatus(null)

        try {
          const res = await removeFieldByPathFromFirebaseDb({
            targetType,
            fieldPath,
            uid: user.uid,
            onlyCurrentUser,
            updateLocalDb,
            onProgress: (msg) => setProgressStatus(msg),
          })

          if (res.isSuccess) {
            setRemoveStatus({
              type: 'success',
              message: res.message,
            })
            message.success(res.message)
            setPreviewResult(null)

            // Invalidate React Query caches
            if (targetType === 'item') {
              invalidateSearchIndex()
              await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
              await queryClient.invalidateQueries({ queryKey: checklistKeys.all })
            } else {
              await queryClient.invalidateQueries({ queryKey: blogKeys.all })
            }
          } else {
            setRemoveStatus({
              type: 'error',
              message: res.message || 'Lỗi khi xóa trường legacy.',
            })
            message.error(res.message)
          }
        } catch (err: any) {
          console.error('Execute remove error:', err)
          setRemoveStatus({
            type: 'error',
            message: `Lỗi: ${err?.message || err}`,
          })
          message.error(`Lỗi khi xóa: ${err?.message || err}`)
        } finally {
          setLoadingRemove(false)
          setProgressStatus('')
        }
      },
    })
  }

  // Preview table columns
  const previewColumns: TableColumnsType<any> = [
    {
      title: 'Document ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string) => (
        <Text copyable={{ text: id }} code style={{ fontSize: 12 }}>
          {id}
        </Text>
      ),
    },
    {
      title: targetType === 'item' ? 'Origin' : 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <b>{title}</b>,
    },
    {
      title: 'Số vị trí',
      dataIndex: 'occurrences',
      key: 'occurrences',
      width: 100,
      align: 'center',
      render: (count: number) => <Tag color='orange'>{count}</Tag>,
    },
    {
      title: 'Đường dẫn phát hiện',
      dataIndex: 'samplePaths',
      key: 'samplePaths',
      render: (paths: string[]) => (
        <Space direction='vertical' size={2} style={{ maxWidth: '100%' }}>
          {paths.slice(0, 5).map((p, idx) => (
            <Tag key={idx} color='blue' style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {p}
            </Tag>
          ))}
          {paths.length > 5 && (
            <Text type='secondary' style={{ fontSize: 11 }}>
              và {paths.length - 5} vị trí khác...
            </Text>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={
        <Space>
          <DeleteOutlined style={{ color: token.colorError }} />
          <span>Xóa Legacy Fields (Deep Field Cleanup)</span>
        </Space>
      }
      size='small'
    >
      <Paragraph type='secondary' style={{ marginBottom: 16 }}>
        Hỗ trợ tìm kiếm sâu và xóa các trường dữ liệu cũ (legacy fields) trong Firestore và Local DB
        cho cả <b>Item (IItem)</b> và <b>Article (IBlogItem)</b>. Tự động hỗ trợ mảng lồng nhau
        nhiều cấp (ví dụ: mảng <code>meanings</code>, mảng <code>examples</code>). Danh sách trường
        gợi ý được phân nhóm chi tiết dựa trên interface TypeScript chuẩn của từng loại đối tượng.
      </Paragraph>

      <Space direction='vertical' size={14} style={{ width: '100%' }}>
        {/* Target Selector */}
        <div>
          <Text strong style={{ marginRight: 12 }}>
            Đối tượng tác động:
          </Text>
          <Radio.Group
            value={targetType}
            onChange={(e) => {
              const newTarget = e.target.value
              setTargetType(newTarget)
              setPreviewResult(null)
              setRemoveStatus(null)
              setFilterGroup('all')
              if (newTarget === 'item') {
                setFieldPath('origin_lowercase')
              } else {
                setFieldPath('keywords')
              }
            }}
            buttonStyle='solid'
          >
            <Radio.Button value='item'>
              <BookOutlined style={{ marginRight: 6 }} />
              Item (IItem - Từ vựng)
            </Radio.Button>
            <Radio.Button value='article'>
              <ReadOutlined style={{ marginRight: 6 }} />
              Article (IBlogItem - Bài viết)
            </Radio.Button>
          </Radio.Group>
        </div>

        {/* Field Path Input with AutoComplete */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <Text strong>Trường cần xóa (gõ tên trường hoặc dùng dấu chấm . để tìm kiếm sâu):</Text>
          </div>
          <AutoComplete
            value={fieldPath}
            onChange={(val) => setFieldPath(val)}
            options={autoCompleteOptions}
            popupMatchSelectWidth={false}
            style={{ width: '100%', maxWidth: 640 }}
          >
            <Input
              placeholder={
                targetType === 'item'
                  ? 'Ví dụ: origin_lowercase, item.meaning.definition_lowercase, item.meaning.example.translation_lowercase'
                  : 'Ví dụ: keywords, tags_lowercase, article.vocabClassification.notes'
              }
              allowClear
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
            />
          </AutoComplete>
        </div>

        {/* Interface-based suggestions browser */}
        <Card
          size='small'
          style={{
            background: token.colorFillAlter,
            borderColor: token.colorBorderSecondary,
            marginTop: 4,
          }}
          bodyStyle={{ padding: '12px 14px' }}
        >
          <div style={{ marginBottom: 10 }}>
            <Space wrap align='center' style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size={6}>
                <CodeOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 13 }}>
                  Gợi ý trường theo Interface {targetType === 'item' ? 'IItem' : 'IBlogItem'}:
                </Text>
              </Space>
              <Segmented
                size='small'
                value={filterGroup}
                onChange={(val) => setFilterGroup(val as string)}
                options={segmentedOptions}
              />
            </Space>
          </div>

          <Space direction='vertical' size={12} style={{ width: '100%' }}>
            {displayedGroups.map((group) => (
              <div key={group.id}>
                <div style={{ marginBottom: 6 }}>
                  <Space size={6}>
                    <Tag color={group.badgeColor} style={{ fontWeight: 600, fontSize: 11 }}>
                      {group.groupTitle}
                    </Tag>
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      ({group.fields.length} trường)
                    </Text>
                  </Space>
                </div>
                <Space wrap size={[6, 8]}>
                  {group.fields.map((f) => {
                    const isSelected = fieldPath === f.path
                    return (
                      <Tooltip
                        key={f.path}
                        title={
                          <div>
                            <div>
                              <b>Đường dẫn:</b> <code>{f.path}</code>
                            </div>
                            <div>
                              <b>Interface:</b> {f.interfaceName}
                            </div>
                            <div>
                              <b>Kiểu:</b> <code>{f.type}</code>
                            </div>
                            <div style={{ marginTop: 4 }}>{f.description}</div>
                          </div>
                        }
                      >
                        <Tag
                          color={isSelected ? 'processing' : f.isLegacy ? 'volcano' : 'default'}
                          icon={
                            isSelected ? (
                              <CheckOutlined />
                            ) : f.isLegacy ? (
                              <FireOutlined />
                            ) : undefined
                          }
                          style={{
                            cursor: 'pointer',
                            padding: '2px 8px',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            borderRadius: 4,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? token.colorPrimary : undefined,
                            fontWeight: f.isLegacy || isSelected ? 600 : 400,
                          }}
                          onClick={() => {
                            setFieldPath(f.path)
                            setPreviewResult(null)
                          }}
                        >
                          {f.name}
                          {f.isLegacy && (
                            <span
                              style={{
                                marginLeft: 4,
                                fontSize: 10,
                                opacity: 0.85,
                                fontStyle: 'italic',
                              }}
                            >
                              (legacy)
                            </span>
                          )}
                        </Tag>
                      </Tooltip>
                    )
                  })}
                </Space>
              </div>
            ))}
          </Space>
        </Card>

        {/* Options */}
        <Space size={16} wrap>
          <Checkbox
            checked={onlyCurrentUser}
            onChange={(e) => setOnlyCurrentUser(e.target.checked)}
          >
            Chỉ tài khoản hiện tại ({user?.email || 'N/A'})
          </Checkbox>
          <Checkbox checked={updateLocalDb} onChange={(e) => setUpdateLocalDb(e.target.checked)}>
            Đồng thời xóa trong Local Database (IndexedDB)
          </Checkbox>
        </Space>

        {/* Action Buttons */}
        <Space size={12} wrap>
          <Button
            icon={<SearchOutlined />}
            onClick={handlePreview}
            loading={loadingPreview}
            disabled={!user || loadingRemove}
          >
            Quét & Xem trước (Preview)
          </Button>
          <Button
            type='primary'
            danger
            icon={<DeleteOutlined />}
            onClick={handleExecuteRemove}
            loading={loadingRemove}
            disabled={!user || loadingPreview || !fieldPath.trim()}
          >
            Xác nhận xóa trường
          </Button>
        </Space>

        {/* Live Progress Status */}
        {progressStatus && (
          <Alert
            message={
              <Space>
                <Spin size='small' />
                <span>{progressStatus}</span>
              </Space>
            }
            type='info'
            showIcon={false}
          />
        )}

        {/* Execution Result Alert */}
        {removeStatus && (
          <Alert
            message={removeStatus.message}
            type={removeStatus.type}
            showIcon
            closable
            onClose={() => setRemoveStatus(null)}
          />
        )}

        {/* Preview Results Table */}
        {previewResult && (
          <Card
            type='inner'
            title={
              <Space>
                <InfoCircleOutlined style={{ color: token.colorPrimary }} />
                <span>
                  Kết quả quét trường <Text code>{previewResult.fieldPath}</Text>:
                </span>
                {previewResult.affectedCount > 0 ? (
                  <Tag color='warning'>
                    {previewResult.affectedCount} / {previewResult.totalScanned} tài liệu bị ảnh
                    hưởng
                  </Tag>
                ) : (
                  <Tag color='success'>Không có tài liệu nào chứa trường này</Tag>
                )}
              </Space>
            }
            size='small'
            style={{ marginTop: 8 }}
          >
            {previewResult.affectedCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 28, color: token.colorSuccess }} />
                <div style={{ marginTop: 8, color: token.colorTextSecondary }}>
                  Tuyệt vời! Không tìm thấy trường <Text code>{previewResult.fieldPath}</Text> trong
                  bộ dữ liệu {targetType === 'item' ? 'Item' : 'Article'}.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Text type='secondary'>
                    Tìm thấy tổng cộng <b>{previewResult.totalOccurrences}</b> vị trí cần xóa trong{' '}
                    <b>{previewResult.affectedCount}</b> tài liệu. Dưới đây là danh sách mẫu:
                  </Text>
                </div>
                <Table
                  columns={previewColumns}
                  dataSource={previewResult.sampleDocs}
                  rowKey='id'
                  size='small'
                  pagination={{ pageSize: 5 }}
                />
              </div>
            )}
          </Card>
        )}
      </Space>
    </Card>
  )
}
