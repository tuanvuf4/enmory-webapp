import { isItemDue, getDueDurationText } from '@/services/srs/srs.service'
import {
  itemKeys,
  useDeleteItem,
  useDispatch,
  useSelector,
  useChecklist,
  checklistKeys,
} from '@/core/hooks'
import { localDb, invalidateSearchIndex } from '@/services/localDb'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { getCategory, isDefect } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { ECategory, IItem } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { Level, Tags } from '@/views/components'
import {
  MoreOutlined,
  ReloadOutlined,
  HeartFilled,
  HeartOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  SoundOutlined,
  WarningOutlined,
  CheckSquareFilled,
  CheckSquareOutlined,
  UserOutlined,
  DownOutlined,
  UpOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Flex, MenuProps, Skeleton, theme, Tag, Tooltip } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import clsx from 'clsx'
import React, { useEffect, useMemo, useState } from 'react'
import { Reference } from '../references/References'
import { getActionMenuItem } from './ActionMenuItem'
import { MeaningItem } from './MeaningItem'
import styles from './item.module.scss'
import { actionAsyncApp } from '@/store/asyncActions'
import { useQueryClient } from '@tanstack/react-query'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { IHttpResponse } from '@/models/http.model'
import { initItem } from '../modals'
import { speakWord } from '@/helpers/mics'

interface IProps {
  action?: boolean
  active?: boolean
  reload?: boolean
  data: IItem
  onDeleteSuccess?: () => void
  onEditSuccess?: (data?: IItem) => void
  onViewSuccess?: () => void
  onArchive?: () => void
  onFavorite?: () => void
}

const getCategoryColor = (catId?: ECategory): string => {
  switch (catId) {
    case ECategory.WORD:
      return 'blue'
    case ECategory.PHRASE:
      return 'purple'
    case ECategory.IDIOM:
      return 'volcano'
    case ECategory.COLLOCATION:
      return 'cyan'
    case ECategory.SLANG:
      return 'magenta'
    case ECategory.SENTENCE:
      return 'green'
    default:
      return 'default'
  }
}

