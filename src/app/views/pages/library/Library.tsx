import globalStyle, { styleConfig } from '@/style/appStyle'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { isDefect, getCategory, getTypeOfItem } from '@/helpers/item'
import { EViewMode } from '@/models/app.model'
import { ECategory, EType, IItem } from '@/models/item.model'
import { itemApi } from '@/services/firebase/api/item.api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { AlertDefectItem } from '@/views/features/alertDefectItem/AlertDefectItem'
import { Toolbar } from '@/views/features/toolbar/Toolbar'
import { theme, Row, Col, Button, App } from 'antd'
import { useEffect } from 'react'
import styles from './style'
import iStyles from '@/app/views/features/item/style'
import { useDispatch, useSelector } from '@/core/hooks'
import { Pagination } from '@/views/components'
import { Item } from '@/views/features/item/Item'
import { Reference } from '@/views/features/references/References'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { useSearchParams } from 'react-router-dom'
import { IFormSearchItem } from '@/models/formSearch.model'
import { setting } from '@/config/appConfig'
import { useItems, useDeleteItem } from '@/core/hooks/useItems'
import { useModal } from '@/context/modal.context'

export const Library: React.FC = () => {
  const { token } = theme.useToken()

  const { showModal, hideModal, updateModal } = useModal()

  const classes = styles()
  const globalClasses = globalStyle()
  const itemStyles = iStyles()

  const { viewMode } = useSelector((state) => state.config)

  const { confirmDeleteModal, openNotification } = usePrompt()

  const [searchParams, setSearchParams] = useSearchParams()

  // Read pagination from URL params
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 0
  const size = searchParams.get('size') ? Number(searchParams.get('size')) : 20

  // Read form search values from URL params
  const formSearchValue: IFormSearchItem = {
    keyword: searchParams.get('keyword') || '',
    cat: searchParams.get('cat') ? Number(searchParams.get('cat')) : ECategory.ALL,
    type: searchParams.get('type') ? Number(searchParams.get('type')) : EType.ALL,
    defect: searchParams.get('defect') === 'true',
    archive: searchParams.get('archive') === 'true',
    order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
    orderBy: (searchParams.get('orderBy') as 'created_date' | 'last_update') || 'created_date',
  }

  const dispatch = useDispatch()

  // Use React Query hooks
  const { data, isLoading, error } = useItems({
    ...formSearchValue,
    page,
    size,
  })

  const deleteMutation = useDeleteItem()

  const listItem = data?.content || []
  const pagination = data?.paging || setting.pagination

  const onDelete = (id: string) => {
    confirmDeleteModal({
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(id)
          openNotification({ type: 'success', message: 'Item deleted successfully!' })
        } catch (error) {
          openNotification({ type: 'error', message: JSON.stringify(error) })
        }
      },
    })
  }

  const onEdit = async (id: string) => {
    try {
      const { content } = await itemApi.getItemById(id)
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...content,
          origin: content?.origin || '',
          level: content?.level || 0,
        } as IItem),
      )
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onView = async (id: string) => {
    const { isSuccess, content: item } = await itemApi.getItemById(id)
    if (isSuccess) {
      showModal({
        title: 'View Item',
        width: 800,
        footer: null,
        content: <Item data={item as IItem} active={false} />,
      })
    }
  }

  // Handle errors
  useEffect(() => {
    if (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }, [error])

  return (
    <>
      <div className={globalClasses.stickyBar}>
        <div className={globalClasses.container}>
          <Toolbar
            pagination={
              <Pagination
                page={page}
                size={size}
                total={pagination?.total}
                totalPage={pagination?.totalPage}
                options={setting.pagination.options}
                onPageChange={(data) => {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('page', data.page.toString())
                  newParams.set('size', data.size.toString())
                  setSearchParams(newParams)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            }
          />
        </div>
      </div>

      <div className={globalClasses.container}>
        {isLoading && <div>Loading...</div>}
        {!isLoading && viewMode === EViewMode.GRID && listItem.length > 0 && (
          <div className={classes.items}>
            <Row gutter={[token.size, token.size * 2]}>
              {listItem.length > 0 &&
                listItem.map((item, idx) => {
                  return (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6} key={idx}>
                      <Item
                        data={item}
                        onEdit={() => onEdit(item.id || '')}
                        onDelete={() => onDelete(item.id || '')}
                        onView={() => onView(item.id || '')}
                      />
                    </Col>
                  )
                })}
            </Row>
          </div>
        )}

        {!isLoading && viewMode === EViewMode.LIST && listItem.length > 0 && (
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
                          {item.origin}
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

                        {item?.meanings && item.meanings.length > 0 && (
                          <>
                            {item.catId !== ECategory.WORD && <td></td>}

                            {item.catId === ECategory.WORD && (
                              <td>{getTypeOfItem(item.meanings[0].typeId).origin}</td>
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

                        {item.meanings && item.meanings.length === 0 && (
                          <>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </>
                        )}

                        <td>
                          <Reference origin={item.origin} />
                        </td>

                        <td>
                          <div className={classes.btnActions}>
                            <Button
                              type='text'
                              style={{ color: token.colorPrimary }}
                              icon={<EyeOutlined />}
                              onClick={() => onView(item.id || '')}
                            />

                            <Button
                              type='text'
                              style={{ color: styleConfig.color.yellow[6] }}
                              icon={<EditOutlined />}
                              onClick={() => onEdit(item.id || '')}
                            />

                            <Button
                              type='text'
                              style={{ color: styleConfig.color.red[5] }}
                              icon={<DeleteOutlined />}
                              onClick={() => onDelete(item.id || '')}
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

        {!isLoading && listItem.length === 0 && <NotFound />}
      </div>
    </>
  )
}

export default Library
