import {
  MoreOutlined,
  SoundOutlined,
  BookOutlined,
  PushpinOutlined,
  PushpinFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { ECategory, IExample } from '@/models/item.model'
import { MenuProps, Skeleton, Dropdown, Button, theme, Tag, message, Flex, Tooltip } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import { getActionMenuExample } from './ActionMenuItem'
import styles from './exampleItem.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'
import { speakSentence } from '@/helpers/mics'
import { getCategory } from '@/helpers/item'
import { useState } from 'react'

interface IProps {
  groupAction?: boolean
  active?: boolean
  data: IExample
  maskTranslation?: boolean
  isPinned?: boolean
  onTogglePin?: (id: string) => void
  onDelete?: () => void
  onEdit?: () => void
  onViewItem?: (itemId: string) => void
}

const cleanText = (html?: string): string => {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim()
}

const getCategoryColor = (catId?: number | ECategory) => {
  switch (catId) {
    case ECategory.WORD:
      return 'blue'
    case ECategory.PHRASE:
      return 'green'
    case ECategory.IDIOM:
      return 'purple'
    case ECategory.COLLOCATION:
      return 'orange'
    case ECategory.SLANG:
      return 'magenta'
    case ECategory.SENTENCE:
      return 'cyan'
    default:
      return 'geekblue'
  }
}

export const ExampleItem: React.FC<IProps> = ({
  groupAction = true,
  active = false,
  data,
  maskTranslation = false,
  isPinned = false,
  onTogglePin,
  onDelete,
  onEdit,
  onViewItem,
}) => {
  const { token } = theme.useToken()
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === '1') onEdit?.()
    if (e.key === '2') onDelete?.()
    if (e.key === '3') {
      const text = cleanText(data?.origin)
      if (text) {
        navigator.clipboard.writeText(text)
        message.success('Đã sao chép câu ví dụ')
      }
    }
    if (e.key === '4') {
      if (data?.itemId) onViewItem?.(data.itemId)
    }
    if (e.key === '6') {
      if (data?.id) onTogglePin?.(data.id)
    }
  }

  const getActionMenus = () => {
    const menus = getActionMenuExample(isPinned)
    return menus
      .map((menu) => {
        if (!onEdit && menu?.key === 1) return false
        if (!onDelete && menu?.key === 2) return false
        if (!data?.itemId && menu?.key === 4) return false
        if (!onTogglePin && menu?.key === 6) return false
        return menu
      })
      .filter(Boolean) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(),
    onClick: handleMenuClick,
  }

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = cleanText(data?.origin)
    if (!text) return

    speakSentence(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    })
  }

  const showTranslation = !maskTranslation || isRevealed

  return (
    <div
      className={clsx(appStyle.boxItem, styles.exampleCard, {
        [styles.active]: active,
        [styles.pinnedCard]: isPinned,
      })}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        flexDirection: 'column',
        gap: token.size * 0.45,
        paddingBottom: token.size * 0.6,
      }}
    >
      {!data && <Skeleton active paragraph={{ rows: 2 }} />}

      {data && (
        <>
          <div className={styles.title}>
            <h2 className={styles.origin} dangerouslySetInnerHTML={{ __html: data.origin }} />

            <Flex align='center' gap={2} style={{ flexShrink: 0 }}>
              {onTogglePin && (
                <Tooltip title={isPinned ? 'Bỏ ghim câu này' : 'Ghim câu ví dụ'}>
                  <Button
                    size='small'
                    type='text'
                    icon={
                      isPinned ? (
                        <PushpinFilled style={{ color: token.colorPrimary, fontSize: 15 }} />
                      ) : (
                        <PushpinOutlined style={{ fontSize: 15 }} />
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      if (data?.id) onTogglePin(data.id)
                    }}
                    className={styles.btnActions}
                  />
                </Tooltip>
              )}

              <Tooltip title={isSpeaking ? 'Đang phát âm...' : 'Nghe phát âm chuẩn'}>
                <Button
                  size='small'
                  type='text'
                  icon={
                    <SoundOutlined
                      className={isSpeaking ? styles.audioPlaying : undefined}
                      style={{ fontSize: 15 }}
                    />
                  }
                  onClick={handleSpeak}
                  className={styles.btnActions}
                />
              </Tooltip>

              {groupAction && (
                <Dropdown
                  placement='bottomRight'
                  menu={menuProps}
                  arrow={{ pointAtCenter: true }}
                  trigger={['click']}
                >
                  <Button
                    size='small'
                    type='text'
                    icon={<MoreOutlined style={{ fontSize: 15 }} />}
                    className={styles.btnActions}
                  />
                </Dropdown>
              )}
            </Flex>
          </div>

          {data.itemOrigin && (
            <div style={{ marginTop: -2, marginBottom: 2 }}>
              <Tooltip title={data.itemId && onViewItem ? 'Nhấp để xem chi tiết từ vựng này' : undefined}>
                <Tag
                  color={getCategoryColor(data.catId)}
                  style={{
                    cursor: data.itemId && onViewItem ? 'pointer' : 'default',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontWeight: 500,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => {
                    if (data.itemId) onViewItem?.(data.itemId)
                  }}
                >
                  <BookOutlined />
                  {data.catId !== undefined && getCategory(data.catId) !== 'All' && (
                    <span style={{ opacity: 0.85 }}>{getCategory(data.catId)}:</span>
                  )}
                  <span>{data.itemOrigin}</span>
                </Tag>
              </Tooltip>
            </div>
          )}

          {/* Translation with Active Recall Mask */}
          <div className={styles.maskWrapper}>
            {!showTranslation ? (
              <div
                className={styles.maskOverlay}
                onClick={() => setIsRevealed(true)}
                title='Nhấp để xem bản dịch'
              >
                <EyeInvisibleOutlined style={{ color: token.colorPrimary }} />
                <span>Nhấp để xem bản dịch</span>
              </div>
            ) : (
              <Flex align='flex-start' justify='space-between' gap={8}>
                <div
                  className={styles.translationText}
                  dangerouslySetInnerHTML={{ __html: data.translation }}
                />
                {maskTranslation && (
                  <Tooltip title='Ẩn lại bản dịch'>
                    <Button
                      type='text'
                      size='small'
                      icon={<EyeOutlined style={{ fontSize: 13, opacity: 0.55 }} />}
                      onClick={() => setIsRevealed(false)}
                      style={{ padding: '0 4px', height: 22 }}
                    />
                  </Tooltip>
                )}
              </Flex>
            )}
          </div>

          {/* Note Box */}
          {data.note && (
            <div className={styles.noteQuote}>
              <BulbOutlined style={{ color: '#faad14', marginTop: 2, flexShrink: 0 }} />
              <span>{data.note}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
