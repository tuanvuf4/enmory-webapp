import { msgWarning } from '@/constant/index'
import { MoreOutlined, EyeOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppDispatch, useAppSelector } from '@/core/hooks'
import { isDefect, getCategory } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { TItem, IItem, ECategory } from '@/models/item.model'
import { itemApi } from '@/services/api'
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
import { actionMenuItems } from './actionMenuItem'
import { MeaningItemView } from './itemMeaningView'
import styles from './style'
import clsx from 'clsx'
import { Reference } from '../references/references'

interface IProps {
  groupAction?: boolean
  active?: boolean
  type: TItem
  data: IItem
  onDelete?: () => void
  onEdit?: () => void
  onView?: () => void
}

export const Item: React.FC<IProps> = ({
  groupAction = true,
  active = false,
  type = 'brief',
  data,
  onDelete,
  onEdit,
  onView,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const [, setSize] = useState<number>(8)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const { viewMode } = useAppSelector((state) => state.config)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    switch (e.key) {
      case '0':
        if (onView) onView()
        break

      case '1':
        if (onEdit) onEdit()
        break

      case '2':
        onRelearn(data)
        break

      case '3':
        onReset(data)
        break

      case '4':
        if (onDelete) onDelete()
        break

      default:
        if (onView) onView()
        break
    }
  }

  const getActionMenus = (menus = actionMenuItems) => {
    if (!onView && !onEdit && !onDelete) return []
    return menus
      .map((menu) => {
        if (!onView && menu?.key === 0) return false
        if (!onEdit && menu?.key === 1) return false
        if (!onDelete && menu?.key === 4) return false
        return menu
      })
      .filter((menu) => menu) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(actionMenuItems),
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
    itemApi.updateItem(data.id as number, {
      level: 0,
      practiceCount: 0,
      created_date: now,
      last_update: now,
    })
    dispatch(
      itemAction.update({
        ...data,
        level: 0,
        practiceCount: 0,
        created_date: now,
        last_update: now,
      }),
    )
    dispatch(
      studySetAction.update({
        ...data,
        level: 0,
        practiceCount: 0,
        created_date: now,
        last_update: now,
      }),
    )
    dispatch(
      iotdAction.update({
        ...data,
        level: 0,
        practiceCount: 0,
        created_date: now,
        last_update: now,
      }),
    )
  }

  const onRelearn = (data: IItem) => {
    itemApi.updateItem(data.id as number, { level: 0 })
    dispatch(itemAction.update({ ...data, level: 0 }))
    dispatch(studySetAction.update({ ...data, level: 0 }))
    dispatch(iotdAction.update({ ...data, level: 0 }))
  }

  useEffect(() => {
    viewMode === EViewMode.LIST ? setSize(24) : setSize(8)
  }, [viewMode])

  return (
    <div
      className={clsx({
        [classes.item]: true,
        active: !active && type === 'full' ? true : false,
      })}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={classes.contentItem}>
            <div className={classes.contentHead}>
              <div className={classes.title}>
                <h2 className={classes.original}>
                  {type === 'brief' && !isDefect(data) && <span>{data.original}</span>}

                  {type === 'brief' && isDefect(data) && (
                    <Popover title={msgWarning.missingMeaning}>
                      <span className={classes.warnTitle}>{data.original}</span>
                    </Popover>
                  )}

                  {type === 'full' && <span>{data.original}</span>}
                </h2>

                <Flex align={'center'} gap={token.size / 4}>
                  {data.archive && (
                    <Button className={classes.btnInactive} size='small'>
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
                        className={classes.btnActions}
                      />
                    </Dropdown>
                  )}
                </Flex>
              </div>
              {/* 
              {data.archive && (
                <Button className={classes.btnInactive} size='small'>
                  Archived
                </Button>
              )} */}

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
                    {type === 'brief' && (
                      <Button
                        className={classes.quickView}
                        type='text'
                        size='small'
                        icon={<EyeOutlined />}
                        onClick={onView}
                      />
                    )}

                    <span>{getCategory(data.catId)}</span>
                  </div>

                  {data.user && (
                    <span>
                      Added by:
                      <span
                        style={{
                          color: token.colorPrimary,
                          fontSize: token.fontSize,
                          marginLeft: token.size / 2,
                        }}
                      >
                        {data.user.username}
                      </span>
                    </span>
                  )}
                </h5>
              )}

              {data.catId && (
                <h5 className={classes.level}>
                  <Level level={data.level as number} />
                </h5>
              )}

              <Reference original={data.original} />

              {data.catId === ECategory.WORD && (
                <>
                  {/* {data.collocations &&
                  data.collocations.filter((item) => item).length > 0 &&
                  data.collocations.length > 0 && (
                    <Tags label={'Collocations'} tags={data.collocations} onSearch={onSearch} />
                  )} */}

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

            {type === 'brief' && data.meanings.length > 0 && (
              <MeaningItemView
                type={type}
                meaning={data.meanings.find((item) => item.common) || data.meanings[0]}
                catId={data.catId as ECategory}
              />
            )}

            {type === 'full' &&
              data.meanings.length > 0 &&
              data.meanings.map((meaning, key) => {
                return (
                  <MeaningItemView
                    key={key}
                    type={type}
                    meaning={meaning}
                    catId={data.catId as ECategory}
                  />
                )
              })}
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
