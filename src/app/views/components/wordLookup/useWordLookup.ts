import { useState, useCallback, useMemo, useEffect } from 'react'
import { usePrompt, useItemModal } from '@/helpers/hooks'
import { IItem, ECategory, EType } from '@/models/item.model'
import { initItem, meaningItem } from '@/views/features/modals/itemModal'
import { geminiTtsService } from '@/services/gemini/geminiTts.service'
import { geminiDictionaryService, resolveGeminiApiKey } from '@/services/gemini'
import { resolveOpenAiApiKey } from '@/services/openai/tts.service'
import { localDb } from '@/services/localDb'
import { getType } from '@/helpers/item'
import { sanitizePronunciation } from '@/core/utils'
import { IWordLookupData } from './types'

// Strip standard punctuation marks and whitespace from word edges while preserving internal apostrophes
export const cleanWordPunctuation = (str?: string): string => {
  if (!str) return ''
  return str
    .trim()
    .replace(
      /^[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]+|[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]+$/gu,
      '',
    )
    .trim()
}

export const useWordLookup = (rawWord: string, sentenceContext?: string) => {
  const { message } = usePrompt()
  const { openItemModal } = useItemModal()

  const cleanWord = useMemo(() => cleanWordPunctuation(rawWord), [rawWord])

  const [lookupData, setLookupData] = useState<IWordLookupData | null>(() =>
    cleanWord ? { origin: cleanWord } : null,
  )
  const [isLookingUpAi, setIsLookingUpAi] = useState(false)
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // Lookup in local indexedDb
  const performLookup = useCallback(async () => {
    if (!cleanWord) return

    try {
      const matched = await localDb.items
        .filter((item) => (item.origin || '').toLowerCase() === cleanWord.toLowerCase())
        .first()

      if (matched) {
        const m = matched.meanings?.[0]
        setLookupData({
          origin: matched.origin,
          translation: m?.translation,
          definition: m?.definition,
          phonetic: m?.pronunciation?.us || m?.pronunciation?.common,
          pos: m?.typeId !== undefined ? getType(m.typeId).origin : undefined,
          typeId: m?.typeId,
          itemId: matched.id,
          item: matched,
          fromAi: false,
          note: m?.note,
          grammar: m?.grammar,
        })
      } else {
        setLookupData((prev) => {
          if (prev && prev.origin.toLowerCase() === cleanWord.toLowerCase()) return prev
          return { origin: cleanWord }
        })
      }
    } catch (err) {
      console.warn('Word lookup in localDb failed:', err)
    }
  }, [cleanWord])

  // Sync lookupData when cleanWord changes and prefetch local match
  useEffect(() => {
    if (cleanWord) {
      setLookupData((prev) => {
        if (prev?.origin?.toLowerCase() === cleanWord.toLowerCase()) return prev
        return { origin: cleanWord }
      })
      performLookup()
    } else {
      setLookupData(null)
    }
  }, [cleanWord, performLookup])

  // Play pronunciation via Gemini TTS / Web Speech API
  const handlePlayAudio = useCallback(async () => {
    const textToPlay = lookupData?.origin || cleanWord
    if (!textToPlay) return

    setIsPlayingAudio(true)
    try {
      await geminiTtsService.playSpeech(textToPlay, {
        voice: 'Aoede',
        onEnd: () => setIsPlayingAudio(false),
        onError: () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToPlay)
            utterance.lang = 'en-US'
            utterance.onend = () => setIsPlayingAudio(false)
            utterance.onerror = () => setIsPlayingAudio(false)
            window.speechSynthesis.speak(utterance)
          } else {
            setIsPlayingAudio(false)
          }
        },
      })
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToPlay)
        utterance.lang = 'en-US'
        utterance.onend = () => setIsPlayingAudio(false)
        utterance.onerror = () => setIsPlayingAudio(false)
        window.speechSynthesis.speak(utterance)
      } else {
        setIsPlayingAudio(false)
      }
    }
  }, [lookupData?.origin, cleanWord])

  // Gemini AI dictionary lookup
  const handleAiLookup = useCallback(async () => {
    if (!cleanWord) return

    let geminiKey = resolveGeminiApiKey()
    const openAiKey = resolveOpenAiApiKey()
    if (!geminiKey && !openAiKey) {
      const inputKey = window.prompt(
        'Chưa tìm thấy API Key cho Gemini hoặc OpenAI. Vui lòng nhập Gemini API Key của bạn (sẽ được lưu trong trình duyệt):',
      )
      if (inputKey && inputKey.trim()) {
        localStorage.setItem('gemini_api_key', inputKey.trim())
        geminiKey = inputKey.trim()
      } else {
        message({
          type: 'warning',
          content: 'Cần có Gemini API Key hoặc OpenAI API Key để tra nghĩa từ điển AI.',
        })
        return
      }
    }

    setIsLookingUpAi(true)
    try {
      const res = await geminiDictionaryService.fetchFromGoogle(cleanWord, sentenceContext)
      if (res.isSuccess && res.content) {
        const m = res.content.meanings?.[0]
        setLookupData((prev) => ({
          origin: prev?.origin || cleanWord,
          translation: m?.translation || 'Không có bản dịch',
          definition: m?.definition || '',
          phonetic: m?.pronunciation?.us || m?.pronunciation?.common || '',
          pos: m?.typeId !== undefined ? getType(m.typeId).origin : undefined,
          typeId: m?.typeId,
          itemId: prev?.itemId,
          fromAi: true,
          note: m?.note || '',
          grammar: m?.grammar || '',
        }))
        message({ type: 'success', content: `Đã tra nghĩa AI cho "${cleanWord}"` })
      } else {
        message({
          type: 'error',
          content: res.message || 'Không tìm thấy định nghĩa cho từ này',
        })
      }
    } catch (err: any) {
      message({ type: 'error', content: err?.message || 'Lỗi tra từ điển AI' })
    } finally {
      setIsLookingUpAi(false)
    }
  }, [cleanWord, sentenceContext, message])

  // Open ItemForm modal to add new word into personal library
  const handleAddWordToLibrary = useCallback(() => {
    const targetWord = lookupData?.origin || cleanWord
    if (!targetWord) return

    if (lookupData?.itemId) {
      message({ type: 'info', content: `Từ "${targetWord}" đã có sẵn trong Thư viện!` })
      return
    }

    const hasAiData = Boolean(
      lookupData?.translation ||
        lookupData?.definition ||
        lookupData?.phonetic ||
        lookupData?.note ||
        lookupData?.grammar,
    )

    const initialMeanings = hasAiData
      ? [
          {
            ...meaningItem,
            typeId: lookupData?.typeId ?? EType.NOUN,
            definition: lookupData?.definition || '',
            translation: lookupData?.translation || '',
            note: lookupData?.note || '',
            grammar: lookupData?.grammar || '',
            pronunciation: {
              us: sanitizePronunciation(lookupData?.phonetic),
              uk: '',
              common: sanitizePronunciation(lookupData?.phonetic),
            },
          },
        ]
      : []

    const newItem: IItem = {
      ...initItem,
      origin: targetWord,
      catId: ECategory.WORD,
      level: 1,
      meanings: initialMeanings,
    }

    openItemModal('add', newItem)
  }, [lookupData, cleanWord, openItemModal, message])

  // Open item detail in ItemModal
  const handleViewItem = useCallback(async () => {
    if (!lookupData?.itemId) return
    let itemToView = lookupData.item
    if (!itemToView) {
      try {
        const found = await localDb.items.get(lookupData.itemId)
        if (found) {
          itemToView = found
        }
      } catch (err) {
        console.warn('Failed to load item from localDb:', err)
      }
    }
    openItemModal(
      'view',
      itemToView || ({ id: lookupData.itemId, origin: lookupData.origin } as IItem),
    )
  }, [lookupData, openItemModal])

  return {
    cleanWord,
    lookupData,
    isLookingUpAi,
    isSavingToLibrary,
    isPlayingAudio,
    performLookup,
    handlePlayAudio,
    handleAiLookup,
    handleAddWordToLibrary,
    handleViewItem,
  }
}
