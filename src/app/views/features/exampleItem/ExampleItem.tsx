import { MoreOutlined } from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { IExample } from '@/models/item.model'
import { MenuProps, Skeleton, Dropdown, Button, theme } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import moment from 'moment'
import { actionMenuExample } from './ActionMenuItem'
import styles from './exampleItem.module.scss'
import appStyle from '@/style/appStyle.module.scss'
import clsx from 'clsx'

interface IProps {
  groupAction?: boolean
  active?: boolean
  data: IExample
  onDelete?: () => void
  onEdit?: () => void
}

export const ExampleItem: React.FC<IProps> = ({
  groupAction = true,
  active = false,
  data,
  onDelete,
  onEdit,
}) => {
  const { token } = theme.useToken()

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key == '1') onEdit?.()
    if (e.key == '2') onDelete?.()
  }

  const getActionMenus = (menus = actionMenuExample) => {
    if (!onEdit && !onDelete) return []
    return menus
      .map((menu) => {
        if (!onEdit && menu?.key === 1) return false
        if (!onDelete && menu?.key === 2) return false
        return menu
      })
      .filter((menu) => menu) as ItemType[]
  }

  const menuProps = {
    items: getActionMenus(actionMenuExample),
    onClick: handleMenuClick,
  }

  return (
    <div
      className={clsx({ [appStyle.boxItem]: true, [styles.active]: active })}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        flexDirection: 'column',
        gap: token.size * 0.5,
      }}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={styles.title}>
            <h2 className={styles.origin} dangerouslySetInnerHTML={{ __html: data.origin }} />

            {groupAction && (onEdit || onDelete) && (
              <Dropdown
                placement='bottomRight'
                menu={menuProps}
                arrow={{ pointAtCenter: true }}
                trigger={['click']}
              >
                <Button
                  size='middle'
                  type='text'
                  icon={<MoreOutlined />}
                  className={styles.btnActions}
                />
              </Dropdown>
            )}
          </div>

          <div dangerouslySetInnerHTML={{ __html: data.translation }} />

          {data.note && <div style={{ fontStyle: 'italic' }}>{data.note}</div>}

          <div className={styles.date}>
            <span>{moment(data.created_date).format(appSetting.dateTimeFormat)}</span>
            <span>{moment(data.last_update).format(appSetting.dateTimeFormat)}</span>
          </div>
        </>
      )}
    </div>
  )
}
