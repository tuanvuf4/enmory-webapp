import { appStyleConfig } from '@/style/appStyle'
import { MoreOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { IExample } from '@/models/item.model'
import { theme, MenuProps, Skeleton, Dropdown, Button } from 'antd'
import { ItemType } from 'antd/es/menu/interface'
import moment from 'moment'
import { actionMenuItems, actionMenuEx } from './actionMenuItem'
import styles from './style'
import clsx from 'clsx'

interface IProps {
  groupAction?: boolean
  active?: boolean
  data: IExample
  onDelete?: () => void
  onEdit?: () => void
}

export const ExItem: React.FC<IProps> = ({
  groupAction = true,
  active = false,
  data,
  onDelete,
  onEdit,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key == '1') onEdit?.()
    if (e.key == '2') onDelete?.()
  }

  const getActionMenus = (menus = actionMenuItems) => {
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
    items: getActionMenus(actionMenuEx),
    onClick: handleMenuClick,
  }

  return (
    <div
      className={clsx({
        [classes.item]: true,
        active: active,
      })}
    >
      {!data && <Skeleton />}

      {data && (
        <>
          <div className={classes.contentItem}>
            <div className={classes.contentHead}>
              <div className={classes.title}>
                <h2 className={classes.original}>
                  <p style={{ color: token.colorPrimary, marginBottom: 0 }}>{data.original}</p>
                </h2>

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
                      className={classes.btnActions}
                    />
                  </Dropdown>
                )}
              </div>

              <div className={classes.contentMain}>
                <p style={{ color: appStyleConfig.border.blue[2] }}>{data.translation}</p>

                {data.note && <p style={{ fontSize: 13, fontStyle: 'italic' }}>{data.note}</p>}
              </div>
            </div>
          </div>

          <div className={classes.date}>
            <span>{moment(data.created_date).format(defaultSetting.dateTimeFormat)}</span>
            <span>{moment(data.last_update).format(defaultSetting.dateTimeFormat)}</span>
          </div>
        </>
      )}
    </div>
  )
}
