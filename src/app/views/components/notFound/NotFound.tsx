import { PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import clsx from 'clsx'
import { createUseStyles } from 'react-jss'

interface NotFoundProps {
  showButton?: boolean
  buttonLabel?: string
  onClickBtn?: () => void
  label?: string
}

export const NotFound = ({
  onClickBtn,
  showButton = false,
  buttonLabel = 'Homepage',
  label = 'Not Found!',
}: NotFoundProps) => {
  const { token } = theme.useToken()

  const classes = createUseStyles({
    btnAddNew: {
      '&:hover span': {
        color: token.colorPrimary,
      },
    },
  })()

  return (
    <div
      className={`flex items-center ${label && buttonLabel ? 'justify-between' : 'justify-center'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {label && (
        <h4 className={'m-0'} style={{ color: token.colorText }}>
          {label}
        </h4>
      )}

      {showButton && (
        <Button
          className={clsx(classes.btnAddNew, 'uppercase !font-bold')}
          icon={
            <PlusOutlined style={{ fontSize: token.fontSizeHeading4 }} color={token.colorPrimary} />
          }
          onClick={() => onClickBtn?.()}
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  )
}
