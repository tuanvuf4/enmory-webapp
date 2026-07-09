import { SearchOutlined } from '@ant-design/icons'
import styles from './tags.module.scss'
import { itemApi } from '@/services/firebase/api/item.api'
import clsx from 'clsx'
import { useItemModal, useLoading } from '@/helpers/hooks'
import { usePrompt } from '@/helpers/hooks'
import { appSetting } from '@/config/appConfig'
import { useNavigate } from 'react-router-dom'

interface IPros {
  label?: string
  tags: string[]
  active?: boolean
  onSearch?: (tag: string) => void
}

export const Tags: React.FC<IPros> = ({ label, tags, active, onSearch }) => {
  const { showLoading, hideLoading } = useLoading()

  const { openItemModal } = useItemModal()
  const { openMessage } = usePrompt()

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

    onSearch?.(keyword)

    navigate(`/library?${params.toString()}`)
  }

  return (
    <div className={styles.tagList}>
      <span className={styles.tagLabel}>{label}:</span>

      {tags.map((tag, key) => {
        return (
          <div
            key={key}
            className={clsx({
              [styles.tagItem]: true,
              active,
            })}
            onClick={() => getItem(tag)}
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
    </div>
  )
}
