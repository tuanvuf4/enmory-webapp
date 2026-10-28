import { useState, useCallback, useMemo } from 'react'
import { usePrompt } from '@/helpers/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { itemKeys } from '@/core/hooks'
import { IItem, ECategory, EType } from '@/models/item.model'
import { initItem, meaningItem } from '@/views/features/modals/itemModal'
import { itemApi } from '@/services/firebase/api/item.api'
import { geminiTtsService } from '@/services/gemini/geminiTts.service'
import { geminiDictionaryService, resolveGeminiApiKey } from '@/services/gemini'
import { resolveOpenAiApiKey } from '@/services/openai/tts.service'
import { localDb, invalidateSearchIndex } from '@/services/localDb'
import { getType } from '@/helpers/item'
import { IWordLookupData } from './types'

// Strip standard punctuation marks and whitespace
export const cleanWordPunctuation = (str: string): string => {
  return str.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '').trim()
}

export const useWordLookup = (rawWord: string, sentenceContext?: string) => {
  const { message } = usePrompt()
  const queryClient = useQueryClient()

  const [lookupData, setLookupData] = useState<IWordLookupData | null>(null)
  const [isLookingUpAi, setIsLookingUpAi] = useState(false)
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const cleanWord = useMemo(() => cleanWordPunctuation(rawWord), [rawWord])

  // Lookup in local indexedDb
  const performLookup = useCallback(async () => {
    if (!cleanWord) return
    setLookupData({ origin: cleanWord })

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
          fromAi: false,
          note: m?.note,
          grammar: m?.grammar,
        })
      }
    } catch (err) {
      console.warn('Word lookup in localDb failed:', err)
    }
  }, [cleanWord])

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

  // Save new word into personal library
  const handleAddWordToLibrary = useCallback(async () => {
    if (!lookupData) return
    try {
      if (lookupData.itemId) {
        message({ type: 'info', content: `Từ "${lookupData.origin}" đã có sẵn trong Thư viện!` })
        return
      }

      setIsSavingToLibrary(true)
      const newItem: IItem = {
        ...initItem,
        origin: lookupData.origin,
        catId: ECategory.WORD,
        level: 1,
        meanings: [
          {
            ...meaningItem,
            typeId: lookupData.typeId ?? EType.NOUN,
            definition: lookupData.definition || '',
            translation: lookupData.translation || '',
            note: lookupData.note || '',
            grammar: lookupData.grammar || '',
            pronunciation: {
              us: lookupData.phonetic || '',
              uk: '',
              common: lookupData.phonetic || '',
            },
          },
        ],
      }
      const createRes = await itemApi.createItem(newItem)

      if (createRes.isSuccess && createRes.content) {
        const createdItem = createRes.content
        await localDb.items.put(createdItem)
        invalidateSearchIndex()
        queryClient.invalidateQueries({ queryKey: itemKeys.lists() })

        setLookupData((prev) => (prev ? { ...prev, itemId: createdItem.id } : prev))
        message({
          type: 'success',
          content: `Đã thêm "${lookupData.origin}" vào Thư viện thành công!`,
        })
      } else {
        message({
          type: 'error',
          content: createRes.message || 'Không thể thêm vào Thư viện',
        })
      }
    } catch (err: any) {
      console.warn('Failed to add word to library:', err)
      message({ type: 'error', content: err?.message || 'Không thể thêm vào Thư viện' })
    } finally {
      setIsSavingToLibrary(false)
    }
  }, [lookupData, queryClient, message])

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
  }
}
