import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import styles from './tags.module.scss'
import { itemApi } from '@/services/firebase/api/item.api'
import { useItemModal, useLoading } from '@/helpers/hooks'
import { usePrompt } from '@/helpers/hooks'
import { appSetting } from '@/config/appConfig'
import { useNavigate } from 'react-router-dom'
import { Button, Flex, theme } from 'antd'
import { initItem } from '@/views/features/modals'

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
  const { message } = usePrompt()

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
          : message({
              type: 'warning',
              content: (
                <Flex align={'center'} justify={'center'} gap={token.size * 0.5}>
                  <span>No item found with "{origin}"</span>
                  <Button
                    size={'small'}
                    icon={<PlusOutlined />}
                    onClick={() =>
                      openItemModal('add', {
                        ...initItem,
                        origin: origin.trim(),
                      })
                    }
                  >
                    Add
                  </Button>
                </Flex>
              ),
            })
      }
    } catch (error) {
      console.log(`*** error *** `, error)
    } finally {
      hideLoading()
    }
  }

  const onNavigate = (keyword: string) => {
    // Navigate to library with search params
    const params = new URLSearchParams()

    if (searchBy === 'tags') {
      params.set('tags', keyword)
    } else {
      params.set('keyword', keyword)
    }

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
          <div
            key={key}
            className={styles.tagItem}
            onClick={() => (searchBy === 'tags' ? onNavigate(tag) : getItem(tag))}
          >
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
