import appStyle from '@/style/appStyle.module.scss'
import { EViewMode } from '@/models/app.model'
import { Toolbar } from '@/views/features/toolbar/Toolbar'
import { theme, Row, Col } from 'antd'
import { useEffect } from 'react'
import styles from './style.module.scss'
import { useSelector } from '@/core/hooks'
import { Pagination } from '@/views/components'
import { Item } from '@/views/features/item/Item'
import { usePrompt } from '@/helpers/hooks'
import { NotFound } from '@/views/components'
import { useSearchParams } from 'react-router-dom'
import { setting } from '@/config/appConfig'
import { useItems } from '@/core/hooks/useItems'
import { Loading } from '@/views/features'

export const Library: React.FC = () => {
  const { token } = theme.useToken()

  const { viewMode } = useSelector((state) => state.setting)

  const { openNotification } = usePrompt()

  const [searchParams, setSearchParams] = useSearchParams()

  // Read pagination from URL params
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 0
  const size = searchParams.get('size') ? Number(searchParams.get('size')) : 20

  // Use React Query hooks
  const { data, isLoading, error } = useItems({
    keyword: searchParams.get('keyword') || '',
    cat:
      searchParams.get('cat') && searchParams.get('cat') !== '0'
        ? Number(searchParams.get('cat'))
        : 0,
    archive: searchParams.get('archive') === 'true',
    favorite: searchParams.get('favorite') === 'true',
    order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
    orderBy: (searchParams.get('orderBy') as 'created_date' | 'last_update') || 'created_date',
    page,
    size,
  })

  const listItem = data?.content || []
  const pagination = data?.paging || setting.pagination

  // Handle errors
  useEffect(() => {
    if (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }, [error])

  return (
    <>
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

      <div className={appStyle.container}>
        {isLoading && <Loading show={isLoading} />}

        {!isLoading && viewMode === EViewMode.GRID && listItem.length > 0 && (
          <div className={styles.items}>
            <Row gutter={[token.size, token.size * 2]}>
              {listItem.length > 0 &&
                listItem.map((item, idx) => {
                  return (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6} key={idx}>
                      <Item data={item} action active />
                    </Col>
                  )
                })}
            </Row>
          </div>
        )}

        {!isLoading && listItem.length === 0 && (
          <NotFound classNames={{ container: 'justify-center' }} showButton={false} />
        )}
      </div>
    </>
  )
}

export default Library