export const Item: React.FC<IProps> = ({
  action = true,
  active = true,
  reload = false,
  data,
  onDeleteSuccess,
  onEditSuccess,
  onViewSuccess,
  onArchive,
  onFavorite,
}) => {
  const { token } = theme.useToken()

  const queryClient = useQueryClient()

  const { list } = useSelector((state) => state.studySet)

  const [, setSize] = useState<number>(8)
  const [spin, setSpin] = useState(false)

  const dispatch = useDispatch()

  const { openItemModal } = useItemModal()

  const { mutate: mutateDeleteItem } = useDeleteItem()

  const { confirm, notification, message } = usePrompt()
  const { isItemInChecklist, toggleChecklist } = useChecklist()
  const isInChecklist = isItemInChecklist(data?.id)

  const { viewMode } = useSelector((state) => state.setting)

  const [showAllMeanings, setShowAllMeanings] = useState(false)

  useEffect(() => {
    setShowAllMeanings(false)
  }, [data?.id])

  const { displayMeanings, hasMoreMeanings } = useMemo(() => {
    if (!data?.meanings || data.meanings.length === 0) {
      return { displayMeanings: [], hasMoreMeanings: false, hiddenCount: 0 }
    }

    // Only show enabled meanings in item
    const enabled = data.meanings.filter((m) => m.enable !== false)
    if (enabled.length === 0) {
      return { displayMeanings: [], hasMoreMeanings: false, hiddenCount: 0 }
    }

    // Prioritize common meanings (sort common meanings first)
    const sorted = [...enabled].sort((a, b) => (b.common ? 1 : 0) - (a.common ? 1 : 0))
    const common = sorted.filter((m) => Boolean(m.common))

    const hasCommon = common.length > 0
    const primary = hasCommon ? common : sorted
    const hidden = hasCommon ? sorted.length - common.length : 0

    return {
      displayMeanings: showAllMeanings ? sorted : primary,
      hasMoreMeanings: hidden > 0,
      hiddenCount: hidden,
    }
  }, [data?.meanings, showAllMeanings])

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (String(e.key)) {
      case '0':
        await onView(data.id || '')
        onViewSuccess?.()
        break

      case '1':
        await onEdit(data.id || '')
        onEditSuccess?.()
        break

      case '2':
        await onRedo(data)
        break

      case '3':
        await onReset(data)
        break

      case '4':
        onDelete(data.id || '')
        onDeleteSuccess?.()
        break

      case '5':
        await archive(data)
        onArchive?.()
        break

      case '6':
        // markItem(data?.id || '')
        break

      case '7':
        await favorite(data)
        onFavorite?.()
        break

      case '8': {
        try {
          const res = await toggleChecklist(data)
          notification({
            type: res.isSuccess ? 'success' : 'info',
            message: res.message,
          })
        } catch (error: any) {
          notification({
            type: 'error',
            message: error?.message || 'Failed to update checklist',
          })
        }
        break
      }

      default:
        if (onViewSuccess) onViewSuccess()
        break
    }
  }

  const getActionMenus = (menus = getActionMenuItem(data, isInChecklist)) => {
    return menus
      .map((menu) => {
        if (!menu) return false
        const key = 'key' in menu ? String(menu.key) : ''
        if (!onViewSuccess && !action && key === '0') return false
        if (!onEditSuccess && !action && key === '1') return false
        if (!onDeleteSuccess && !action && key === '4') return false
        return menu
      })
      .filter(Boolean) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(),
    onClick: handleMenuClick,
    style: {
      backgroundColor: token.colorBgElevated,
      border: `1px solid ${token.colorBorderSecondary}`,
      boxShadow: token.boxShadowSecondary,
    },
  }

  const onUpdateItemSuccess = async ({ isSuccess, content }: IHttpResponse<IItem>) => {
    if (isSuccess && content && content.id) {
      await localDb.items.put(content)
      invalidateSearchIndex()

      queryClient.setQueryData(itemKeys.detail(content.id), content)
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(content.id) })
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: checklistKeys.all })

      // update item in study set
      if (list.find((item) => item.id === content.id)) {
        dispatch(studySetAction.update(content))
      }
      // update iotd item
      dispatch(iotdAction.update(content))
      // update item in library
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
    }
  }

  const onEdit = async (id: string) => {
    try {
      const { isSuccess, content } = await itemApi.getItemById(id)
      if (isSuccess && content) {
        openItemModal('edit', content as IItem)
        onEditSuccess?.(content as IItem)
      }
    } catch (error) {
      notification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = (id: string) => {
    confirm({
      onOk: async () => {
        try {
          mutateDeleteItem(id, {
            onSuccess: () => {
              onDeleteSuccess?.()
              notification({ type: 'success', message: 'Item deleted successfully!' })
            },
          })
        } catch (error) {
          notification({ type: 'error', message: JSON.stringify(error) })
        }
      },
    })
  }

  const onView = async (id: string) => {
    const { isSuccess, content } = await itemApi.getItemById(id)
    if (isSuccess && content) {
      openItemModal('view', content)
    }
  }

  const onReset = async (data: IItem) => {
    const now = new Date().getTime()
    const response = await itemApi.updateItem(data.id || '', {
      ...initItem,
      origin: '*',
      created_date: now,
      last_update: now,
    })
    await onUpdateItemSuccess(response)
    message({
      type: 'success',
      content: `Item has been reset successfully!`,
    })
  }

  const onRedo = async (data: IItem) => {
    const level = data.level === 5 ? 0 : 5
    const response = await itemApi.updateItem(data.id || '', { level })
    await onUpdateItemSuccess(response)
    message({
      type: 'success',
      content: `Item has been set to level ${level} successfully!`,
    })
  }

  const archive = async (data: IItem) => {
    const archive = !data.archive
    const response = await itemApi.updateItem(data.id || '', { archive })
    await onUpdateItemSuccess(response)
    message({
      type: 'success',
      content: `Item has been ${archive ? 'archived' : 'unarchived'} successfully!`,
    })
  }

  const favorite = async (data: IItem) => {
    const favorite = !data.favorite
    const response = await itemApi.updateItem(data.id || '', { favorite })
    await onUpdateItemSuccess(response)
    message({
      type: 'success',
      content: `Item has been ${favorite ? 'added to' : 'removed from'} favorites successfully!`,
    })
  }

  const handleToggleChecklist = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await toggleChecklist(data)
      notification({
        type: res.isSuccess ? 'success' : 'info',
        message: res.message,
      })
    } catch (error: any) {
      notification({
        type: 'error',
        message: error?.message || 'Failed to update checklist',
      })
    }
  }

  const onRefetchIotd = async (catId: ECategory) => {
    setSpin(true)
    await dispatch(actionAsyncApp.fetchIotd({ catId, generate: true }))
    setSpin(false)
  }

  const handleTitleClick = () => {
    if (data?.id) {
      onView(data.id)
      onViewSuccess?.()
    }
  }

  const handleQuickSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()
    speakWord(data.origin)
  }

  const [isCopied, setIsCopied] = useState(false)

  const handleCopyOrigin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!data?.origin) return
    const textToCopy = data.origin.trim()
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setIsCopied(true)
          message({ type: 'success', content: `Đã sao chép "${textToCopy}"!` })
          setTimeout(() => setIsCopied(false), 2000)
        })
        .catch(() => {
          message({ type: 'error', content: 'Không thể sao chép vào clipboard!' })
        })
    } else {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        message({ type: 'success', content: `Đã sao chép "${textToCopy}"!` })
        setTimeout(() => setIsCopied(false), 2000)
      } catch {
        message({ type: 'error', content: 'Không thể sao chép vào clipboard!' })
      }
    }
  }

  useEffect(() => {
    viewMode === EViewMode.LIST ? setSize(24) : setSize(8)
  }, [viewMode])

  return (
    <div className={styles.item}>
      {!data && <Skeleton active />}

      {data && (
        <Flex gap={token.size / 2} vertical>
          {/* Header row: Title + Quick Sound + Defect Badge + Action buttons */}
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <h2
                className={clsx(styles.originTitle, isDefect(data) && styles.originTitleDefect)}
                onClick={handleTitleClick}
              >
                {data.origin}
              </h2>

              <Tooltip title={isCopied ? 'Đã sao chép' : 'Sao chép từ'}>
                <button
                  type='button'
                  className={clsx(styles.titleCopyBtn, isCopied && styles.titleCopyBtnCopied)}
                  onClick={handleCopyOrigin}
                  aria-label='Sao chép'
                >
                  {isCopied ? <CheckOutlined /> : <CopyOutlined />}
                </button>
              </Tooltip>

              <Tooltip title='Phát âm'>
                <button
                  type='button'
                  className={styles.titleAudioBtn}
                  onClick={handleQuickSpeak}
                  aria-label='Phát âm'
                >
                  <SoundOutlined />
                </button>
              </Tooltip>

              {isDefect(data) && (
                <Tooltip title='This item does not yet have a complete definition or translation.'>
                  <WarningOutlined className={styles.defectIcon} />
                </Tooltip>
              )}
            </div>

            <div className={styles.headerActions}>
              {reload && (
                <Button
                  type='text'
                  size='small'
                  icon={<ReloadOutlined spin={spin} />}
                  onClick={() => onRefetchIotd(data.catId as ECategory)}
                />
              )}

              {action && (
                <>
                  <Button
                    type='text'
                    size='small'
                    icon={
                      isInChecklist ? (
                        <CheckSquareFilled style={{ color: '#52c41a' }} />
                      ) : (
                        <CheckSquareOutlined className={styles.headerActionDim} />
                      )
                    }
                    onClick={handleToggleChecklist}
                  />

                  <Button
                    type='text'
                    size='small'
                    icon={
                      data.favorite ? (
                        <HeartFilled className={styles.favoriteActive} />
                      ) : (
                        <HeartOutlined className={styles.headerActionDim} />
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      favorite(data)
                      onFavorite?.()
                    }}
                  />

                  {data.archive && (
                    <Button
                      type='text'
                      size='small'
                      icon={<BookOutlined className={styles.archiveActive} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        archive(data)
                        onArchive?.()
                      }}
                    />
                  )}

                  <Dropdown
                    placement='bottomRight'
                    menu={menuProps}
                    arrow={{ pointAtCenter: true }}
                    trigger={['click']}
                  >
                    <Button
                      size='small'
                      type='text'
                      icon={<MoreOutlined />}
                      className={clsx(styles.btnMore, active && styles.active)}
                    />
                  </Dropdown>
                </>
              )}
            </div>
          </div>

          {/* Metadata Row: Category Tag + Level Stars + SRS Status Badge + Author */}
          {!!data.catId && (
            <div className={styles.metaRow}>
              <div className={styles.metaLeft}>
                <Tag color={getCategoryColor(data.catId)} className={styles.categoryBadge}>
                  {getCategory(data.catId)}
                </Tag>

                <Tooltip title={`Level: ${data.level || 0}/5`}>
                  <div className={styles.levelWrapper}>
                    <Level level={data.level as number} size={13} />
                  </div>
                </Tooltip>

                {data.archive ? (
                  <Tag icon={<BookOutlined />} className={styles.archiveTag}>
                    Archived
                  </Tag>
                ) : isItemDue(data) ? (
                  <Tooltip title={`Đã đến hạn ôn tập SRS (${getDueDurationText(data)})`}>
                    <Tag color='warning' icon={<ClockCircleOutlined />} className={styles.dueTag}>
                      {getDueDurationText(data)}
                    </Tag>
                  </Tooltip>
                ) : !!data.next_review_date ? (
                  <Tooltip title={`Chu kỳ ôn tập tiếp theo: ${getDueDurationText(data)}`}>
                    <Tag icon={<FieldTimeOutlined />} className={styles.scheduledTag}>
                      {getDueDurationText(data)}
                    </Tag>
                  </Tooltip>
                ) : null}
              </div>

              {data.user && (
                <div className={styles.authorBadge} title={data.user.email}>
                  <UserOutlined style={{ fontSize: 11 }} />
                  <span>{data.user.firstName}</span>
                </div>
              )}
            </div>
          )}

          {/* Reference dictionary links */}
          <Reference origin={data.origin} />

          {/* Tags */}
          {data.tags && data.tags.filter(Boolean).length > 0 && (
            <Tags label={'Tags'} tags={data.tags} searchBy={'tags'} />
          )}

          {/* Category-specific Tags: Form, Family, Relation */}
          {data.catId === ECategory.WORD && (
            <>
              {data.forms && data.forms.filter(Boolean).length > 0 && (
                <Tags label={'Form'} tags={data.forms} />
              )}

              {data.word_family && data.word_family.filter(Boolean).length > 0 && (
                <Tags label={'Family'} tags={data.word_family} />
              )}
            </>
          )}

          {data.relation && data.relation.filter(Boolean).length > 0 && (
            <Tags label={'Relation'} tags={data.relation} />
          )}

          {/* Meanings */}
          {displayMeanings &&
            displayMeanings.length > 0 &&
            displayMeanings.map((meaning, key) => (
              <MeaningItem
                key={meaning.id || key}
                meaning={meaning}
                catId={data.catId as ECategory}
                origin={data.origin}
              />
            ))}

          {/* Show / Hide more meanings */}
          {hasMoreMeanings && (
            <Button
              type='dashed'
              size='small'
              icon={showAllMeanings ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setShowAllMeanings((prev) => !prev)}
              className={styles.toggleMeaningsBtn}
            >
              {showAllMeanings ? 'Collapse' : 'Expand'}
            </Button>
          )}
        </Flex>
      )}
    </div>
  )
}
