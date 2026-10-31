import React from 'react'
import { Badge, Button, Flex, Progress, Tag, Typography, theme } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { useGeminiLimits, useGeminiStats } from '@/services/gemini'

interface IProps {
  isCollapsed: boolean
}

export const GeminiSidebarWidget: React.FC<IProps> = ({ isCollapsed }) => {
  const { token } = theme.useToken()
  const stats = useGeminiStats()
  const limits = useGeminiLimits()

  const formatTokens = (num: number): string => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M'
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'k'
    }
    return num.toLocaleString()
  }

  const formatPercent = (used: number, max: number): string => {
    if (!max || max <= 0 || !used || used <= 0) return '0%'
    const pct = (used / max) * 100
    if (pct >= 100) return `${Math.round(pct)}%`
    if (pct >= 10) return `${pct.toFixed(1)}%`
    if (pct >= 0.1) return `${pct.toFixed(1)}%`
    if (pct >= 0.01) return `${pct.toFixed(2)}%`
    return `${pct.toFixed(3)}%`
  }

  const calcProgressPercent = (used: number, max: number): number => {
    if (!max || max <= 0 || !used || used <= 0) return 0
    const pct = (used / max) * 100
    if (pct > 0 && pct < 1) {
      return Math.max(1, Number(pct.toFixed(1)))
    }
    return Math.min(100, Number(pct.toFixed(1)))
  }

  const rawTokenPercent = limits.maxTokens > 0 ? (stats.totalTokens / limits.maxTokens) * 100 : 0
  const rawRequestPercent =
    limits.maxRequests > 0 ? (stats.totalRequests / limits.maxRequests) * 100 : 0

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return token.colorError
    if (percent >= 75) return token.colorWarning
    return token.colorSuccess
  }

  const tokenColor = getStatusColor(rawTokenPercent)
  const requestColor = getStatusColor(rawRequestPercent)
  const isNearLimit = rawTokenPercent >= 90 || rawRequestPercent >= 90

  if (isCollapsed) {
    return (
      <Button
        type='text'
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
            overflowCount={999}
            size='small'
            offset={[4, -2]}
            style={{
              fontSize: 10,
              backgroundColor: isNearLimit ? token.colorError : token.colorPrimary,
            }}
          >
            <ThunderboltOutlined
              style={{
                color: isNearLimit ? token.colorError : token.colorPrimary,
                fontSize: 16,
              }}
            />
          </Badge>
        }
      />
    )
  }

  return (
    <div
      style={{
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter,
        border: `1px solid ${isNearLimit ? token.colorErrorBorder : token.colorBorder}`,
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
    >
      <Flex align='center' justify='space-between'>
        <Flex align='center' gap={6}>
          <ThunderboltOutlined
            style={{
              color: isNearLimit ? token.colorError : token.colorPrimary,
              fontSize: 13,
            }}
          />
          <Typography.Text style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>
            AI Usage
          </Typography.Text>
        </Flex>
        {isNearLimit && (
          <Tag
            color='error'
            style={{
              fontSize: 10,
              margin: 0,
              paddingInline: 4,
              lineHeight: '16px',
              borderRadius: 4,
            }}
          >
            Hạn mức
          </Tag>
        )}
      </Flex>

      {/* Request Row */}
      <Flex align='center' justify='space-between' style={{ marginTop: 4 }}>
        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
          Request:
        </Typography.Text>
        <Typography.Text strong style={{ fontSize: 11, color: requestColor }}>
          {formatTokens(stats.totalRequests)} / {formatTokens(limits.maxRequests)}{' '}
          <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
            ({formatPercent(stats.totalRequests, limits.maxRequests)})
          </span>
        </Typography.Text>
      </Flex>
      <Progress
        percent={calcProgressPercent(stats.totalRequests, limits.maxRequests)}
        size={['100%', 3]}
        showInfo={false}
        strokeColor={requestColor}
        style={{ margin: '2px 0 0 0' }}
      />

      {/* Tokens Row */}
      <Flex align='center' justify='space-between' style={{ marginTop: 4 }}>
        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
          Tokens:
        </Typography.Text>
        <Typography.Text strong style={{ fontSize: 11, color: tokenColor }}>
          {formatTokens(stats.totalTokens)} / {formatTokens(limits.maxTokens)}{' '}
          <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>
            ({formatPercent(stats.totalTokens, limits.maxTokens)})
          </span>
        </Typography.Text>
      </Flex>
      <Progress
        percent={calcProgressPercent(stats.totalTokens, limits.maxTokens)}
        size={['100%', 3]}
        showInfo={false}
        strokeColor={tokenColor}
        style={{ margin: '2px 0 0 0' }}
      />
    </div>
  )
}

export default GeminiSidebarWidget
