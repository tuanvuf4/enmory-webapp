import globalStyle from '@/style/appStyle'
import { PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import clsx from 'clsx'
import { createUseStyles } from 'react-jss'
import { cloneElement, isValidElement, ReactElement } from 'react'

interface NotFoundProps {
  button?: React.JSX.Element
  showButton?: boolean
  label?: React.JSX.Element | string
  classNames?: {
    container?: string
    label?: string
    button?: string
  }
  onClickBtn?: () => void
}

interface ActionButtonProps {
  onClickBtn?: () => void
  classNames?: string
}

interface PageTitleProps {
  content: React.JSX.Element | string
  classNames?: string
}

interface LabelWrapperProps {
  label?: React.JSX.Element | string
  className?: string
}
interface ButtonWrapperProps {
  button?: React.JSX.Element
  className?: string
  onClickBtn?: () => void
}

const PageTitle = ({ content, classNames }: PageTitleProps) => {
  const globalClasses = globalStyle()

  return <h2 className={clsx(globalClasses.pageTitle, classNames)}>{content}</h2>
}

const ActionButton = ({ onClickBtn, classNames }: ActionButtonProps) => {
  const { token } = theme.useToken()

  const classes = createUseStyles({
    btnAddNew: {
      '&:hover span': {
        color: token.colorPrimary,
      },
    },
  })()

  return (
    <Button
      className={clsx(classes.btnAddNew, 'uppercase !font-bold', classNames)}
      icon={
        <PlusOutlined style={{ fontSize: token.fontSizeHeading4 }} color={token.colorPrimary} />
      }
      onClick={() => onClickBtn?.()}
    >
      Add New
    </Button>
  )
}

const LabelWrapper = ({ label, className }: LabelWrapperProps) => {
  if (!label) {
    return <PageTitle classNames={className} content={'404 - Not Found'} />
  }

  if (isValidElement(label)) {
    const typedLabel = label as ReactElement<{ className?: string }>
    return cloneElement(typedLabel, {
      className: clsx(typedLabel.props.className, className),
    })
  }

  return <span className={className}>{label}</span>
}

const ButtonWrapper = ({ button, className, onClickBtn }: ButtonWrapperProps) => {
  if (!button) {
    return <ActionButton classNames={className} onClickBtn={onClickBtn} />
  }

  if (isValidElement(button)) {
    const typedButton = button as ReactElement<{ className?: string }>
    return cloneElement(typedButton, {
      className: clsx(typedButton.props.className, className),
    })
  }

  return button
}

export const NotFound = ({
  classNames = {
    container: 'justify-between',
    label: '',
    button: '',
  },
  button,
  showButton = true,
  label,
  onClickBtn,
}: NotFoundProps) => {
  return (
    <div
      className={`flex items-center gap-2 ${classNames.container}`}
      onClick={(e) => e.stopPropagation()}
    >
      <LabelWrapper label={label} className={classNames.label} />

      {showButton && (
        <ButtonWrapper button={button} className={classNames.button} onClickBtn={onClickBtn} />
      )}
    </div>
  )
}
