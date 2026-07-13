import React, { PropsWithChildren } from 'react'
import { theme } from 'antd'

interface IProps {
  title?: string
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title }) => {
  const { token } = theme.useToken()

  return (
    <div>
      {title && (
        <h3
          className='text-center font-bold italic capitalize m-0'
          style={{
            fontSize: token.fontSizeHeading3,
            color: token.colorPrimary,
            padding: token.size,
          }}
        >
          {title}
        </h3>
      )}

      <div
        className='p-4 rounded-lg border transition-all duration-300'
        style={{
          padding: token.size,
          borderRadius: token.borderRadius,
          background: token.colorBgWidget,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: token.boxShadow,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
