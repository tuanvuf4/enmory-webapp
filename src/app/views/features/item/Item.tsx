import { setting } from '@/config/appConfig'
import { useDeleteItem, useDispatch, useSelector } from '@/core/hooks'
import { usePrompt } from '@/helpers/hooks'
import { getCategory, isDefect } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { ECategory, IItem } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { Level, Tags } from '@/views/components'
import { MoreOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Dropdown, Flex, MenuProps, Skeleton, theme } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import clsx from 'clsx'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Reference } from '../references/References'
import { getActionMenuItems } from './ActionMenuItem'
import { MeaningItem } from './MeaningItem'
import styles from './style'
import { useItemForm } from '@/helpers/hooks/useItemForm'
import { actionAsyncApp } from '@/store/asyncActions'

interface IProps {
  action?: boolean
  active?: boolean
  reload?: boolean
  data: IItem
  onDeleteSuccess?: () => void
  onEditSuccess?: () => void
  onViewSuccess?: () => void
  onArchive?: () => void
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
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const [, setSize] = useState<number>(8)
  const [spin, setSpin] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const { openItemForm, openViewItemForm } = useItemForm()
  const { mutate: mutateDeleteItem } = useDeleteItem()

  const { confirmDeleteModal, openNotification } = usePrompt()

  const { viewMode } = useSelector((state) => state.setting)

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    switch (e.key) {
      case '0':
        onView(data.id || '')
        break

      case '1':
        onEdit(data.id || '')
        break

      case '2':
        await onRedo(data)
        break

      case '3':
        await onReset(data)
        break

      case '4':
        onDelete(data.id || '')
        break

      case '5':
        await archive(data)
        onArchive?.()
        break

      case '6':
        // markItem(data?.id || '')
        break

      default:
        if (onViewSuccess) onViewSuccess()
        break
    }
  }

  const getActionMenus = (menus = getActionMenuItems(data)) => {
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
    items: getActionMenus(getActionMenuItems(data)),
    onClick: handleMenuClick,
  }

  const onEdit = async (id: string) => {
    try {
      const { content } = await itemApi.getItemById(id)
      openItemForm('edit', content as IItem)
      onEditSuccess?.()
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
      openViewItemForm(content)
    }
  }

  const onSearch = (keyword: string) => {
    // Navigate to library with search params
    const params = new URLSearchParams()
    params.set('keyword', keyword)
    params.set('page', '0')
    params.set('size', setting.pagination.size.toString())

    if (location.pathname.includes('library')) {
      navigate(`/library?${params.toString()}`)
    } else {
      navigate(`/library?${params.toString()}`)
    }
  }

  const onReset = async (data: IItem) => {
    const now = new Date().getTime()
    const newData = {
      level: 0,
      practiceCount: 0,
      created_date: now,
      last_update: now,
    }
    await itemApi.updateItem(data.id || '', { ...newData })
  }

  const onRedo = async (data: IItem) => {
    const level = data.level === 5 ? 0 : 5
    await itemApi.updateItem(data.id || '', { level })
  }

  const archive = async (data: IItem) => {
    const archive = !data.archive
    await itemApi.updateItem(data.id || '', { archive })
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
        [classes.item]: true,
        active: active,
      })}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={classes.contentItem}>
            <div className={classes.contentHead}>
              <div className={classes.title}>
                <h2 className={classes.origin}>
                  {isDefect(data) && <span className={classes.warnTitle}>{data.origin}</span>}

                  {!isDefect(data) && <span>{data.origin}</span>}
                </h2>

                <Flex align={'center'} gap={token.size / 4}>
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

                  {data.archive && (
                    <Button className={classes.btnInactive} size='small' type={'text'}>
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
                        size='middle'
                        type='text'
                        icon={<MoreOutlined />}
                        className={clsx({
                          [classes.btnActions]: true,
                          active: active,
                        })}
                      />
                    </Dropdown>
                  )}
                </Flex>
              </div>

              {data.catId && (
                <h5 className={classes.kindOfWord}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: token.size / 2,
                    }}
                  >
                    {/* {type === 'brief' && (
                      <Button
                        className={classes.quickView}
                        type='text'
                        size='small'
                        icon={<EyeOutlined />}
                        onClick={onView}
                      />
                    )} */}

                    <span>{getCategory(data.catId)}</span>
                  </div>

                  {data.catId && (
                    <div className={classes.level}>
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
                      {data.user.username}
                    </span>
                  )}
                </h5>
              )}

              <Reference origin={data.origin} />

              {data.catId === ECategory.WORD && (
                <>
                  {data.forms &&
                    data.forms.filter((word) => word).length > 0 &&
                    data.forms.length > 0 && (
                      <div className={classes.word_family}>
                        <Tags
                          label={'Form'}
                          tags={data.forms}
                          onSearch={onSearch}
                          active={active}
                        />
                      </div>
                    )}

                  {data.word_family &&
                    data.word_family.filter((word) => word).length > 0 &&
                    data.word_family.length > 0 && (
                      <div className={classes.word_family}>
                        <Tags
                          label={'Family'}
                          tags={data.word_family}
                          onSearch={onSearch}
                          active={active}
                        />
                      </div>
                    )}
                </>
              )}

              {data.relation &&
                data.relation.filter((word) => word).length > 0 &&
                data.relation.length > 0 && (
                  <div className={classes.word_family}>
                    <Tags
                      label={'Relation'}
                      tags={data.relation}
                      onSearch={onSearch}
                      active={active}
                    />
                  </div>
                )}
            </div>

            {data.meanings &&
              data.meanings.length > 0 &&
              data.meanings.map((meaning, key) => (
                <MeaningItem
                  active={active}
                  key={key}
                  meaning={meaning}
                  catId={data.catId as ECategory}
                />
              ))}
          </div>

          <div className={classes.date}>
            <span>{moment(data.created_date).format(setting.dateTimeFormat)}</span>
            <span>{moment(data.last_update).format(setting.dateTimeFormat)}</span>
          </div>
        </>
      )}
    </div>
  )
}
