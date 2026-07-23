import React, { PropsWithChildren } from 'react'
import { theme } from 'antd'

interface IProps {
  title?: string
  styles?: {
    wrapper?: React.CSSProperties
    title?: React.CSSProperties
    content?: React.CSSProperties
  }
}

export const Widget: React.FC<PropsWithChildren & IProps> = ({ children, title, styles }) => {
  const { token } = theme.useToken()

  return (
    <div style={{ ...styles?.wrapper }}>
      {title && (
        <h3
          className='text-center font-bold italic capitalize m-0'
          style={{
            fontSize: token.fontSizeHeading3,
            color: token.colorPrimary,
            padding: token.size,
            ...styles?.title,
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
          ...styles?.content,
        }}
      >
        {children}
      </div>
    </div>
  )
}
