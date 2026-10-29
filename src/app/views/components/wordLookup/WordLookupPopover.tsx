import React, { useState, useCallback, useEffect } from 'react'
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
    handleViewItem,
  } = useWordLookup(word, sentenceContext)

  // Close popover when the target word changes
  useEffect(() => {
    setOpen(false)
  }, [cleanWord])

  const handleOpenItem = useCallback(() => {
    setOpen(false)
    handleViewItem()
  }, [handleViewItem])

  const handleAddLibrary = useCallback(() => {
    setOpen(false)
    handleAddWordToLibrary()
  }, [handleAddWordToLibrary])

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

  const contentData = lookupData || { origin: cleanWord }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger='click'
      content={
        <WordLookupContent
          data={contentData}
          cleanWord={cleanWord}
          isLookingUpAi={isLookingUpAi}
          isSavingToLibrary={isSavingToLibrary}
          isPlayingAudio={isPlayingAudio}
          onPlayAudio={handlePlayAudio}
          onAiLookup={handleAiLookup}
          onAddToLibrary={handleAddLibrary}
          onViewItem={handleOpenItem}
        />
      }
      placement={placement}
    >
      {children}
    </Popover>
  )
}
