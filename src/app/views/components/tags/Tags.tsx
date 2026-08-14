import { SearchOutlined } from '@ant-design/icons'
import styles from './tags.module.scss'
import { itemApi } from '@/services/firebase/api/item.api'
import { useItemModal, useLoading } from '@/helpers/hooks'
import { usePrompt } from '@/helpers/hooks'
import { appSetting } from '@/config/appConfig'
import { useNavigate } from 'react-router-dom'
import { Flex, theme } from 'antd'

type TSearchBy = 'keyword' | 'tags'
interface IPros {
  label?: string
  tags: string[]
  searchBy?: TSearchBy
  onSearch?: (tag: string) => void
}

export const Tags: React.FC<IPros> = ({ label, tags, onSearch, searchBy = 'keyword' }) => {
  const { showLoading, hideLoading } = useLoading()

  const { openItemModal } = useItemModal()
  const { openMessage } = usePrompt()

  const { token } = theme.useToken()

  const navigate = useNavigate()

  const getItem = async (origin: string, exact = true) => {
    try {
      showLoading()
      const { isSuccess, content } = await itemApi.getItems({
        keyword: origin,
        page: 0,
        size: 1,
        exact,
      })

      if (isSuccess && content) {
        content.length > 0
          ? openItemModal('view', content[0])
          : openMessage({
              type: 'warning',
              content: `No item found with "${origin}"`,
            })
      }
      hideLoading()
    } catch (error) {
      hideLoading()
    }
  }

  const onNavigate = (keyword: string) => {
    // Navigate to library with search params
    const params = new URLSearchParams()

    params.set('keyword', keyword)
    params.set('page', appSetting.pagination.page.toString())
    params.set('size', appSetting.pagination.size.toString())

    if (searchBy === 'keyword') onSearch?.(keyword)

    navigate(`/library?${params.toString()}`)
  }

  return (
    <Flex align={'center'} justify={'flex-start'} wrap={'wrap'} gap={token.size / 2}>
      <span>{label}:</span>

      {tags.map((tag, key) => {
        return (
          <div key={key} className={styles.tagItem} onClick={() => getItem(tag)}>
            <div className={styles.tagItemContainer}>
              <span className={'select-none'}>{tag}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate(tag)
                }}
              >
                <SearchOutlined />
              </button>
            </div>
          </div>
        )
      })}
    </Flex>
  )
}
