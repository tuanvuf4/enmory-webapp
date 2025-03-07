import globalStyle from '@/style/appStyle'
import { useAppSelector, useAppDispatch } from '@/core/hooks'
import { exampleApi } from '@/services/api'
import { exampleAsync } from '@/store/async/example.async'
import { exampleAction } from '@/store/reducers/example.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { IDataOnChange, Pagination } from '@/views/components/pagination/pagination'
import { ExItem } from '@/views/features/exItem/exItem'
import { FormSearchEx } from '@/views/features/formSearchEx/formSearchEx'
import { theme, Row, Col } from 'antd'
import { useEffect } from 'react'
import styles from './style'
import { Toolbar } from '@/views/features/toolbar/toolbar'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'

export const Example: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()

  const { openNotification } = usePrompt()

  const { examples, pagination, formSearchQuery } = useAppSelector((state) => state.example)

  const dispatch = useAppDispatch()

  const onEdit = async (id: number) => {
    try {
      const { content } = await exampleApi.getExampleById(id)
      dispatch(exampleAction.setSelectedExample(content))
      dispatch(settingAction.toggleExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: number) => {
    try {
      const { content } = await exampleApi.getExampleById(id)
      dispatch(exampleAction.setSelectedExample(content))
      dispatch(settingAction.toggleDeleteExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onPageChange = (data: IDataOnChange) => {
    dispatch(exampleAsync.fetchExamples({ ...formSearchQuery, ...data }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    dispatch(
      exampleAsync.fetchExamples({
        keyword: '',
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
            formSearch={<FormSearchEx />}
            pagination={<Pagination {...pagination} onPageChange={onPageChange} />}
          />
        </div>
      </div>

      <div className={gClasses.container}>
        {examples.length > 0 && (
          <div className={classes.items}>
            <Row gutter={[token.size, token.size * 2]}>
              {examples.map((item, idx) => {
                return (
                  <Col xs={24} sm={12} md={8} lg={8} key={idx}>
                    <ExItem
                      data={item}
                      onEdit={() => onEdit(item.id || -1)}
                      onDelete={() => onDelete(item.id || -1)}
                    />
                  </Col>
                )
              })}
            </Row>
          </div>
        )}

        {examples.length === 0 && <NotFound />}
      </div>
    </>
  )
}

export default Example
