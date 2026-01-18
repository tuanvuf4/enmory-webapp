import globalStyle from '@/style/appStyle'
import { useSelector, useDispatch } from '@/core/hooks'
import { exampleApi } from '@/services/firebase/api/example.api'
import { exampleAsync } from '@/store/asyncActions/example.async'
import { exampleAction } from '@/store/reducers/example.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { IDataOnChange, Pagination } from '@/views/components'
import { ExItem } from '@/views/features/exItem/ExItem'
import { FormSearchEx } from '@/views/features/formSearchEx/FormSearchEx'
import { theme, Row, Col } from 'antd'
import { useEffect } from 'react'
import styles from './style'
import { Toolbar } from '@/views/features/toolbar/Toolbar'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { useSearchParams } from 'react-router-dom'
import { IFormSearchEx } from '@/models/formSearch.model'

export const Example: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()

  const { openNotification } = usePrompt()

  const { examples, pagination } = useSelector((state) => state.example)

  const [searchParams] = useSearchParams()

  // Read form search values from URL params
  const formSearchQuery: IFormSearchEx = {
    keyword: searchParams.get('keyword') || '',
    order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
    orderBy: (searchParams.get('orderBy') as 'created_date' | 'last_update') || 'created_date',
  }

  const dispatch = useDispatch()

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
