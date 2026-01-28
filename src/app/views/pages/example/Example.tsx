import globalStyle from '@/style/appStyle'
import { IDataOnChange, Pagination } from '@/views/components'
import { FormSearchEx } from '@/views/features/formSearchExtension/FormSearchExtension'
import { theme, Row, Col } from 'antd'
import styles from './style'
import { Toolbar } from '@/views/features/toolbar/Toolbar'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { useSearchParams } from 'react-router-dom'
import { IFormSearchEx } from '@/models/formSearch.model'
import { setting } from '@/config/appConfig'
import { useExamples, useDeleteExample } from '@/core/hooks/useExamples'
import { ExampleItem } from '@/views/features'

export const Example: React.FC = () => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  const { openNotification } = usePrompt()

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

  // Fetch examples using React Query
  const { data, isLoading } = useExamples({
    ...formSearchQuery,
    page,
    size,
  })

  const deleteMutation = useDeleteExample()

  const examples = data?.content || []
  const pagination = data?.paging || setting.pagination

  const onEdit = async (id: string) => {
    try {
      // Set the selected example for editing
      const example = examples.find((ex) => ex.id === id)
      if (example) {
        // dispatch(settingAction.toggleExModal())
      }
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      openNotification({ type: 'success', message: 'Example deleted successfully' })
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
        {isLoading && <div>Loading...</div>}
        {!isLoading && examples.length > 0 && (
          <div className={classes.items}>
            <Row gutter={[token.size, token.size * 2]}>
              {examples.map((item, idx) => {
                return (
                  <Col xs={24} sm={12} md={8} lg={8} key={idx}>
                    <ExampleItem
                      data={item}
                      onEdit={() => onEdit(item.id || '')}
                      onDelete={() => onDelete(item.id || '')}
                    />
                  </Col>
                )
              })}
            </Row>
          </div>
        )}

        {!isLoading && examples.length === 0 && <NotFound />}
      </div>
    </>
  )
}

export default Example
