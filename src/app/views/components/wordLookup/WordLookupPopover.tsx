import React, { useState, useCallback } from 'react'
import { Popover } from 'antd'
import { IWordLookupPopoverProps } from './types'
import { useWordLookup } from './useWordLookup'
import { WordLookupContent } from './WordLookupContent'

export const WordLookupPopover: React.FC<IWordLookupPopoverProps> = ({
  word,
  sentenceContext,
  children,
  disabled = false,
  placement = 'top',
}) => {
  const [open, setOpen] = useState(false)
  const {
    cleanWord,
    lookupData,
    isLookingUpAi,
    isSavingToLibrary,
    isPlayingAudio,
    performLookup,
    handlePlayAudio,
    handleAiLookup,
    handleAddWordToLibrary,
  } = useWordLookup(word, sentenceContext)

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (disabled) return
      setOpen(newOpen)
      if (newOpen) {
        performLookup()
      }
    },
    [disabled, performLookup],
  )

  if (disabled || !cleanWord) {
    return children
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger='click'
      content={
        lookupData ? (
          <WordLookupContent
            data={lookupData}
            cleanWord={cleanWord}
            isLookingUpAi={isLookingUpAi}
            isSavingToLibrary={isSavingToLibrary}
            isPlayingAudio={isPlayingAudio}
            onPlayAudio={handlePlayAudio}
            onAiLookup={handleAiLookup}
            onAddToLibrary={handleAddWordToLibrary}
          />
        ) : null
      }
      placement={placement}
    >
      {children}
    </Popover>
  )
}

