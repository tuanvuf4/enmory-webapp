import React, { useMemo } from 'react'
import { IMediaForm, ITracks } from '@/models/media.model'
import { IClassifiedVocabItem } from '@/models/vocabClassification.model'
import { useDispatch } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { tracksApi } from '@/services/firebase/api/tracks.api'
import { usePrompt } from '@/helpers/hooks'
import { findMatchingSegment } from '@/services/gemini/geminiVocabClassifier.service'
import { parseTranscript } from './transcriptUtils'
import {
  VocabClassificationTabs,
  CEFR_LEVEL_COLORS,
  LEVEL_DESCRIPTIONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '@/views/features/vocabClassification'

export { CEFR_LEVEL_COLORS, LEVEL_DESCRIPTIONS, CATEGORY_COLORS, CATEGORY_LABELS }

export interface ITranscriptVocabTabsProps {
  track: IMediaForm | null
  transcript: string
}

export const TranscriptVocabTabs: React.FC<ITranscriptVocabTabsProps> = ({ track, transcript }) => {
  const { message } = usePrompt()
  const dispatch = useDispatch()

  // Parse transcript segments for timestamp seeking
  const segments = useMemo(
    () => parseTranscript(transcript || '', track?.translation || ''),
    [transcript, track?.translation],
  )

  // Seek audio to where the phrase appears in the transcript
  const handleSeekToAudio = (item: IClassifiedVocabItem) => {
    if (!segments || segments.length === 0) return

    const matchedSeg = findMatchingSegment(item.text, item.context || '', segments)

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
      message({
        type: 'warning',
        content: `Không tìm thấy mốc thời gian chính xác cho "${item.text}"`,
      })
    }
  }

  // Persist classification data to Redux and Firestore
  const handleSave = async (items: IClassifiedVocabItem[]) => {
    if (track?.id) {
      dispatch(
        listeningAction.updateTrack({
          ...track,
          vocabClassification: items,
        } as ITracks),
      )

      try {
        await tracksApi.updateTrack(String(track.id), {
          vocabClassification: items,
        } as any)
      } catch (updateErr) {
        console.warn('[TranscriptVocabTabs] Firestore updateTrack failed:', updateErr)
      }
    }
  }

  if (!track) {
    return null
  }

  return (
    <VocabClassificationTabs
      contentId={track.id}
      content={transcript}
      contentType='transcript'
      title={track.title}
      translation={track.translation}
      initialItems={track.vocabClassification}
      onSave={handleSave}
      onSeekAudio={segments.length > 0 ? handleSeekToAudio : undefined}
    />
  )
}

export default TranscriptVocabTabs
