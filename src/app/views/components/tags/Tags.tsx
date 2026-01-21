import { SearchOutlined } from '@ant-design/icons'
import { useSelector, useDispatch } from '@/core/hooks'
import { settingAction } from '@/store/reducers/setting.reducer'
import { theme } from 'antd'
import styles from './style'
import { itemApi } from '@/services/firebase/api/item.api'
import clsx from 'clsx'

interface IPros {
  label?: string
  tags: string[]
  active?: boolean
  onSearch?: (tag: string) => void
}

export const Tags: React.FC<IPros> = ({ label, tags, active, onSearch }) => {
  const { token } = theme.useToken()

  const classes = styles(token)

  const dispatch = useDispatch()

  const getItem = async (origin: string, exact = true) => {
    const { isSuccess, content } = await itemApi.getItems({
      keyword: origin,
      page: 0,
      size: 1,
      exact,
    })
    if (isSuccess && content) {
      dispatch(settingAction.setCurrentItem(content[0]))
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
              <span>{tag}</span>
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
