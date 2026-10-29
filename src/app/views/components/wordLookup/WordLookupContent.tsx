import React from 'react'
import { Button, Tag, theme } from 'antd'
import { SoundOutlined, SearchOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { IWordLookupContentProps } from './types'
import styles from './wordLookup.module.scss'
import appStyle from '@/style/appStyle.module.scss'

export const WordLookupContent: React.FC<IWordLookupContentProps> = ({
  data,
  isLookingUpAi = false,
  isSavingToLibrary = false,
  isPlayingAudio = false,
  onPlayAudio,
  onAiLookup,
  onAddToLibrary,
  onViewItem,
  className,
}) => {
  const { token } = theme.useToken()

  return (
    <div className={`${styles.popoverWordContent} ${appStyle.blog} ${className || ''}`}>
      {/* Word Header & Audio Pronunciation Button */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='font-bold text-base' style={{ color: token.colorPrimary }}>
            {data.origin}
          </span>
          {data.pos && (
            <Tag color='blue' style={{ fontSize: 11, padding: '0 4px' }}>
              {data.pos}
            </Tag>
          )}
        </div>
        <Button
          type='text'
          size='small'
          icon={<SoundOutlined spin={isPlayingAudio} />}
          onClick={onPlayAudio}
        />
      </div>

      {/* Phonetic Pronunciation */}
      {data.phonetic && (
        <div className='text-xs italic' style={{ color: token.colorTextSecondary }}>
          /{data.phonetic}/
        </div>
      )}

      {/* Translation & AI/Library Origin Tag */}
      {data.translation ? (
        <div className='flex flex-col gap-1'>
          <div
            className='text-sm flex items-center justify-between'
            style={{ color: token.colorText }}
          >
            <div dangerouslySetInnerHTML={{ __html: data.translation }} />
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          <span className='text-xs' style={{ color: token.colorTextSecondary }}>
            This item has no meaning.
          </span>
          <Button
            size='small'
            type='primary'
            icon={<SearchOutlined />}
            onClick={onAiLookup}
            loading={isLookingUpAi}
          >
            Tra nghĩa AI
          </Button>
        </div>
      )}

      {/* Definition */}
      {data.definition && (
        <div
          className='text-xs'
          style={{ color: token.colorTextSecondary, maxHeight: 60 }}
          dangerouslySetInnerHTML={{ __html: data.definition }}
        />
      )}

      {/* Grammar */}
      {data.grammar && (
        <div
          className='text-xs'
          style={{ color: token.colorTextSecondary, maxHeight: 60 }}
          dangerouslySetInnerHTML={{ __html: data.grammar }}
        />
      )}

      {/* Note */}
      {data.note && (
        <div
          className='text-xs italic'
          style={{ color: token.colorTextSecondary, maxHeight: 60 }}
          dangerouslySetInnerHTML={{ __html: data.note }}
        />
      )}

      {/* Add To Library / Already In Library Badge & View Item Button */}
      <div
        className='flex justify-between items-center'
        style={{
          border: data.itemId ? 'none' : `1px dashed ${token.colorBorderSecondary}`,
          width: '100%',
        }}
      >
        {data.itemId ? (
          <>
            <Tag color='success' style={{ fontSize: 11, margin: 0, padding: '2px 8px' }}>
              ✓ Đã có trong Thư viện
            </Tag>
            <Button
              size='small'
              type='primary'
              ghost
              icon={<EyeOutlined />}
              onClick={onViewItem}
              style={{ fontSize: 12 }}
            >
              View Item
            </Button>
          </>
        ) : (
          <Button
            size='small'
            type='text'
            icon={<PlusOutlined />}
            onClick={onAddToLibrary}
            loading={isSavingToLibrary}
            style={{ fontSize: 12, width: '100%' }}
          >
            Add to library
          </Button>
        )}
      </div>
    </div>
  )
}
