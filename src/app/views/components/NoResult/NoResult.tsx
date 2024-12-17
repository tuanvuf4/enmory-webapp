import { PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import clsx from 'clsx'
import { createUseStyles } from 'react-jss'

interface NoResultProps {
  showAddBtn?: boolean
  onAdd?: () => void
}

export const NoResult = ({ onAdd, showAddBtn = true }: NoResultProps) => {
  const { token } = theme.useToken()

  const classes = createUseStyles({
    btnAddNew: {
      '&:hover span': {
        color: token.colorPrimary,
      },
    },
  })()

  return (
    <div className={'flex items-center justify-between'} onClick={(e) => e.stopPropagation()}>
      <h4 className={'m-0'} style={{ color: token.colorText }}>
        Not Found!
      </h4>

      {showAddBtn && (
        <Button
          className={clsx(classes.btnAddNew, 'uppercase !font-bold')}
          icon={
            <PlusOutlined style={{ fontSize: token.fontSizeHeading4 }} color={token.colorPrimary} />
          }
          onClick={() => onAdd?.()}
        >
          Add
        </Button>
      )}
    </div>
  )
}
