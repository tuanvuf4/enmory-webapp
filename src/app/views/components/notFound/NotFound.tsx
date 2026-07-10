import appStyle from '@/style/appStyle.module.scss'
import { PlusOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import clsx from 'clsx'
import { cloneElement, isValidElement, JSX, ReactElement } from 'react'

interface NotFoundProps {
  button?: JSX.Element
  showButton?: boolean
  label?: JSX.Element | string
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
  content: JSX.Element | string
  classNames?: string
}

interface LabelWrapperProps {
  label?: JSX.Element | string
  className?: string
}
interface ButtonWrapperProps {
  button?: JSX.Element
  className?: string
  onClickBtn?: () => void
}

const PageTitle = ({ content, classNames }: PageTitleProps) => {
  return <h2 className={clsx(appStyle.pageTitle, classNames)}>{content}</h2>
}

const ActionButton = ({ onClickBtn, classNames }: ActionButtonProps) => {
  const { token } = theme.useToken()

  return (
    <Button
      className={clsx(
        'uppercase !font-bold hover:[&_span]:text-[var(--ant-color-primary)]',
        classNames,
      )}
      icon={
        <PlusOutlined style={{ fontSize: token.fontSizeHeading4 }} color={token.colorPrimary} />
      }
      onClick={() => onClickBtn?.()}
    >
      Add
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
