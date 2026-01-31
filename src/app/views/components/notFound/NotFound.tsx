import globalStyle from '@/style/appStyle'
import { PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import clsx from 'clsx'
import { createUseStyles } from 'react-jss'

interface NotFoundProps {
  showButton?: boolean
  buttonLabel?: string
  onClickBtn?: () => void
  label?: JSX.Element | string
}

const PageTitle = ({ content }: { content: JSX.Element | string }) => {
  const globalClasses = globalStyle()

  return <h2 className={clsx(globalClasses.pageTitle)}>{content}</h2>
}

export const NotFound = ({
  onClickBtn,
  showButton = false,
  buttonLabel = 'Homepage',
  label = <PageTitle content={'404 - Not Found'} />,
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
      className={`flex items-center ${showButton && label && buttonLabel ? 'justify-between' : 'justify-center'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {label}

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
