import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Flex, Tooltip, Typography, theme } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { useGeminiStats } from '@/services/gemini'

interface IProps {
  isCollapsed: boolean
}

export const GeminiSidebarWidget: React.FC<IProps> = ({ isCollapsed }) => {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const stats = useGeminiStats()

  const formatTokens = (num: number): string => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M'
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'k'
    }
    return num.toLocaleString()
  }

  const tooltipContent = (
    <div style={{ padding: 2, minWidth: 160 }}>
      <div
        style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <ThunderboltOutlined style={{ color: token.colorPrimary }} />
        <span>Gemini API Usage</span>
      </div>
      <div style={{ fontSize: 12 }}>
        Requests:{' '}
        <Typography.Text strong style={{ color: '#fff' }}>
          {stats.totalRequests.toLocaleString()}
        </Typography.Text>{' '}
        ({stats.successRequests} ok{stats.failedRequests > 0 ? `, ${stats.failedRequests} err` : ''}
        )
      </div>
      <div style={{ fontSize: 12 }}>
        Total Tokens:{' '}
        <Typography.Text strong style={{ color: '#52c41a' }}>
          {stats.totalTokens.toLocaleString()}
        </Typography.Text>
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
        In: {stats.promptTokens.toLocaleString()} • Out: {stats.candidatesTokens.toLocaleString()}
      </div>
    </div>
  )

  if (isCollapsed) {
    return (
      <Tooltip title={tooltipContent} placement='right'>
        <Button
          type='text'
          onClick={() => navigate('/developer?tab=gemini')}
          style={{
            width: '100%',
            justifyContent: 'center',
            borderRadius: token.borderRadiusLG,
            height: 36,
            paddingInline: 0,
          }}
          icon={
            <Badge
              count={stats.totalRequests}
              overflowCount={99}
              size='small'
              offset={[4, -2]}
              style={{ fontSize: 10, backgroundColor: token.colorPrimary }}
            >
              <ThunderboltOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
            </Badge>
          }
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip title={tooltipContent} placement='right'>
      <div
        style={{
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: token.borderRadiusLG,
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorder}`,
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
      >
        <Flex align='center' justify='space-between'>
          <Flex align='center' gap={6}>
            <ThunderboltOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Typography.Text style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>
              Gemini API
            </Typography.Text>
          </Flex>
        </Flex>

        <Flex align='center' justify='space-between' style={{ marginTop: 3 }}>
          <Typography.Text type='secondary' style={{ fontSize: 11 }}>
            Tokens:
          </Typography.Text>
          <Typography.Text strong style={{ fontSize: 11, color: token.colorSuccess }}>
            {formatTokens(stats.totalTokens)}
          </Typography.Text>
        </Flex>

        <Flex align='center' justify='space-between' style={{ marginTop: 3 }}>
          <Typography.Text type='secondary' style={{ fontSize: 11 }}>
            Request:
          </Typography.Text>
          <Typography.Text strong style={{ fontSize: 11, color: token.colorSuccess }}>
            {formatTokens(stats.totalRequests)}
          </Typography.Text>
        </Flex>
      </div>
    </Tooltip>
  )
}

export default GeminiSidebarWidget
