import { msgErrors } from '@/constant/validation'
import { chromeStorage } from '@/extension/storageService'
import appStyle from '@/style/appStyle.module.scss'
import { appConfig, EAppType } from '@/config/appConfig'
import { useAutoComplete } from '@/helpers/hooks/autoComplete'
import { isGroupWord } from '@/helpers/validate'
import { ECategory, EType, IItem, IExample, IMeaning } from '@/models/item.model'
import { formatTagValue } from '@/models/tag.model'
import { categories as defaultCategories } from '@/constant/item'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { authAction } from '@/store/reducers/auth.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { exampleAction } from '@/store/reducers/example.reducer'
import { InputTag, Level, ReviewableTextArea } from '@/views/components'
import { Reference } from '@/views/features/references/References'
import { theme, Select, Button, Flex, Alert, Tooltip, Tag, Typography } from 'antd'
import clsx from 'clsx'
import { useEffect, Suspense, useState, useCallback, useMemo, useRef } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { initItem } from './data'
import { MeaningItemForm } from './MeaningItemForm'
import styles from './itemModal.module.scss'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { usePrompt } from '@/helpers/hooks'
import { TagSelect } from '@/views/components'
import { itemApi, tagApi } from '@/services/firebase'
import { localDb } from '@/services/localDb'
import { collection, doc, Timestamp } from 'firebase/firestore'
import { db, dbCollections } from '@/config/firebaseConfig'
import { removeLineBreaks, sanitizePronunciation } from '@/core/utils'
import { itemKeys, useCreateItem, useUpdateItem } from '@/core/hooks/useItems'
import { useModal, useCurrentModal } from '@/context/modal.context'
import { useQueryClient } from '@tanstack/react-query'
import {
  geminiDictionaryService,
  resolveGeminiApiKey,
  formatHtmlList,
  IDictionaryAutofillData,
  filterWordsExcludingOrigin,
} from '@/services/gemini'
import {
  MinusOutlined,
  ThunderboltOutlined,
  BookOutlined,
  CompassOutlined,
  DownloadOutlined,
  TrophyOutlined,
  StarFilled,
  StarOutlined,
  FolderFilled,
  InboxOutlined,
  TagsOutlined,
  BranchesOutlined,
  ForkOutlined,
  ApartmentOutlined,
  ShareAltOutlined,
  UpCircleFilled,
  DownCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import moment from 'moment'

interface ItemFormProps {
  item: IItem
  isEditMode?: boolean
}

export const ItemForm: React.FC<ItemFormProps> = ({
  item = initItem,
  isEditMode: propIsEditMode,
}) => {
  const { token } = theme.useToken()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutofilling, setIsAutofilling] = useState(false)
  const [autofillSuccess, setAutofillSuccess] = useState(false)
  const autofillTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoadingItem, setIsLoadingItem] = useState(false)
  const [currentItem, setCurrentItem] = useState<IItem>(item)
  const [showMeanings, setShowMeanings] = useState<boolean>(true)
  const [isEditMode, setIsEditMode] = useState<boolean>(Boolean(propIsEditMode || item?.id))

  useEffect(() => {
    return () => {
      if (autofillTimeoutRef.current) {
        clearTimeout(autofillTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (propIsEditMode !== undefined) {
      setIsEditMode(propIsEditMode)
    }
  }, [propIsEditMode])

  const { notification, confirm } = usePrompt()

  const dispatch = useDispatch()

  const { user } = useSelector((state) => state.auth)
  const { categories } = useSelector((state) => state.setting)
  const { list } = useSelector((state) => state.studySet)

  const categoryOptions = useMemo(() => {
    const list = categories && categories.length > 0 ? categories : defaultCategories
    return list.filter((item) => item.value !== ECategory.ALL)
  }, [categories])

  // React Query mutations
  const { isPending: isCreating, mutateAsync: createMutation } = useCreateItem()
  const { isPending: isUpdating, mutateAsync: updateMutation } = useUpdateItem()

  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    trigger,
    watch,
    register,
    formState: { isValid, errors },
  } = useFormContext<IItem>()

  const catType = watch('catId')

  const origin = watch('origin')

  const autoCompleteFilters = useMemo(
    () => ({
      keyword: origin || '',
    }),
    [origin],
  )

  const { options, isSearching } = useAutoComplete(autoCompleteFilters, 'item', false, 300)

  const { closeModal, updateModal, minimizeModal } = useModal()
  const currentModal = useCurrentModal()
  const currentModalRef = useRef(currentModal)
  currentModalRef.current = currentModal

  const handleMinimize = () => {
    if (currentModal?.minimize) {
      currentModal.minimize()
    } else {
      minimizeModal()
    }
  }

  const prevOriginRef = useRef<string | undefined>(origin)
  useEffect(() => {
    if (isAutofilling) return
    if (!origin?.trim()) return

    if (prevOriginRef.current !== origin) {
      prevOriginRef.current = origin
      if (autofillSuccess) {
        setAutofillSuccess(false)
        if (autofillTimeoutRef.current) {
          clearTimeout(autofillTimeoutRef.current)
          autofillTimeoutRef.current = null
        }
      }
      const targetId = currentModalRef.current?.modalId || currentModal?.modalId
      const defaultInfo = {
        title: `Item: ${origin.trim()}`,
        tooltip: `Mở lại biểu mẫu: ${origin.trim()}`,
        icon: <BookOutlined />,
        status: 'default' as const,
      }
      if (currentModalRef.current?.updateMinimizeInfo) {
        currentModalRef.current.updateMinimizeInfo(defaultInfo)
      } else {
        updateModal(
          {
            minimizeInfo: defaultInfo,
          },
          targetId,
        )
      }
    }
  }, [origin, isAutofilling, autofillSuccess, currentModal, updateModal])

  const prevMinimizedRef = useRef<boolean | undefined>(currentModal?.isMinimized)
  useEffect(() => {
    // Khi modal được mở lại từ trạng thái thu nhỏ (minimized -> unminimized),
    // đưa trạng thái minimizeInfo về mặc định sau khi người dùng đã mở xem kết quả
    if (prevMinimizedRef.current === true && !currentModal?.isMinimized) {
      const targetId = currentModalRef.current?.modalId || currentModal?.modalId
      const currentOriginVal = (getValues('origin') || origin || '').trim()
      const defaultInfo = {
        title: currentOriginVal ? `Item: ${currentOriginVal}` : 'Item Form',
        tooltip: currentOriginVal ? `Mở lại biểu mẫu: ${currentOriginVal}` : 'Mở lại biểu mẫu',
        icon: <BookOutlined />,
        status: 'default' as const,
      }
      if (currentModalRef.current?.updateMinimizeInfo) {
        currentModalRef.current.updateMinimizeInfo(defaultInfo)
      } else {
        updateModal({ minimizeInfo: defaultInfo }, targetId)
      }
    }
    prevMinimizedRef.current = currentModal?.isMinimized
  }, [currentModal?.isMinimized, origin, getValues, updateModal])

  const currentItemRef = useRef<IItem>(currentItem)
  currentItemRef.current = currentItem

  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadedItemIdRef = useRef<string | undefined>(item?.id)
  const loadedOriginRef = useRef<string>(item?.origin || '')

  useEffect(() => {
    if (item?.id || (propIsEditMode && item)) {
      loadedItemIdRef.current = item.id
      loadedOriginRef.current = item.origin || ''
      if (item?.id || propIsEditMode) {
        setIsEditMode(true)
      }
      if (item?.meanings) {
        const sortedMeanings = [...item.meanings].sort(
          (a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0),
        )
        const updated = { ...item, meanings: sortedMeanings }
        setCurrentItem(updated)
        currentItemRef.current = updated
      } else {
        setCurrentItem(item)
        currentItemRef.current = item
      }
    }
  }, [item, propIsEditMode])

  // Re-validate origin promptly when autocomplete search completes or options update
  const prevOptionsRef = useRef(options)
  const prevSearchingRef = useRef(isSearching)
  useEffect(() => {
    const searchFinished = prevSearchingRef.current && !isSearching
    const optionsChanged = prevOptionsRef.current !== options
    prevSearchingRef.current = isSearching
    prevOptionsRef.current = options

    if ((searchFinished || optionsChanged) && !isSearching) {
      if (getValues('origin')?.trim()) {
        trigger('origin')
      }
    }
  }, [options, isSearching, trigger, getValues])

  const createExample = async (meanings: IMeaning): Promise<IExample[]> => {
    const now = Timestamp.now().toMillis()
    return (meanings.examples || []).map((example) => {
      const origin = removeLineBreaks(example.origin || '')
      const translation = removeLineBreaks(example.translation || '')
      return {
        id: example.id || doc(collection(db, dbCollections.items)).id,
        uid: example.uid || user?.uid || '',
        origin,
        translation,
        note: example.note || '',
        created_date: example.created_date || now,
        last_update: now,
        randomIndex: example.randomIndex ?? Math.random(),
      }
    })
  }

  const onSubmit = async (data: IItem) => {
    setIsSubmitting(true)

    try {
      try {
        // Ensure all tags in data.tags exist in the tags collection (auto-create missing tags)
        const normalizedTags = Array.from(
          new Set((data.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean)),
        )

        if (normalizedTags.length > 0) {
          try {
            await tagApi.ensureTagsExist(normalizedTags)
          } catch (tagErr) {
            console.warn('Failed to ensure tags exist:', tagErr)
          }
        }

        // Sync latest tags and update Redux store
        try {
          const tagsResponse = await tagApi.getTags('')
          if (tagsResponse.isSuccess && tagsResponse.content) {
            const latestTags = tagsResponse.content
            dispatch(authAction.updateItemTags(latestTags))
            dispatch(
              settingAction.setTags(
                latestTags.map((tag) => ({
                  id: tag.name,
                  label: tag.name,
                  value: tag.value ? formatTagValue(tag.value) : formatTagValue(tag.name),
                  color: tag.color,
                  order: tag.order,
                })),
              ),
            )

            const tagLookup = new Map(latestTags.map((tag) => [tag.name.toLowerCase(), tag.name]))
            const finalTags = normalizedTags.map((tag) => tagLookup.get(tag.toLowerCase()) || tag)
            data.tags = Array.from(new Set(finalTags))
          } else {
            data.tags = normalizedTags
          }
        } catch (fetchTagErr) {
          console.warn('Failed to fetch latest tags:', fetchTagErr)
          data.tags = normalizedTags
        }

        setValue('tags', data.tags)
      } catch (error) {
        console.error('Error syncing tags:', error)
        notification({
          type: 'error',
          message: 'Failed to sync tags. Please try again.',
        })
        return
      }

      const meanings: IMeaning[] =
        data.meanings && data.meanings.length > 0
          ? await Promise.all(
              data.meanings.map(async (meaning) => ({
                ...meaning,
                itemId: data.id || '',
                uid: user?.uid || '',
                created_date: meaning.created_date || Timestamp.now().toMillis(),
                last_update: Timestamp.now().toMillis(),
                note: meaning.note || '',
                collocations: meaning.collocations || '',
                grammar: meaning.grammar || '',
                definition: meaning.definition || '',
                translation: meaning.translation || '',
                pronunciation: meaning.pronunciation
                  ? {
                      uk: sanitizePronunciation(meaning.pronunciation.uk),
                      us: sanitizePronunciation(meaning.pronunciation.us),
                      common: sanitizePronunciation(meaning.pronunciation.common),
                    }
                  : { common: '', uk: '', us: '' },
                common: meaning.common || false,
                enable: meaning.enable || false,
                antonyms: meaning.antonyms || [],
                synonyms: meaning.synonyms || [],
                examples: await createExample(meaning),
              })),
            )
          : []

      // Prioritize common meanings (sort common meanings first)
      const sortedMeanings = [...meanings].sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))

      const cleanTags = (data.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean)
      const cleanTagsLower = cleanTags
        .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase())
        .filter(Boolean)

      const dataSubmit: IItem = {
        ...data,
        uid: data.uid || user?.uid || '',
        tags: cleanTags,
        tags_lowercase: cleanTagsLower,
        collocations: data.collocations || [],
        forms: data.forms || [],
        word_family: data.word_family || [],
        relation: data.relation || [],
        meanings: sortedMeanings,
      }
      let targetId =
        dataSubmit.id ||
        data?.id ||
        getValues('id') ||
        loadedItemIdRef.current ||
        currentItemRef.current?.id ||
        currentItem?.id ||
        item?.id

      const isMissingIdUpdate = isEditing && !targetId

      if (isMissingIdUpdate) {
        // Generate a new Firestore doc ID for this existing item
        targetId = doc(collection(db, dbCollections.items)).id
        dataSubmit.id = targetId

        // Delete the old un-identified record from localDb so we don't have duplicate records
        try {
          await localDb.items
            .filter((it) => {
              const matchOrigin = (it.origin || '').trim() === (item.origin || '').trim()
              const matchCreated = item.created_date ? it.created_date === item.created_date : true
              const matchNoId = !it.id || !it.id.trim()
              return matchOrigin && matchCreated && matchNoId
            })
            .delete()
        } catch (cleanupErr) {
          console.warn('Failed to cleanup old missing-id item in localDb:', cleanupErr)
        }
      }

      if (targetId) {
        dataSubmit.id = String(targetId)
        try {
          const { isSuccess, content } = await updateMutation({
            id: String(targetId),
            data: dataSubmit,
          })

          if (isSuccess && content) {
            const itemUpdated = content
            // update item in study set
            if (itemUpdated && list.find((item) => item.id === itemUpdated.id)) {
              dispatch(studySetAction.update(itemUpdated))
            }
            // update iotd item
            dispatch(iotdAction.update(itemUpdated))

            // Sync updated item's examples to example reducer
            if (itemUpdated && itemUpdated.meanings) {
              const updatedItemExamples: IExample[] = []
              for (const m of itemUpdated.meanings || []) {
                for (const ex of (m.examples || []) as any[]) {
                  if (ex && typeof ex === 'object' && ex.origin && ex.origin.trim()) {
                    const normEx: IExample = {
                      ...ex,
                      id: ex.id || `${itemUpdated.id}_${ex.origin.trim()}`,
                      itemId: itemUpdated.id,
                      itemOrigin: itemUpdated.origin,
                      catId: itemUpdated.catId,
                    }
                    updatedItemExamples.push(normEx)
                  }
                }
              }
              if (updatedItemExamples.length > 0) {
                dispatch(exampleAction.batchUpdate(updatedItemExamples))
              }
            }

            reset({ ...initItem })
            if (currentModal?.close) {
              currentModal.close()
            } else {
              closeModal(currentModal?.modalId)
            }
            notification({ type: 'success', message: 'Updated item successful!' })
            // refresh list in library
            await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
          }
        } catch (error) {
          notification({ type: 'error', message: JSON.stringify(error) })
        }
      } else {
        try {
          const { isSuccess } = await createMutation(dataSubmit)
          if (isSuccess) {
            // refresh list in library
            await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

            reset({ ...initItem })
            if (currentModal?.close) {
              currentModal.close()
            } else {
              closeModal(currentModal?.modalId)
            }
            notification({ type: 'success', message: 'Item created successful!' })
          }
        } catch (error) {
          notification({ type: 'error', message: JSON.stringify(error) })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const applyAutofillData = async (originWord: string, data: IDictionaryAutofillData) => {
    const formattedMeanings: IMeaning[] = (data.meanings || [])
      .map((m, index) => {
        const rawUk = (m.pronunciation?.uk || '').trim()
        const rawUs = (m.pronunciation?.us || '').trim()
        const rawCommon = (m.pronunciation?.common || '').trim()

        const cleanIpa = (val: string) =>
          val
            .replace(/^\/+|\/+$/g, '')
            .trim()
            .toLowerCase()
        const isSamePronunciation = rawUk && rawUs && cleanIpa(rawUk) === cleanIpa(rawUs)

        const finalUs = sanitizePronunciation(rawUs || rawUk)
        const finalUk = isSamePronunciation ? '' : sanitizePronunciation(rawUk)
        const finalCommon = sanitizePronunciation(rawCommon || finalUs)

        return {
          typeId: m.typeId || EType.NOUN,
          common: index === 0,
          enable: true,
          definition: m.definition || '',
          translation: m.translation || '',
          note: formatHtmlList(m.note || '', false),
          grammar: formatHtmlList(m.grammar || '', true),
          collocations: formatHtmlList(m.collocations || ''),
          synonyms: filterWordsExcludingOrigin(m.synonyms || [], originWord),
          antonyms: [],
          pronunciation: {
            uk: finalUk,
            us: finalUs,
            common: finalCommon,
          },
          examples: (m.examples || []).map((ex) => ({
            origin: ex.origin || '',
            translation: ex.translation || '',
            note: '',
            created_date: Timestamp.now().toMillis(),
            last_update: Timestamp.now().toMillis(),
          })),
        }
      })
      .sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))

    const autofillForms = filterWordsExcludingOrigin(
      data.forms && data.forms.length > 0 ? data.forms : getValues('forms') || [],
      originWord,
    )
    const autofillFamily = filterWordsExcludingOrigin(
      data.word_family && data.word_family.length > 0
        ? data.word_family
        : getValues('word_family') || [],
      originWord,
    )
    const autofillRelation = filterWordsExcludingOrigin(
      data.relation && data.relation.length > 0 ? data.relation : getValues('relation') || [],
      originWord,
    )

    reset({
      ...getValues(),
      origin: originWord,
      catId: data.catId ?? getValues('catId'),
      level: data.level ?? getValues('level'),
      forms: autofillForms,
      word_family: autofillFamily,
      relation: autofillRelation,
      meanings: formattedMeanings,
    })

    await trigger()
  }

  const runAutofill = async (originWord: string, sourceName: string = 'Google') => {
    if (autofillTimeoutRef.current) {
      clearTimeout(autofillTimeoutRef.current)
      autofillTimeoutRef.current = null
    }
    setAutofillSuccess(false)
    setIsAutofilling(true)
    const targetModalId = currentModalRef.current?.modalId || currentModal?.modalId
    const processingInfo = {
      title: `Item: ${originWord}`,
      tooltip: `Gemini đang phân tích "${originWord}"...`,
      status: 'processing' as const,
      icon: <ThunderboltOutlined spin style={{ color: '#722ed1' }} />,
    }
    if (currentModalRef.current?.updateMinimizeInfo) {
      currentModalRef.current.updateMinimizeInfo(processingInfo)
    } else {
      updateModal({ minimizeInfo: processingInfo }, targetModalId)
    }
    notification({
      type: 'info',
      message: `Gemini đang phân tích "${originWord}"...`,
      duration: 3,
    })

    try {
      const resp = await geminiDictionaryService.fetchFromReference(
        originWord,
        sourceName,
        undefined,
      )
      if (!resp.isSuccess || !resp.content) {
        setAutofillSuccess(false)
        const errorInfo = {
          title: `Item: ${originWord}`,
          tooltip: `Không thể lấy dữ liệu từ ${sourceName}.`,
          status: 'error' as const,
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        }
        if (currentModalRef.current?.updateMinimizeInfo) {
          currentModalRef.current.updateMinimizeInfo(errorInfo)
        } else {
          updateModal({ minimizeInfo: errorInfo }, targetModalId)
        }
        notification({
          type: 'error',
          message: resp.message || `Failed to fetch dictionary data from ${sourceName}.`,
        })
        return
      }

      await applyAutofillData(originWord, resp.content)
      prevOriginRef.current = originWord
      setAutofillSuccess(true)

      const successInfo = {
        title: `Item: ${originWord}`,
        tooltip: `Gemini đã phân tích xong "${originWord}"!`,
        status: 'success' as const,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      }
      if (currentModalRef.current?.updateMinimizeInfo) {
        currentModalRef.current.updateMinimizeInfo(successInfo)
      } else {
        updateModal({ minimizeInfo: successInfo }, targetModalId)
      }

      // Trả nút Auto Fill bên trong form về bình thường sau 3.5s (Float button giữ nguyên tích xanh cho tới khi mở lại modal)
      autofillTimeoutRef.current = setTimeout(() => {
        setAutofillSuccess(false)
      }, 3500)

      notification({
        type: 'success',
        message: `Đã nạp xong từ điển cho "${originWord}"!`,
        duration: 4,
      })
    } catch (error: any) {
      console.error('Auto-fill error:', error)
      setAutofillSuccess(false)
      const errorInfo = {
        title: `Item: ${originWord}`,
        tooltip: `Lỗi khi tra từ "${originWord}".`,
        status: 'error' as const,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      }
      if (currentModalRef.current?.updateMinimizeInfo) {
        currentModalRef.current.updateMinimizeInfo(errorInfo)
      } else {
        updateModal({ minimizeInfo: errorInfo }, targetModalId)
      }
      notification({
        type: 'error',
        message: error?.message || `Error occurred during ${sourceName} auto-fill.`,
      })
    } finally {
      setIsAutofilling(false)
    }
  }

  const handleAutoFill = async (sourceName: string = 'Google') => {
    setAutofillSuccess(false)
    const currentOrigin = (getValues('origin') || '').trim()
    if (!currentOrigin) {
      notification({
        type: 'warning',
        message: 'Please enter an Origin word or phrase first.',
      })
      return
    }

    const apiKey = resolveGeminiApiKey()
    if (!apiKey) {
      const inputKey = window.prompt(
        'Gemini API key is not configured. Enter your Gemini API key (it will be saved to your browser):',
      )
      if (!inputKey || !inputKey.trim()) {
        notification({
          type: 'warning',
          message: 'Gemini API key is required to auto-fill dictionary data.',
        })
        return
      }
      localStorage.setItem('gemini_api_key', inputKey.trim())
    }

    const currentMeanings = getValues('meanings') || []
    const hasMeaningContent = currentMeanings.some(
      (m) => (m.definition && m.definition.trim()) || (m.translation && m.translation.trim()),
    )

    if (hasMeaningContent) {
      confirm({
        title: `Replace existing meanings?`,
        content: `This will replace the current meanings with data from ${sourceName}.`,
        okText: 'Replace',
        onOk: (close) => {
          close?.()
          runAutofill(currentOrigin, sourceName)
        },
      })
      return
    }

    await runAutofill(currentOrigin, sourceName)
  }

  const handleLoadExistingItem = async () => {
    if (isLoadingItem) return
    const currentOrigin = (getValues('origin') || origin || '').trim()
    if (!currentOrigin) return

    setIsLoadingItem(true)
    try {
      let existingItem: IItem | null = null

      const matchedOpt = options.find((opt) => {
        const optWord = String(opt.origin || opt.value || '')
          .trim()
          .toLowerCase()
        return optWord === currentOrigin.toLowerCase()
      })

      const existingId = matchedOpt?.id ? String(matchedOpt.id) : undefined

      if (existingId) {
        try {
          const resp = await itemApi.getItemById(existingId)
          if (resp.isSuccess && resp.content) {
            existingItem = resp.content
          }
        } catch (err) {
          console.warn('Failed to get item by ID, falling back to query:', err)
        }
      }

      if (!existingItem) {
        try {
          const resp = await itemApi.getItems({
            keyword: currentOrigin,
            page: 0,
            size: 1,
            exact: true,
          })
          if (resp.isSuccess && resp.content && resp.content.length > 0) {
            existingItem = resp.content[0]
          }
        } catch (err) {
          console.warn('Failed to get items by query:', err)
        }
      }

      if (!existingItem && matchedOpt && (matchedOpt as any).item) {
        existingItem = (matchedOpt as any).item
      }

      if (!existingItem) {
        notification({
          type: 'error',
          message: 'Could not find details for the existing item.',
        })
        return
      }

      const formattedMeanings: IMeaning[] = (existingItem.meanings || [])
        .map((m) => ({
          ...m,
          typeId: m.typeId ?? EType.NOUN,
          common: m.common ?? false,
          enable: m.enable ?? true,
          definition: m.definition || '',
          translation: m.translation || '',
          note: m.note || '',
          grammar: m.grammar || '',
          collocations: m.collocations || '',
          pronunciation: m.pronunciation
            ? {
                uk: sanitizePronunciation(m.pronunciation.uk),
                us: sanitizePronunciation(m.pronunciation.us),
                common: sanitizePronunciation(m.pronunciation.common),
              }
            : { uk: '', us: '', common: '' },
          synonyms: m.synonyms || [],
          antonyms: m.antonyms || [],
          examples: m.examples || [],
        }))
        .sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))

      const finalItemId =
        existingItem.id || existingId || (matchedOpt?.id ? String(matchedOpt.id) : undefined)

      const filledItem: IItem = {
        ...initItem,
        ...existingItem,
        id: finalItemId,
        catId: existingItem.catId ?? getValues('catId') ?? ECategory.WORD,
        origin: existingItem.origin || currentOrigin,
        tags: existingItem.tags || [],
        archive: existingItem.archive ?? false,
        favorite: existingItem.favorite ?? false,
        level: existingItem.level ?? 0,
        forms: existingItem.forms || [],
        word_family: existingItem.word_family || [],
        relation: existingItem.relation || [],
        collocations: existingItem.collocations || [],
        meanings: formattedMeanings,
      }

      loadedItemIdRef.current = finalItemId
      loadedOriginRef.current = (filledItem.origin || currentOrigin).trim()
      currentItemRef.current = filledItem
      setCurrentItem(filledItem)
      setIsEditMode(true)
      setValue('id', finalItemId)
      reset(filledItem)
      await trigger()

      updateModal(
        {
          tag: <Tag color={'yellow'}>UPDATE</Tag>,
        },
        currentModalRef.current?.modalId || currentModal?.modalId,
      )

      notification({
        type: 'success',
        message: `Loaded details for "${filledItem.origin}"!`,
      })
    } catch (error: any) {
      console.error('Failed to load existing item:', error)
      notification({
        type: 'error',
        message: error?.message || 'Failed to load existing item.',
      })
    } finally {
      setIsLoadingItem(false)
    }
  }

  const handleCancel = useCallback(
    () => (currentModal?.close ? currentModal.close() : closeModal(currentModal?.modalId)),
    [closeModal, currentModal],
  )

  const handleTagUpdated = useCallback(
    (previousValue: string, nextValue: string) => {
      const currentTags = getValues('tags') || []
      const nextTags = Array.from(
        new Set(currentTags.map((tag) => (tag === previousValue ? nextValue : tag))),
      )
      setValue('tags', nextTags)
    },
    [getValues, setValue],
  )

  const handleTagDeleted = useCallback(
    (deletedValue: string) => {
      const currentTags = getValues('tags') || []
      setValue(
        'tags',
        currentTags.filter((tag) => tag !== deletedValue),
      )
    },
    [getValues, setValue],
  )

  const getDefaultCategoryFromOrigin = (value: string) =>
    isGroupWord(value) ? ECategory.PHRASE : ECategory.WORD

  useEffect(() => {
    if (!item?.id && appConfig.appType === EAppType.EXTENSION) {
      chromeStorage.get(['origin', 'catId']).then((resp) => {
        const origin = typeof resp.origin === 'string' ? resp.origin.trim() : ''
        const catId =
          typeof resp.catId === 'number'
            ? (resp.catId as ECategory)
            : getDefaultCategoryFromOrigin(origin)

        reset({ ...initItem, origin, catId })
      })
    }
  }, [item?.id, reset])

  // Shortcut: Ctrl+S or Cmd+S to quickly save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (
          isValid &&
          !isSubmitting &&
          !isCreating &&
          !isUpdating &&
          !isSearching &&
          !isAutofilling &&
          !isLoadingItem
        ) {
          handleSubmit(onSubmit)()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isValid,
    isSubmitting,
    isCreating,
    isUpdating,
    isSearching,
    isAutofilling,
    isLoadingItem,
    handleSubmit,
    onSubmit,
  ])

  const watchedId = watch('id')
  const isEditing = Boolean(
    isEditMode ||
    currentItem?.id ||
    item?.id ||
    loadedItemIdRef.current ||
    watchedId
  )
  const currentLevel = watch('level') || 0

  useEffect(() => {
    updateModal(
      {
        tag: isEditing ? <Tag color={'yellow'}>UPDATE</Tag> : <Tag color={'green'}>CREATE</Tag>,
      },
      currentModalRef.current?.modalId || currentModal?.modalId,
    )
  }, [isEditing, currentModal?.modalId])

  const handleSaveMeaning = useCallback(() => {
    handleSubmit(onSubmit)()
  }, [handleSubmit, onSubmit])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer}>
      <input type='hidden' {...register('id')} />
      {/* ── CARD 1: MAIN VOCABULARY TERM & AI AUTOFILL ── */}
      <div className={styles.sectionCard}>
        <div className={styles.cardHeader}>
          <Flex align='center' gap={token.size / 2}>
            <BookOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
            <span className={styles.sectionTitle}>Information</span>

            <Controller
              control={control}
              name='catId'
              render={({ field: { onChange, value, ref } }) => (
                <Select
                  ref={ref}
                  className={styles.categorySelect}
                  onChange={onChange}
                  options={categoryOptions}
                  value={value}
                  defaultValue={ECategory.WORD}
                  size='middle'
                />
              )}
            />
          </Flex>

          <Flex align='center' justify={'space-between'} gap={token.size / 2} wrap='wrap'>
            <Tooltip title={autofillSuccess ? 'Đã nạp xong từ điển!' : 'Tra cứu từ vựng'}>
              <Button
                htmlType='button'
                type='primary'
                className={clsx(styles.aiAutofillBtn, autofillSuccess && styles.aiAutofillBtnSuccess)}
                loading={isAutofilling}
                icon={autofillSuccess ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ThunderboltOutlined />}
                disabled={!origin?.trim() || isAutofilling}
                onClick={() => handleAutoFill('Google')}
              >
                {isAutofilling ? 'Đang phân tích...' : autofillSuccess ? 'Đã nạp xong!' : 'Auto Fill'}
              </Button>
            </Tooltip>
          </Flex>
        </div>

        <div className={styles.originInputWrapper}>
          <Controller
            control={control}
            name='origin'
            rules={{
              required: {
                value: true,
                message: msgErrors.required,
              },
              validate: {
                required: (value) => {
                  if (!value || !value.trim()) {
                    return msgErrors.required
                  }
                  return true
                },
                existed: (value) => {
                  const trimmedValue = (value || '').trim()
                  if (!trimmedValue) return true

                  const activeItem = currentItemRef.current || currentItem
                  const currentId =
                    getValues('id') || loadedItemIdRef.current || activeItem?.id || item?.id
                  const originalOrigin = (
                    loadedOriginRef.current ||
                    activeItem?.origin ||
                    item?.origin ||
                    ''
                  )
                    .trim()
                    .toLowerCase()

                  const valLower = trimmedValue.toLowerCase()

                  // 1. If editing this item and the origin hasn't changed, it's valid
                  if (originalOrigin && valLower === originalOrigin) {
                    return true
                  }

                  // 2. Check against options
                  const currentOptions = optionsRef.current || options || []
                  const existsInOptions = currentOptions.some((opt) => {
                    // Do not treat self as duplicate when editing
                    if (currentId && opt.id && String(opt.id) === String(currentId)) {
                      return false
                    }
                    const optOrigin = String(opt.origin || opt.value || '')
                      .trim()
                      .toLowerCase()
                    return optOrigin === valLower
                  })

                  if (!existsInOptions) return true

                  return msgErrors.existed
                },
              },
            }}
            render={({ field: { onChange, value }, fieldState: { invalid } }) => {
              return (
                <>
                  <ReviewableTextArea
                    className={clsx(appStyle.full, styles.originTextArea)}
                    value={value}
                    placeholder='Original (Nhập từ, cụm từ, câu)...'
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    onChange={(nextValue) => {
                      onChange(nextValue)

                      const currentCat = getValues('catId')
                      const trimmed = (nextValue || '').trim()
                      if (trimmed.length > 50) {
                        setValue('catId', ECategory.SENTENCE)
                      } else {
                        const isGroup = isGroupWord(nextValue)
                        if (currentCat === ECategory.SENTENCE) {
                          setValue('catId', isGroup ? ECategory.PHRASE : ECategory.WORD)
                        } else if (isGroup && currentCat === ECategory.WORD) {
                          setValue('catId', ECategory.PHRASE)
                        } else if (!isGroup && currentCat === ECategory.PHRASE) {
                          setValue('catId', ECategory.WORD)
                        }
                      }

                      // If input becomes empty, or if an error was already displayed, validate immediately
                      if (!nextValue?.trim() || errors.origin) {
                        trigger('origin')
                      }
                    }}
                    onBlur={() => trigger('origin')}
                    language='en'
                    enableReview={true}
                  />

                  {invalid && errors.origin?.type !== 'existed' && (
                    <Alert
                      type='error'
                      showIcon
                      message={errors.origin?.message as string}
                      banner
                      style={{ borderRadius: 8, marginTop: 4 }}
                    />
                  )}

                  {invalid && errors.origin?.type === 'existed' && (
                    <Alert
                      type='error'
                      showIcon
                      style={{ borderRadius: 8, marginTop: 6 }}
                      message={
                        <Flex align='center' justify='space-between' wrap='wrap' gap={8}>
                          <span>
                            {(errors.origin?.message as string) ||
                              'Từ này đã có trong từ điển của bạn.'}
                          </span>
                          <Button
                            type='primary'
                            size='small'
                            icon={<DownloadOutlined />}
                            loading={isLoadingItem}
                            disabled={isLoadingItem}
                            onClick={handleLoadExistingItem}
                            htmlType='button'
                          >
                            Load
                          </Button>
                        </Flex>
                      }
                    />
                  )}
                </>
              )
            }}
          />
        </div>

        {origin && (
          <div className={styles.referenceBar}>
            <Flex align='center' gap={6} className={styles.referenceLabel}>
              <CompassOutlined />
              <span>Nguồn tra cứu:</span>
            </Flex>
            <Reference origin={origin} />
          </div>
        )}
      </div>

      {/* ── CARD 2: METADATA, MASTERY & TAGS ── */}
      <div className={styles.sectionCard}>
        <div className={styles.metaGrid}>
          <div className={styles.metaControlsRow}>
            {/* Mastery Level */}
            <div className={styles.levelWrapper}>
              <Flex align='center' gap={6}>
                <TrophyOutlined style={{ color: '#faad14', fontSize: 16 }} />
                <span className={styles.levelLabel}>Mức độ:</span>
              </Flex>
              <Controller
                control={control}
                name='level'
                render={({ field }) => (
                  <Level
                    level={field.value ?? 0}
                    disabled={false}
                    size={20}
                    onChange={field.onChange}
                  />
                )}
              />
              <Tag color='gold' style={{ margin: 0, fontWeight: 600 }}>
                {['Lv 0', 'Lv 1', 'Lv 2', 'Lv 3', 'Lv 4', 'Lv 5'][currentLevel] || 'Lv 0'}
              </Tag>
            </div>

            {/* Favorite & Archive Toggle Pills */}
            <Flex align='center' gap={10} wrap='wrap'>
              <Controller
                control={control}
                name='favorite'
                render={({ field: { onChange, value } }) => (
                  <div
                    className={clsx(styles.togglePill, value && styles.activeFavorite)}
                    onClick={() => onChange(!value)}
                    role='button'
                    tabIndex={0}
                  >
                    {value ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    <span>Yêu thích</span>
                  </div>
                )}
              />

              <Controller
                control={control}
                name='archive'
                render={({ field: { onChange, value } }) => (
                  <div
                    className={clsx(styles.togglePill, value && styles.activeArchive)}
                    onClick={() => onChange(!value)}
                    role='button'
                    tabIndex={0}
                  >
                    {value ? (
                      <FolderFilled style={{ color: token.colorPrimary }} />
                    ) : (
                      <InboxOutlined />
                    )}
                    <span>Lưu trữ</span>
                  </div>
                )}
              />
            </Flex>
          </div>

          {/* Tags */}
          <div className={styles.tagRow}>
            <div className={styles.tagLabel}>
              <TagsOutlined style={{ color: token.colorPrimary }} />
              <span>Tags:</span>
            </div>
            <div style={{ flex: 1, minWidth: 200, width: '100%' }}>
              <Controller
                control={control}
                name='tags'
                render={({ field }) => (
                  <TagSelect
                    style={{ width: '100%' }}
                    value={field.value || []}
                    onChange={field.onChange}
                    onTagUpdated={handleTagUpdated}
                    onTagDeleted={handleTagDeleted}
                    placeholder='Thêm nhãn (Tags)...'
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: LINGUISTIC RELATIONS & FORMS ── */}
      <div className={styles.relationsCard}>
        <div className={styles.cardHeader}>
          <Flex align='center' gap={8}>
            <BranchesOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
            <span className={styles.sectionTitle}>Mạng lưới từ vựng & Dạng từ</span>
          </Flex>
          <span className={styles.relationHint}>
            Liên kết các dạng từ, họ từ và ngữ cảnh liên quan
          </span>
        </div>

        <div className={styles.relationsGrid}>
          {catType === ECategory.WORD && (
            <>
              <div className={styles.relationItem}>
                <div className={styles.relationItemHeader}>
                  <span className={styles.relationItemTitle}>
                    <ForkOutlined /> Dạng từ (Forms)
                  </span>
                  <span className={styles.relationHint}>V1, V2, V-ing, -ed...</span>
                </div>
                <Controller
                  control={control}
                  name='forms'
                  render={({ field }) => (
                    <InputTag tags={field.value || []} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className={styles.relationItem}>
                <div className={styles.relationItemHeader}>
                  <span className={styles.relationItemTitle}>
                    <ApartmentOutlined /> Gia đình từ (Word Family)
                  </span>
                  <span className={styles.relationHint}>Các từ cùng gốc</span>
                </div>
                <Controller
                  control={control}
                  name='word_family'
                  render={({ field }) => (
                    <InputTag tags={field.value || []} onChange={field.onChange} />
                  )}
                />
              </div>
            </>
          )}

          <div className={styles.relationItem}>
            <div className={styles.relationItemHeader}>
              <span className={styles.relationItemTitle}>
                <ShareAltOutlined /> Relation
              </span>
              <span className={styles.relationHint}>Collocations, ngữ cảnh...</span>
            </div>
            <Controller
              control={control}
              name='relation'
              render={({ field }) => (
                <InputTag tags={field.value || []} onChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </div>

      {/* ── CARD 4: MEANINGS & EXAMPLES ── */}
      <div className={styles.sectionCard}>
        <Suspense fallback={<div>Đang tải phần định nghĩa...</div>}>
          <MeaningItemForm
            showMeanings={showMeanings}
            catType={catType as ECategory}
            onSubmit={handleSaveMeaning}
          />
        </Suspense>
      </div>

      {/* ── CARD 5: STICKY ACTION FOOTER ── */}
      <div className={styles.stickyFooter}>
        <div className={styles.footerInfo}>
          <Flex align='center' gap={8} wrap='wrap'>
            {currentItem.meanings &&
              currentItem.meanings.length > 0 &&
              item.meanings &&
              item.meanings.length > 0 && (
                <Button
                  size={'middle'}
                  icon={showMeanings ? <UpCircleFilled /> : <DownCircleFilled />}
                  onClick={() => setShowMeanings((prev) => !prev)}
                />
              )}

            {(currentItem?.last_update || item?.last_update) && isEditing && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                Last update: {moment(currentItem?.last_update || item?.last_update).fromNow()}
              </Typography.Text>
            )}
          </Flex>
        </div>

        <div className={styles.footerButtons}>
          <Button
            type={'default'}
            size={'middle'}
            icon={<MinusOutlined />}
            onClick={handleMinimize}
          >
            Minimize
          </Button>

          <Button
            type={'default'}
            size={'middle'}
            style={{ minWidth: 80 }}
            disabled={isSubmitting || isCreating || isUpdating}
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            type='primary'
            size={'middle'}
            style={{ minWidth: 80 }}
            loading={isSubmitting || isCreating || isUpdating}
            icon={<ThunderboltOutlined />}
            disabled={
              !isValid ||
              isSubmitting ||
              isCreating ||
              isUpdating ||
              isSearching ||
              isAutofilling ||
              isLoadingItem
            }
            onClick={() => handleSubmit(onSubmit)()}
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </form>
  )
}
