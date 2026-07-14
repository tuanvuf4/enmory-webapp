import { itemKeys, useDeleteItem, useDispatch, useSelector } from '@/core/hooks'
import { useItemModal, usePrompt } from '@/helpers/hooks'
import { getCategory, isDefect } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { ECategory, IItem } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { Level, Tags } from '@/views/components'
import { MoreOutlined, ReloadOutlined, HeartFilled } from '@ant-design/icons'
import { Button, Dropdown, Flex, MenuProps, Skeleton, theme } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import clsx from 'clsx'
import React, { useEffect, useState } from 'react'
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

interface IProps {
  action?: boolean
  active?: boolean
  reload?: boolean
  data: IItem
  onDeleteSuccess?: () => void
  onEditSuccess?: () => void
  onViewSuccess?: () => void
  onArchive?: () => void
  onFavorite?: () => void
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
  const { openMessage } = usePrompt()

  const dispatch = useDispatch()

  const { openItemModal } = useItemModal()

  const { mutate: mutateDeleteItem } = useDeleteItem()

  const { confirmDeleteModal, openNotification } = usePrompt()

  const { viewMode } = useSelector((state) => state.setting)

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (e.key) {
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

      default:
        if (onViewSuccess) onViewSuccess()
        break
    }
  }

  const getActionMenus = (menus = getActionMenuItem(data)) => {
    return menus
      .map((menu) => {
        if (!onViewSuccess && !action && menu?.key === 0) return false
        if (!onEditSuccess && !action && menu?.key === 1) return false
        if (!onDeleteSuccess && !action && menu?.key === 4) return false
        return menu
      })
      .filter(Boolean) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(getActionMenuItem(data)),
    onClick: handleMenuClick,
  }

  const onUpdateItemSuccess = async ({ isSuccess, content }: IHttpResponse<IItem>) => {
    if (isSuccess && content) {
      // update item in study set
      if (content && list.find((item) => item.id === content.id)) {
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
        onEditSuccess?.()
      }
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = (id: string) => {
    confirmDeleteModal({
      onOk: async () => {
        try {
          mutateDeleteItem(id, {
            onSuccess: () => {
              onDeleteSuccess?.()
              openNotification({ type: 'success', message: 'Item deleted successfully!' })
            },
          })
        } catch (error) {
          openNotification({ type: 'error', message: JSON.stringify(error) })
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
      created_date: now,
      last_update: now,
    })
    await onUpdateItemSuccess(response)
    openMessage({
      type: 'success',
      content: `Item has been reset successfully!`,
    })
  }

  const onRedo = async (data: IItem) => {
    const level = data.level === 5 ? 0 : 5
    const response = await itemApi.updateItem(data.id || '', { level })
    await onUpdateItemSuccess(response)
    openMessage({
      type: 'success',
      content: `Item has been set to level ${level} successfully!`,
    })
  }

  const archive = async (data: IItem) => {
    const archive = !data.archive
    const response = await itemApi.updateItem(data.id || '', { archive })
    await onUpdateItemSuccess(response)
    openMessage({
      type: 'success',
      content: `Item has been ${archive ? 'archived' : 'unarchived'} successfully!`,
    })
  }

  const favorite = async (data: IItem) => {
    const favorite = !data.favorite
    const response = await itemApi.updateItem(data.id || '', { favorite })
    await onUpdateItemSuccess(response)
    openMessage({
      type: 'success',
      content: `Item has been ${favorite ? 'added to' : 'removed from'} favorites successfully!`,
    })
  }

  const onRefetchIotd = async (catId: ECategory) => {
    setSpin(true)
    await dispatch(actionAsyncApp.fetchIotd({ catId, generate: true }))
    setSpin(false)
  }

  useEffect(() => {
    viewMode === EViewMode.LIST ? setSize(24) : setSize(8)
  }, [viewMode])

  return (
    <div
      className={clsx({
        [styles.item]: true,
      })}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={styles.contentItem}>
            <div className={styles.title}>
              <h2 className={styles.origin}>
                {isDefect(data) && <span className={styles.warnTitle}>{data.origin}</span>}
                {!isDefect(data) && <span>{data.origin}</span>}
              </h2>

              <Flex align={'center'} gap={token.size / 8}>
                {reload && (
                  <Button
                    size='small'
                    type={'text'}
                    icon={<ReloadOutlined style={{ color: token.colorWhite }} spin={spin} />}
                    onClick={() => {
                      onRefetchIotd(data.catId as ECategory)
                    }}
                  />
                )}

                {data.favorite && (
                  <Button
                    size='small'
                    type={'text'}
                    icon={<HeartFilled style={{ color: token.palette?.red?.[4] }} />}
                  />
                )}

                {data.archive && (
                  <Button className={styles.archive} size='small' variant={'text'} type={'text'}>
                    A
                  </Button>
                )}

                {action && (
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
                      className={clsx({
                        [styles.btnActions]: true,
                        [styles.active]: active,
                      })}
                    />
                  </Dropdown>
                )}
              </Flex>
            </div>

            {!!data.catId && (
              <h5 className={styles.kindOfWord}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: token.size / 2,
                  }}
                >
                  <span>{getCategory(data.catId)}</span>
                </div>

                {data.catId && (
                  <div className={styles.level}>
                    <Level level={data.level as number} />
                  </div>
                )}

                {data.user && (
                  <span
                    style={{
                      color: token.colorPrimary,
                      fontSize: token.fontSize,
                      marginLeft: token.size / 2,
                    }}
                  >
                    {data.user.firstName} {data.user.lastName}
                  </span>
                )}
              </h5>
            )}

            <Reference origin={data.origin} style={{}} />

            {data.catId === ECategory.WORD && (
              <>
                {data.forms &&
                  data.forms.filter((word) => word).length > 0 &&
                  data.forms.length > 0 && <Tags label={'Form'} tags={data.forms} />}

                {data.word_family &&
                  data.word_family.filter((word) => word).length > 0 &&
                  data.word_family.length > 0 && <Tags label={'Family'} tags={data.word_family} />}
              </>
            )}

            {data.relation &&
              data.relation.filter((word) => word).length > 0 &&
              data.relation.length > 0 && <Tags label={'Relation'} tags={data.relation} />}

            {data.meanings &&
              data.meanings.length > 0 &&
              data.meanings.map((meaning, key) => (
                <MeaningItem
                  key={key}
                  meaning={meaning}
                  catId={data.catId as ECategory}
                  origin={data.origin}
                />
              ))}
          </div>

          {/* <div className={styles.date}>
            <span>{moment(data.created_date).format(appSetting.dateTimeFormat)}</span>
            <span>{moment(data.last_update).format(appSetting.dateTimeFormat)}</span>
          </div> */}
        </>
      )}
    </div>
  )
}
