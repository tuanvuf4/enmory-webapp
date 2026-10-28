import React from 'react'
import type { TooltipPlacement } from 'antd/es/tooltip'

export interface IWordLookupData {
  origin: string
  translation?: string
  definition?: string
  phonetic?: string
  pos?: string
  typeId?: number
  itemId?: string
  fromAi?: boolean
  note?: string
  grammar?: string
}

export interface IWordLookupPopoverProps {
  word: string
  sentenceContext?: string
  children: React.ReactElement
  disabled?: boolean
  placement?: TooltipPlacement
}

export interface IWordLookupContentProps {
  data: IWordLookupData
  cleanWord: string
  isLookingUpAi?: boolean
  isSavingToLibrary?: boolean
  isPlayingAudio?: boolean
  onPlayAudio?: () => void
  onAiLookup?: () => void
  onAddToLibrary?: () => void
  className?: string
}
