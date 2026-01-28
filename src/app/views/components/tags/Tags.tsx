import { SearchOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import styles from './style'
import { itemApi } from '@/services/firebase/api/item.api'
import clsx from 'clsx'
import { useItemModal } from '@/helpers/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { usePrompt } from '@/helpers/hooks'
import { useDispatch } from '@/core/hooks'

interface IPros {
  label?: string
  tags: string[]
  active?: boolean
  onSearch?: (tag: string) => void
}

export const Tags: React.FC<IPros> = ({ label, tags, active, onSearch }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const { openItemModal } = useItemModal()
  const { openMessage } = usePrompt()

  const dispatch = useDispatch()

  const getItem = async (origin: string, exact = true) => {
    try {
      dispatch(settingAction.showLoading())
      const { isSuccess, content } = await itemApi.getItems({
        keyword: origin,
        page: 0,
        size: 1,
        exact,
      })
      console.log(`*** content *** `, content)
      if (isSuccess && content) {
        content.length > 0
          ? openItemModal('view', content[0])
          : openMessage({
              type: 'warning',
              content: `No item found with "${origin}"`,
            })
      }
      dispatch(settingAction.hideLoading())
    } catch (error) {
      dispatch(settingAction.hideLoading())
    }
  }

  return (
    <div className={classes.tagList}>
      <span className={classes.tagLabel}>{label}:</span>

      {tags.map((tag, key) => {
        return (
          <div
            key={key}
            className={clsx({
              [classes.tagItem]: true,
              active,
            })}
            onClick={() => getItem(tag)}
          >
            <div className={classes.tagItemContainer}>
              <span className={'select-none'}>{tag}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSearch) onSearch(tag)
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
