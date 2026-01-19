import globalStyle from '@/style/appStyle'
import { useDispatch } from '@/core/hooks'
import { exampleApi } from '@/services/firebase/api/example.api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { IDataOnChange, Pagination } from '@/views/components'
import { ExItem } from '@/views/features/exItem/ExItem'
import { FormSearchEx } from '@/views/features/formSearchExtension/FormSearchExtension'
import { theme, Row, Col } from 'antd'
import { useEffect, useState } from 'react'
import styles from './style'
import { Toolbar } from '@/views/features/toolbar/Toolbar'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { useSearchParams } from 'react-router-dom'
import { IFormSearchEx } from '@/models/formSearch.model'
import { IExample } from '@/models/item.model'
import { IPagination } from '@/models/pagination.model'
import { setting } from '@/config/appConfig'

export const Example: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  const { openNotification } = usePrompt()

  const [examples, setExamples] = useState<IExample[]>([])
  const [pagination, setPagination] = useState<IPagination>(setting.pagination)
  const [loading, setLoading] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()

  // Read pagination from URL params
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 0
  const size = searchParams.get('size') ? Number(searchParams.get('size')) : 20

  // Read form search values from URL params
  const formSearchQuery: IFormSearchEx = {
    keyword: searchParams.get('keyword') || '',
    order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
    orderBy: (searchParams.get('orderBy') as 'created_date' | 'last_update') || 'created_date',
  }

  const dispatch = useDispatch()

  const fetchExamples = async () => {
    setLoading(true)
    try {
      const response = await exampleApi.getExamples({
        ...formSearchQuery,
        page,
        size,
      })
      setExamples(response.content || [])
      if (response.paging) {
        setPagination(response.paging)
      }
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
      setExamples([])
    } finally {
      setLoading(false)
    }
  }

  const onEdit = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
      dispatch(settingAction.toggleExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
      dispatch(settingAction.toggleDeleteExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onPageChange = (data: IDataOnChange) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', data.page.toString())
    newParams.set('size', data.size.toString())
    setSearchParams(newParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    fetchExamples()
  }, [searchParams])

  return (
    <>
      <div className={globalClasses.stickyBar}>
        <div className={globalClasses.container}>
          <Toolbar
            formSearch={<FormSearchEx />}
            pagination={
              <Pagination
                page={page}
                size={size}
                total={pagination.total}
                totalPage={pagination.totalPage}
                options={pagination.options}
                onPageChange={onPageChange}
              />
            }
          />
        </div>
      </div>

      <div className={globalClasses.container}>
        {loading && <div>Loading...</div>}
        {!loading && examples.length > 0 && (
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

        {!loading && examples.length === 0 && <NotFound />}
      </div>
    </>
  )
}

export default Example
