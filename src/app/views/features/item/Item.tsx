import { msgWarning } from '@/constant/index'
import { MoreOutlined, ReloadOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useDispatch, useSelector } from '@/core/hooks'
import { isDefect, getCategory } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { IItem, ECategory } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { commonApi } from '@/services/firebase/api/common.api'
import { initSearchFormItem } from '@/services/index'
import { itemAsync } from '@/store/async/item.async'
import { iotdAction } from '@/store/reducers/iotd.reducer'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { studySetAction } from '@/store/reducers/studySet.reducer'
import { Level } from '@/views/components/level/level'
import { Tags } from '@/views/components/tags/tags'
import { MenuProps, Skeleton, Popover, Dropdown, Button, theme, Flex } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getActionMenuItems } from './actionMenuItem'
import { MeaningItemView } from './itemMeaningView'
import styles from './style'
import clsx from 'clsx'
import { Reference } from '../references/references'
import { actionAsyncApp } from '@/store/async'
import { usePrompt } from '@/helpers/hooks'

interface IProps {
  groupAction?: boolean
  active?: boolean
  reload?: boolean
  data: IItem
  onDelete?: () => void
  onEdit?: () => void
  onView?: () => void
  onArchive?: () => void
}

export const Item: React.FC<IProps> = ({
  groupAction = true,
  active = false,
  reload = false,
  data,
  onDelete,
  onEdit,
  onView,
  onArchive,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const [, setSize] = useState<number>(8)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  const { openNotification } = usePrompt()

  const { viewMode } = useSelector((state) => state.config)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    switch (e.key) {
      case '0':
        if (onView) onView()
        break

      case '1':
        if (onEdit) onEdit()
        break

      case '2':
        onRedo(data)
        break

      case '3':
        onReset(data)
        break

      case '4':
        if (onDelete) onDelete()
        break

      case '5':
        archive(data)
        onArchive?.()
        break

      case '6':
        markItem(data?.id as number)
        break

      default:
        if (onView) onView()
        break
    }
  }

  const getActionMenus = (menus = getActionMenuItems(data)) => {
    if (!onView && !onEdit && !onDelete) return []
    return menus
      .map((menu) => {
        if (!onView && menu?.key === 0) return false
        if (!onEdit && menu?.key === 1) return false
        if (!onDelete && menu?.key === 4) return false
        return menu
      })
      .filter(Boolean) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(getActionMenuItems(data)),
    onClick: handleMenuClick,
  }

  const onSearch = (keyword: string) => {
    dispatch(settingAction.updateViewItemModal(false))
    dispatch(
      itemAction.updatePagination({
        page: defaultSetting.pagination.page,
        size: defaultSetting.pagination.size,
      }),
    )
    dispatch(
      itemAction.updateSearchFormValue({
        ...initSearchFormItem,
        keyword: keyword,
      }),
    )
    if (location.pathname.includes('library')) {
      dispatch(
        itemAsync.fetchItems({
          ...initSearchFormItem,
          keyword: keyword,
          page: defaultSetting.pagination.page,
          size: defaultSetting.pagination.size,
        }),
      )
    } else {
      navigate('/library')
    }
  }

  const onReset = (data: IItem) => {
    const now = new Date().getTime()
    const newData = {
      level: 0,
      practiceCount: 0,
      created_date: now,
      last_update: now,
    }
    itemApi.updateItem(data.id as number, { ...newData })
    dispatch(itemAction.update({ ...data, ...newData }))
    dispatch(studySetAction.update({ ...data, ...newData }))
    dispatch(iotdAction.update({ ...data, ...newData }))
    dispatch(settingAction.setCurrentItem({ ...data, ...newData }))
  }

  const onRedo = (data: IItem) => {
    const level = data.level === 5 ? 0 : 5
    itemApi.updateItem(data.id as number, { level })
    dispatch(itemAction.update({ ...data, level }))
    dispatch(studySetAction.update({ ...data, level }))
    dispatch(iotdAction.update({ ...data, level }))
    dispatch(settingAction.setCurrentItem({ ...data, level }))
  }

  const archive = (data: IItem) => {
    const archive = !data.archive
    itemApi.updateItem(data.id as number, { archive })
    dispatch(itemAction.update({ ...data, archive }))
    dispatch(studySetAction.update({ ...data, archive }))
    dispatch(iotdAction.update({ ...data, archive }))
    dispatch(settingAction.setCurrentItem({ ...data, archive }))
  }

  const markItem = async (id: number) => {
    const { isSuccess, content } = await commonApi.markIotd({
      isMarked: true,
      itemId: id,
      date: Date.now(),
    })

    if (isSuccess && content) {
      openNotification({
        type: 'success',
        message: 'Added to Marker!',
      })
    }
  }

  useEffect(() => {
    viewMode === EViewMode.LIST ? setSize(24) : setSize(8)
  }, [viewMode])

  return (
    <div
      className={clsx({
        [classes.item]: true,
        active: !!active,
      })}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={classes.contentItem}>
            <div className={classes.contentHead}>
              <div className={classes.title}>
                <h2 className={classes.original}>
                  {isDefect(data) && (
                    <span className={classes.warnTitle}>{data.original}</span>
                    // <Popover title={msgWarning.missingMeaning}>
                    // </Popover>
                  )}

                  {!isDefect(data) && <span>{data.original}</span>}
                </h2>

                <Flex align={'center'} gap={token.size / 4}>
                  {reload && (
                    <Button
                      size='small'
                      type={'text'}
                      icon={<ReloadOutlined style={{ color: token.colorWhite }} />}
                      onClick={async () => {
                        await dispatch(
                          actionAsyncApp.fetchIotd({
                            catId: data.catId as ECategory,
                            generate: true,
                          }),
                        )
                      }}
                    />
                  )}

                  {data.archive && (
                    <Button className={classes.btnInactive} size='small' type={'text'}>
                      A
                    </Button>
                  )}

                  {groupAction && (onView || onEdit || onDelete) && (
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
                          active: !!active,
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

              <Reference original={data.original} />

              {data.catId === ECategory.WORD && (
                <>
                  {data.word_family &&
                    data.word_family.filter((word) => word).length > 0 &&
                    data.word_family.length > 0 && (
                      <div className={classes.word_family}>
                        <Tags label={'Word Family'} tags={data.word_family} onSearch={onSearch} />
                      </div>
                    )}

                  {data.forms &&
                    data.forms.filter((word) => word).length > 0 &&
                    data.forms.length > 0 && (
                      <div className={classes.word_family}>
                        <Tags label={'Forms'} tags={data.forms} onSearch={onSearch} />
                      </div>
                    )}
                </>
              )}

              {data.relation &&
                data.relation.filter((word) => word).length > 0 &&
                data.relation.length > 0 && (
                  <div className={classes.word_family}>
                    <Tags label={'Relation'} tags={data.relation} onSearch={onSearch} />
                  </div>
                )}
            </div>

            {data.meanings &&
              data.meanings.length > 0 &&
              data.meanings.map((meaning, key) => (
                <MeaningItemView
                  active={active}
                  key={key}
                  meaning={meaning}
                  catId={data.catId as ECategory}
                />
              ))}
          </div>

          <div className={classes.date}>
            <span>{moment(data.created_date).format(defaultSetting.dateTimeFormat)}</span>
            <span>{moment(data.last_update).format(defaultSetting.dateTimeFormat)}</span>
          </div>
        </>
      )}
    </div>
  )
}
