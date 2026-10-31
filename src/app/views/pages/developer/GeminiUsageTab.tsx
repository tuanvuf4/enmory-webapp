import { resolveGeminiApiKey } from '@/services/gemini/geminiDictionary.service'
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, TGeminiModel } from '@/services/gemini/geminiModels'
import {
  clearGeminiStats,
  generateContentWithTracking,
  IGeminiRequestLog,
  useGeminiStats,
} from '@/services/gemini/geminiTracker.service'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  KeyOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { GoogleGenAI } from '@google/genai'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd'
import moment from 'moment'
import React, { useMemo, useState } from 'react'

const { Text } = Typography

export const GeminiUsageTab: React.FC = () => {
  const { token } = theme.useToken()
  const stats = useGeminiStats()

  const [activeSubTab, setActiveSubTab] = useState<'models' | 'services' | 'logs'>('models')
  const [logSearchKeyword, setLogSearchKeyword] = useState<string>('')
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'error'>('all')

  // Test call state
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{
    text?: string
    model?: string
    durationMs?: number
    promptTokens?: number
    candidatesTokens?: number
    totalTokens?: number
    error?: string
  } | null>(null)
  const [selectedTestModel, setSelectedTestModel] = useState<TGeminiModel>(DEFAULT_GEMINI_MODEL)
  const [testPrompt, setTestPrompt] = useState<string>(
    'Say "Hello Enmory Developer!" and give a 10-word inspirational quote for language learners.',
  )

  const apiKey = useMemo(() => resolveGeminiApiKey(), [])
  const maskedApiKey = useMemo(() => {
    if (!apiKey) return null
    if (apiKey.length <= 10) return '********'
    return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
  }, [apiKey])

  // Average latency calculation

  // Reset stats handler
  const handleResetStats = () => {
    Modal.confirm({
      title: 'Reset Gemini API & Token Usage Stats?',
      icon: <DeleteOutlined style={{ color: token.colorError }} />,
      content:
        'Thao tác này sẽ xoá sạch bộ đếm request, số token đã tiêu thụ và toàn bộ nhật ký request đã ghi lại trên thiết bị này.',
      okText: 'Xoá thống kê',
      okType: 'danger',
      cancelText: 'Huỷ',
      onOk: () => {
        clearGeminiStats()
        message.success('Đã làm mới dữ liệu thống kê Gemini API thành công!')
      },
    })
  }

  // Export logs JSON
  const handleExportJson = () => {
    const filename = `gemini-usage-stats-${moment().format('YYYYMMDD-HHmmss')}.json`
    const dataStr = JSON.stringify(stats, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`Đã xuất báo cáo ${filename}`)
  }

  // Trigger test call
  const handleRunTestCall = async () => {
    if (!apiKey) {
      message.error(
        'Không tìm thấy Gemini API Key. Vui lòng kiểm tra lại cấu hình .env hoặc localStorage.',
      )
      return
    }

    setIsTesting(true)
    setTestResult(null)

    const startTime = performance.now()
    try {
      const ai = new GoogleGenAI({ apiKey })
      const response = await generateContentWithTracking(ai, 'Developer Test Sandbox', {
        model: selectedTestModel,
        contents: testPrompt,
        config: {
          temperature: 0.7,
        },
      })

      const durationMs = Math.round(performance.now() - startTime)
      const usage = (response as any)?.usageMetadata
      const promptTokens = Number(usage?.promptTokenCount) || 0
      const candidatesTokens = Number(usage?.candidatesTokenCount) || 0
      const totalTokens = Number(usage?.totalTokenCount) || promptTokens + candidatesTokens

      setTestResult({
        text: response.text?.trim() || '(No response text)',
        model: selectedTestModel,
        durationMs,
        promptTokens,
        candidatesTokens,
        totalTokens,
      })

      message.success(`Gọi Gemini test thành công (${totalTokens} tokens, ${durationMs}ms)`)
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime)
      setTestResult({
        error: err?.message || String(err),
        model: selectedTestModel,
        durationMs,
      })
      message.error(`Test Gemini thất bại: ${err?.message || err}`)
    } finally {
      setIsTesting(false)
    }
  }

  // Format model data
  const modelDataSource = useMemo(() => {
    return Object.entries(stats.byModel)
      .map(([model, data]) => {
        const percentage = stats.totalTokens > 0 ? (data.totalTokens / stats.totalTokens) * 100 : 0
        return {
          key: model,
          model,
          ...data,
          percentage,
        }
      })
      .sort((a, b) => b.totalTokens - a.totalTokens)
  }, [stats.byModel, stats.totalTokens])

  // Format service data
  const serviceDataSource = useMemo(() => {
    return Object.entries(stats.byService)
      .map(([service, data]) => {
        const percentage = stats.totalTokens > 0 ? (data.totalTokens / stats.totalTokens) * 100 : 0
        return {
          key: service,
          service,
          ...data,
          percentage,
        }
      })
      .sort((a, b) => b.totalTokens - a.totalTokens)
  }, [stats.byService, stats.totalTokens])

  // Filtered recent logs
  const filteredLogs = useMemo(() => {
    return stats.recentLogs.filter((log) => {
      if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false
      if (!logSearchKeyword.trim()) return true
      const kw = logSearchKeyword.toLowerCase()
      return (
        log.service.toLowerCase().includes(kw) ||
        log.model.toLowerCase().includes(kw) ||
        (log.errorMessage || '').toLowerCase().includes(kw) ||
        log.id.toLowerCase().includes(kw)
      )
    })
  }, [stats.recentLogs, logStatusFilter, logSearchKeyword])

  // Columns for Model table
  const modelColumns: TableColumnsType<any> = [
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (model: string) => (
        <Space>
          <Text strong style={{ color: token.colorPrimary }}>
            {model}
          </Text>
          {model === DEFAULT_GEMINI_MODEL && <Tag color='green'>Mặc định</Tag>}
        </Space>
      ),
    },
    {
      title: 'Requests',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a, b) => a.requests - b.requests,
      render: (requests: number, record: any) => (
        <Space>
          <Text strong>{requests}</Text>
          {record.failedRequests > 0 && (
            <Tag color='error' style={{ fontSize: 11 }}>
              {record.failedRequests} lỗi
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Prompt (In)',
      dataIndex: 'promptTokens',
      key: 'promptTokens',
      sorter: (a, b) => a.promptTokens - b.promptTokens,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Candidates (Out)',
      dataIndex: 'candidatesTokens',
      key: 'candidatesTokens',
      sorter: (a, b) => a.candidatesTokens - b.candidatesTokens,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      render: (val: number) => (
        <Text strong style={{ color: token.colorSuccess }}>
          {val.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Tỉ lệ tiêu thụ',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (pct: number) => (
        <div style={{ width: 140 }}>
          <Progress
            percent={Math.round(pct)}
            size='small'
            strokeColor={token.colorPrimary}
            format={(percent) => `${percent}%`}
          />
        </div>
      ),
    },
  ]

  // Columns for Service table
  const serviceColumns: TableColumnsType<any> = [
    {
      title: 'Tính năng / Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: string) => (
        <Text strong style={{ color: token.colorInfoText }}>
          {service}
        </Text>
      ),
    },
    {
      title: 'Requests',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a, b) => a.requests - b.requests,
      render: (requests: number, record: any) => (
        <Space>
          <Text strong>{requests}</Text>
          {record.failedRequests > 0 && (
            <Tag color='error' style={{ fontSize: 11 }}>
              {record.failedRequests} lỗi
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Prompt Tokens',
      dataIndex: 'promptTokens',
      key: 'promptTokens',
      sorter: (a, b) => a.promptTokens - b.promptTokens,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Candidates Tokens',
      dataIndex: 'candidatesTokens',
      key: 'candidatesTokens',
      sorter: (a, b) => a.candidatesTokens - b.candidatesTokens,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      render: (val: number) => (
        <Text strong style={{ color: token.colorSuccess }}>
          {val.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Tỉ lệ tiêu thụ',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (pct: number) => (
        <div style={{ width: 140 }}>
          <Progress
            percent={Math.round(pct)}
            size='small'
            strokeColor={token.colorInfo}
            format={(percent) => `${percent}%`}
          />
        </div>
      ),
    },
  ]

  // Columns for Logs table
  const logColumns: TableColumnsType<IGeminiRequestLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      render: (ts: number) => (
        <Tooltip title={moment(ts).format('YYYY-MM-DD HH:mm:ss')}>
          <Text style={{ fontSize: 12 }}>{moment(ts).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Tính năng',
      dataIndex: 'service',
      key: 'service',
      render: (service: string) => <Tag color='cyan'>{service}</Tag>,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (m: string) => <Tag color='purple'>{m}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st: string, record: IGeminiRequestLog) =>
        st === 'success' ? (
          <Tag icon={<CheckCircleOutlined />} color='success'>
            Thành công
          </Tag>
        ) : (
          <Tooltip title={record.errorMessage || 'Lỗi không xác định'}>
            <Tag icon={<CloseCircleOutlined />} color='error'>
              Thất bại
            </Tag>
          </Tooltip>
        ),
    },
    {
      title: 'Độ trễ',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (ms: number) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
          <span>{ms}ms</span>
        </Space>
      ),
    },
    {
      title: 'Input (Prompt)',
      dataIndex: 'promptTokens',
      key: 'promptTokens',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Output (Cand.)',
      dataIndex: 'candidatesTokens',
      key: 'candidatesTokens',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Tổng Token',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      render: (v: number, record: IGeminiRequestLog) => (
        <Text
          strong
          style={{ color: record.status === 'success' ? token.colorSuccess : token.colorError }}
        >
          {v.toLocaleString()}
        </Text>
      ),
    },
  ]

  return (
    <Space direction='vertical' style={{ width: '100%' }} size={16}>
      {/* Alert Banner */}
      <Alert
        message='Bộ đếm Tokens & Requests Google Gemini API'
        description={
          <div>
            Theo dõi chính xác và đầy đủ số lượng request API, token đầu vào (prompt tokens), token
            đầu ra (candidates tokens), tổng token tiêu thụ, cùng phân tích theo từng model và chức
            năng (Từ điển, Phát âm, Luyện nghe, Review câu dịch, TTS,...). Dữ liệu được cập nhật tự
            động theo thời gian thực và lưu trữ cục bộ trên trình duyệt.
          </div>
        }
        type='info'
        showIcon
        icon={<ThunderboltOutlined style={{ color: token.colorPrimary }} />}
      />

      {/* API Key Status Bar */}
      <Card size='small' style={{ background: token.colorFillAlter }}>
        <Row justify='space-between' align='middle' gutter={[12, 12]}>
          <Col>
            <Space align='center'>
              <KeyOutlined
                style={{ color: apiKey ? token.colorSuccess : token.colorWarning, fontSize: 16 }}
              />
              <Text strong>Gemini API Key:</Text>
              {apiKey ? (
                <Tag color='success' style={{ fontFamily: 'monospace' }}>
                  {maskedApiKey}
                </Tag>
              ) : (
                <Tag color='error'>Chưa cấu hình API Key</Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportJson}
                disabled={stats.totalRequests === 0}
              >
                Xuất JSON
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleResetStats}
                disabled={stats.totalRequests === 0}
              >
                Reset Stats
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size='small' hoverable style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title='Tổng số Requests'
              value={stats.totalRequests}
              prefix={<ThunderboltOutlined style={{ color: token.colorPrimary }} />}
              formatter={(val) => Number(val).toLocaleString()}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Tag color='success' style={{ margin: 0, fontSize: 11 }}>
                {stats.successRequests} ok
              </Tag>
              {stats.failedRequests > 0 && (
                <Tag color='error' style={{ margin: 0, fontSize: 11 }}>
                  {stats.failedRequests} lỗi
                </Tag>
              )}
              {stats.totalRequests > 0 && (
                <Text type='secondary' style={{ fontSize: 11 }}>
                  ({Math.round((stats.successRequests / stats.totalRequests) * 100)}% ok)
                </Text>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size='small' hoverable style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title='Tổng số Tokens tiêu thụ'
              value={stats.totalTokens}
              prefix={<ThunderboltOutlined style={{ color: token.colorSuccess }} />}
              valueStyle={{ color: token.colorSuccess }}
              formatter={(val) => Number(val).toLocaleString()}
            />
            <div style={{ marginTop: 8 }}>
              <Text type='secondary' style={{ fontSize: 11 }}>
                TB: ~
                {stats.totalRequests > 0
                  ? Math.round(stats.totalTokens / stats.totalRequests).toLocaleString()
                  : 0}{' '}
                tokens / req
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size='small' hoverable style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title='Input (Prompt Tokens)'
              value={stats.promptTokens}
              valueStyle={{ color: token.colorPrimary }}
              formatter={(val) => Number(val).toLocaleString()}
            />
            <div style={{ marginTop: 8 }}>
              <Text type='secondary' style={{ fontSize: 11 }}>
                {stats.totalTokens > 0
                  ? Math.round((stats.promptTokens / stats.totalTokens) * 100)
                  : 0}
                % tổng tokens
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size='small' hoverable style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title='Output (Candidates Tokens)'
              value={stats.candidatesTokens}
              valueStyle={{ color: token.colorWarning }}
              formatter={(val) => Number(val).toLocaleString()}
            />
            <div style={{ marginTop: 8 }}>
              <Text type='secondary' style={{ fontSize: 11 }}>
                {stats.totalTokens > 0
                  ? Math.round((stats.candidatesTokens / stats.totalTokens) * 100)
                  : 0}
                % tổng tokens
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Interactive Test Sandbox */}
      <Card
        title={
          <Space>
            <PlayCircleOutlined style={{ color: token.colorPrimary }} />
            <span>Sandbox Test Gemini API & Kiểm tra bộ đếm tức thì</span>
          </Space>
        }
        size='small'
      >
        <Space direction='vertical' style={{ width: '100%' }} size={12}>
          <Row gutter={[12, 12]} align='middle'>
            <Col xs={24} sm={16} md={18}>
              <Input
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder='Nhập prompt test gửi đến Gemini...'
              />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Select
                value={selectedTestModel}
                onChange={setSelectedTestModel}
                options={GEMINI_MODELS.map((m) => ({ label: m, value: m }))}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Button
            type='primary'
            icon={<PlayCircleOutlined />}
            onClick={handleRunTestCall}
            loading={isTesting}
            disabled={!apiKey || !testPrompt.trim()}
          >
            Chạy thử nghiệm & Ghi nhận Tokens
          </Button>

          {testResult && (
            <Card
              size='small'
              style={{
                marginTop: 8,
                background: testResult.error ? token.colorErrorBg : token.colorSuccessBg,
                borderColor: testResult.error ? token.colorErrorBorder : token.colorSuccessBorder,
              }}
            >
              {testResult.error ? (
                <div>
                  <Text strong style={{ color: token.colorError }}>
                    Lỗi khi gọi Gemini:
                  </Text>{' '}
                  <Text>{testResult.error}</Text>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Tag color='purple'>Model: {testResult.model}</Tag>
                    <Tag color='blue'>Thời gian: {testResult.durationMs}ms</Tag>
                    <Tag color='success'>Prompt: {testResult.promptTokens} tokens</Tag>
                    <Tag color='warning'>Candidates: {testResult.candidatesTokens} tokens</Tag>
                    <Tag color='magenta'>Tổng: {testResult.totalTokens} tokens</Tag>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: token.borderRadiusSM,
                      background: token.colorBgContainer,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 180,
                      overflowY: 'auto',
                    }}
                  >
                    {testResult.text}
                  </div>
                </div>
              )}
            </Card>
          )}
        </Space>
      </Card>

      {/* Sub-tabs: By Model | By Service | Recent Logs */}
      <Card size='small'>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space>
            <Button
              type={activeSubTab === 'models' ? 'primary' : 'default'}
              onClick={() => setActiveSubTab('models')}
            >
              Theo Model ({Object.keys(stats.byModel).length})
            </Button>
            <Button
              type={activeSubTab === 'services' ? 'primary' : 'default'}
              onClick={() => setActiveSubTab('services')}
            >
              Theo Tính năng ({Object.keys(stats.byService).length})
            </Button>
            <Button
              type={activeSubTab === 'logs' ? 'primary' : 'default'}
              onClick={() => setActiveSubTab('logs')}
            >
              Nhật ký gần đây ({stats.recentLogs.length})
            </Button>
          </Space>

          {activeSubTab === 'logs' && (
            <Space wrap>
              <Input
                placeholder='Tìm theo service, model, id...'
                prefix={<SearchOutlined />}
                value={logSearchKeyword}
                onChange={(e) => setLogSearchKeyword(e.target.value)}
                allowClear
                style={{ width: 220 }}
              />
              <Select
                value={logStatusFilter}
                onChange={setLogStatusFilter}
                options={[
                  { label: 'Tất cả trạng thái', value: 'all' },
                  { label: 'Thành công', value: 'success' },
                  { label: 'Thất bại', value: 'error' },
                ]}
                style={{ width: 150 }}
              />
            </Space>
          )}
        </div>

        {activeSubTab === 'models' && (
          <Table
            columns={modelColumns}
            dataSource={modelDataSource}
            pagination={false}
            size='small'
            locale={{ emptyText: 'Chưa có lượt gọi Gemini API nào được ghi nhận.' }}
          />
        )}

        {activeSubTab === 'services' && (
          <Table
            columns={serviceColumns}
            dataSource={serviceDataSource}
            pagination={false}
            size='small'
            locale={{ emptyText: 'Chưa có dữ liệu tính năng nào được ghi nhận.' }}
          />
        )}

        {activeSubTab === 'logs' && (
          <Table
            columns={logColumns}
            dataSource={filteredLogs}
            rowKey='id'
            pagination={{ pageSize: 15, showSizeChanger: true }}
            size='small'
            locale={{ emptyText: 'Chưa có nhật ký request nào.' }}
          />
        )}
      </Card>
    </Space>
  )
}
export default GeminiUsageTab
