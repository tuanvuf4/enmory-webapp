import globalStyle, { appStyleConfig } from '@/style/appStyle'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { transformItemModelToClient, isDefect, getCategory, getTypeOfItem } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { ECategory, EType } from '@/models/item.model'
import { itemApi } from '@/services/api'
import { itemAsync } from '@/store/async/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { AlertDefectItem } from '@/views/features/alertDefectItem/alertDefectItem'
import { Toolbar } from '@/views/features/toolbar/toolbar'
import { theme, Row, Col, Button } from 'antd'
import { useEffect } from 'react'
import styles from './style'
import iStyles from '@/app/views/features/item/style'
import { useAppDispatch, useAppSelector } from '@/core/hooks'
import { Pagination } from '@/views/components/pagination/pagination'
import { Item } from '@/views/features/item/Item'
import { Reference } from '@/views/features/references/references'
import { usePrompt } from '@/helpers/hooks'

export const Library: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()
  const itemStyles = iStyles()

  const { viewMode } = useAppSelector((state) => state.config)

  const { confirmDeleteModal, openNotification } = usePrompt()

  const { listItem, pagination, formSearchValue } = useAppSelector((state) => state.items)

  const dispatch = useAppDispatch()

  const onDelete = (id: number) => {
    confirmDeleteModal({
      onOk: () => {
        itemApi.deleteItem(id).then(() => {
          dispatch(itemAction.removeItem(id))
        })
      },
    })
  }

  const onEdit = async (id: number) => {
    try {
      const { content } = await itemApi.getItemById(id)
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(content),
        }),
      )
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onView = async (id: number) => {
    const { isSuccess, content: item } = await itemApi.getItemById(id)
    if (isSuccess) {
      dispatch(settingAction.toggleViewItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(item),
        }),
      )
    }
  }

  useEffect(() => {
    dispatch(
      itemAsync.fetchItems({
        keyword: formSearchValue.keyword || '',
        cat: ECategory.ALL,
        type: EType.ALL,
        defect: false,
        archive: false,
        page: pagination.page,
        size: pagination.size,
        order: 'DESC',
        orderBy: 'created_date',
      }),
    )
  }, [])

  return (
    <>
      <div className={gClasses.stickyBar}>
        <div className={gClasses.container}>
          <Toolbar
            pagination={
              <Pagination
                {...pagination}
                onPageChange={(data) => {
                  dispatch(itemAction.updatePagination(data))
                  dispatch(itemAsync.fetchItems({ ...formSearchValue, ...data }))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            }
          />
        </div>
      </div>

      <div className={gClasses.container}>
        {viewMode === EViewMode.GRID && listItem.length > 0 && (
          <div className={classes.items}>
            <Row gutter={[token.size, token.size * 2]}>
              {listItem.length > 0 &&
                listItem.map((item, idx) => {
                  return (
                    <Col xs={24} sm={12} md={12} lg={6} key={idx}>
                      <Item
                        type='brief'
                        data={item}
                        onEdit={() => onEdit(item.id || -1)}
                        onDelete={() => onDelete(item.id || -1)}
                        onView={() => onView(item.id || -1)}
                      />
                    </Col>
                  )
                })}
            </Row>
          </div>
        )}

        {viewMode === EViewMode.LIST && listItem.length > 0 && (
          <div className={classes.itemTable}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Pronunciation</th>
                  <th>Definition</th>
                  <th>Translation</th>
                  <th>References</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {listItem.length > 0 &&
                  listItem.map((item, index) => {
                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>

                        <td>
                          {item.original}
                          {isDefect(item) && <AlertDefectItem item={item} />}
                        </td>

                        <th>
                          {item.archive && (
                            <Button className={classes.btnInactive} size='small'>
                              disable
                            </Button>
                          )}

                          {!item.archive && (
                            <Button type='default' size='small' className={classes.btnActive}>
                              enable
                            </Button>
                          )}
                        </th>

                        <td>{getCategory(item.catId as ECategory)}</td>

                        {item.meanings.length > 0 && (
                          <>
                            {item.catId !== ECategory.WORD && <td></td>}

                            {item.catId === ECategory.WORD && (
                              <td>{getTypeOfItem(item.meanings[0].typeId)}</td>
                            )}

                            <td>
                              {item.catId === ECategory.WORD && (
                                <div className={itemStyles.pronouns}>
                                  <div className={itemStyles.audio}>
                                    <span className={itemStyles.accent}>UK:</span>
                                    {item.meanings[0].pronunciation?.uk || ''}
                                  </div>

                                  <div className={itemStyles.audio}>
                                    <span className={itemStyles.accent}>US:</span>
                                    {item.meanings[0].pronunciation?.us || ''}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td>{item.meanings[0].definition}</td>

                            <td>{item.meanings[0].translation}</td>
                          </>
                        )}

                        {item.meanings.length === 0 && (
                          <>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </>
                        )}

                        <td>
                          <Reference original={item.original} />
                        </td>

                        <td>
                          <div className={classes.btnActions}>
                            <Button
                              type='text'
                              style={{ color: token.colorPrimary }}
                              icon={<EyeOutlined />}
                              onClick={() => onView(item.id || -1)}
                            />

                            <Button
                              type='text'
                              style={{ color: appStyleConfig.color.yellow[6] }}
                              icon={<EditOutlined />}
                              onClick={() => onEdit(item.id || -1)}
                            />

                            <Button
                              type='text'
                              style={{ color: appStyleConfig.color.red[5] }}
                              icon={<DeleteOutlined />}
                              onClick={() => onDelete(item.id || -1)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        {listItem.length === 0 && (
          <div className={classes.items}>
            <h2>No record! </h2>
          </div>
        )}
      </div>
    </>
  )
}

export default Library
