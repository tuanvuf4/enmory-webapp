import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Modal,
  Popconfirm,
  Select,
  Form,
  InputNumber,
  Badge,
  message,
  theme,
  Alert,
  Dropdown,
  Descriptions,
} from 'antd'
import type { TableColumnsType, MenuProps } from 'antd'
import {
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SyncOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  CheckOutlined,
  DownOutlined,
} from '@ant-design/icons'
import moment from 'moment'
import {
  errorApiRequestsService,
  ERROR_API_REQUESTS_CHANGED_EVENT,
} from '@/services/localDb/errorApiRequests.service'
import { IErrorApiRequest } from '@/services/localDb/db'

const { Text, Paragraph } = Typography

export const ApiErrorRequestsTab: React.FC = () => {
  const { token } = theme.useToken()

  const [loading, setLoading] = useState<boolean>(true)
  const [requests, setRequests] = useState<IErrorApiRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [isRetryingAll, setIsRetryingAll] = useState<boolean>(false)

  const [selectedRecord, setSelectedRecord] = useState<IErrorApiRequest | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const [manualForm] = Form.useForm()

  // Load data from Dexie
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await errorApiRequestsService.getAll()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load error API requests:', err)
      message.error(
        'Không thể tải danh sách API lỗi: ' + (err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleDataChanged = () => {
      loadData()
    }

    window.addEventListener(ERROR_API_REQUESTS_CHANGED_EVENT, handleDataChanged)
    return () => {
      window.removeEventListener(ERROR_API_REQUESTS_CHANGED_EVENT, handleDataChanged)
    }
  }, [loadData])

  // Retry a single request
  const handleRetry = useCallback(
    async (record: IErrorApiRequest) => {
      setRetryingId(record.id)
      try {
        const result = await errorApiRequestsService.retryRequest(record)
        if (result.success) {
          message.success(
            `Gửi lại yêu cầu thành công! [${record.method}] ${record.url} (Status: ${result.status})`,
          )
        } else {
          message.error(
            `Gửi lại yêu cầu thất bại! [${record.method}] ${record.url} (${result.error || 'Status: ' + result.status})`,
          )
        }
        await loadData()
        if (selectedRecord && selectedRecord.id === record.id) {
          const fresh = await errorApiRequestsService.getById(record.id)
          if (fresh) setSelectedRecord(fresh)
        }
      } catch (err: any) {
        message.error('Lỗi khi thực hiện lại yêu cầu: ' + (err?.message || String(err)))
      } finally {
        setRetryingId(null)
      }
    },
    [loadData, selectedRecord],
  )

  // Retry all requests
  const handleRetryAll = useCallback(async () => {
    if (requests.length === 0) {
      message.info('Không có yêu cầu API lỗi nào để thử lại.')
      return
    }

    setIsRetryingAll(true)
    try {
      const result = await errorApiRequestsService.retryAll()
      message.info(
        `Đã thử lại toàn bộ ${result.total} yêu cầu: ${result.succeeded} thành công, ${result.failed} thất bại.`,
      )
      await loadData()
    } catch (err: any) {
      message.error('Lỗi khi thử lại toàn bộ: ' + (err?.message || String(err)))
    } finally {
      setIsRetryingAll(false)
    }
  }, [requests.length, loadData])

  // Delete single
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await errorApiRequestsService.delete(id)
        message.success('Đã xóa yêu cầu API lỗi.')
        await loadData()
        if (selectedRecord?.id === id) {
          setIsDetailModalOpen(false)
          setSelectedRecord(null)
        }
      } catch (err: any) {
        message.error('Lỗi khi xóa: ' + (err?.message || String(err)))
      }
    },
    [loadData, selectedRecord],
  )

  // Clear all
  const handleClearAll = useCallback(async () => {
    try {
      await errorApiRequestsService.clearAll()
      message.success('Đã xóa toàn bộ lịch sử API lỗi.')
      await loadData()
      setIsDetailModalOpen(false)
      setSelectedRecord(null)
    } catch (err: any) {
      message.error('Lỗi khi xóa tất cả: ' + (err?.message || String(err)))
    }
  }, [loadData])

  // Simulate error request
  const handleSimulate = useCallback(
    async (type: '404' | '500' | 'network' | 'custom') => {
      try {
        const created = await errorApiRequestsService.simulateError(type)
        message.success(`Đã tạo yêu cầu API lỗi giả lập: [${created.method}] ${created.url}`)
        await loadData()
      } catch (err: any) {
        message.error('Không thể tạo lỗi giả lập: ' + (err?.message || String(err)))
      }
    },
    [loadData],
  )

  // Handle manual add submit
  const handleManualSubmit = useCallback(
    async (values: any) => {
      try {
        let parsedHeaders = undefined
        let parsedBody = undefined
        let parsedParams = undefined

        if (values.headers) {
          try {
            parsedHeaders = JSON.parse(values.headers)
          } catch {
            message.error('Headers phải là JSON hợp lệ!')
            return
          }
        }
        if (values.body) {
          try {
            parsedBody = JSON.parse(values.body)
          } catch {
            parsedBody = values.body
          }
        }
        if (values.params) {
          try {
            parsedParams = JSON.parse(values.params)
          } catch {
            parsedParams = values.params
          }
        }

        await errorApiRequestsService.recordError({
          url: values.url.trim(),
          method: values.method || 'GET',
          headers: parsedHeaders,
          params: parsedParams,
          body: parsedBody,
          status: values.status ?? 500,
          statusText: values.statusText || 'Manual Debug Error',
          errorMessage: values.errorMessage || 'Manually added API debug error',
          source: 'manual',
        })

        message.success('Đã thêm yêu cầu API lỗi thành công!')
        setIsManualModalOpen(false)
        manualForm.resetFields()
        await loadData()
      } catch (err: any) {
        message.error('Lỗi khi thêm: ' + (err?.message || String(err)))
      }
    },
    [loadData, manualForm],
  )

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    message.success('Đã sao chép vào clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // Method filter
      if (methodFilter !== 'ALL' && item.method.toUpperCase() !== methodFilter) {
        return false
      }

      // Status filter
      if (
        statusFilter === '2xx' &&
        item.lastStatus !== 'success' &&
        !(item.status && item.status >= 200 && item.status < 300)
      ) {
        return false
      }
      if (statusFilter === '4xx' && !(item.status && item.status >= 400 && item.status < 500)) {
        return false
      }
      if (statusFilter === '5xx' && !(item.status && item.status >= 500 && item.status < 600)) {
        return false
      }
      if (statusFilter === '0' && item.status && item.status !== 0) {
        return false
      }
      if (statusFilter === 'failed' && item.lastStatus !== 'failed') {
        return false
      }

      // Search keyword filter
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase()
        const matchUrl = item.url.toLowerCase().includes(kw)
        const matchMsg = item.errorMessage.toLowerCase().includes(kw)
        const matchMethod = item.method.toLowerCase().includes(kw)
        const matchStatus = String(item.status || '').includes(kw)
        const matchBody = item.body ? JSON.stringify(item.body).toLowerCase().includes(kw) : false
        return matchUrl || matchMsg || matchMethod || matchStatus || matchBody
      }

      return true
    })
  }, [requests, methodFilter, statusFilter, searchKeyword])

  // Stats counters
  const totalCount = requests.length
  const failedCount = requests.filter((r) => r.lastStatus === 'failed').length
  const successCount = requests.filter((r) => r.lastStatus === 'success').length
  const totalRetries = requests.reduce((acc, curr) => acc + (curr.retryCount || 0), 0)

  // Simulation dropdown menu items
  const simulateMenuItems: MenuProps['items'] = [
    {
      key: '404',
      label: 'Lỗi 404 Not Found (GET Post không tồn tại)',
      icon: <CloseCircleOutlined style={{ color: token.colorWarning }} />,
      onClick: () => handleSimulate('404'),
    },
    {
      key: '500',
      label: 'Lỗi 500 Server Error (POST payload lỗi)',
      icon: <CloseCircleOutlined style={{ color: token.colorError }} />,
      onClick: () => handleSimulate('500'),
    },
    {
      key: 'network',
      label: 'Lỗi mạng / Mất kết nối (Network Error)',
      icon: <ThunderboltOutlined style={{ color: token.magenta }} />,
      onClick: () => handleSimulate('network'),
    },
    {
      key: 'custom',
      label: 'Lỗi 400 Bad Request (Validation failure)',
      icon: <CodeOutlined style={{ color: token.colorInfo }} />,
      onClick: () => handleSimulate('custom'),
    },
  ]

  // Render Method tag
  const renderMethodTag = (method: string) => {
    const m = (method || 'GET').toUpperCase()
    let color = 'blue'
    if (m === 'POST') color = 'green'
    else if (m === 'PUT') color = 'orange'
    else if (m === 'DELETE') color = 'red'
    else if (m === 'PATCH') color = 'purple'
    return (
      <Tag color={color} style={{ fontWeight: 600, minWidth: 55, textAlign: 'center' }}>
        {m}
      </Tag>
    )
  }

  // Render Status tag
  const renderStatusTag = (status?: number, statusText?: string) => {
    if (!status || status === 0) {
      return <Tag color='magenta'>Network Err</Tag>
    }
    let color = 'default'
    if (status >= 200 && status < 300) color = 'success'
    else if (status >= 400 && status < 500) color = 'warning'
    else if (status >= 500) color = 'error'

    return (
      <Tooltip title={statusText || `HTTP ${status}`}>
        <Tag color={color} style={{ fontWeight: 600 }}>
          {status}
        </Tag>
      </Tooltip>
    )
  }

  // Table columns definition
  const columns: TableColumnsType<IErrorApiRequest> = useMemo(
    () => [
      {
        title: 'Method',
        dataIndex: 'method',
        key: 'method',
        width: 85,
        align: 'center',
        render: (method: string) => renderMethodTag(method),
      },
      {
        title: 'Endpoint / URL',
        dataIndex: 'url',
        key: 'url',
        ellipsis: true,
        render: (url: string, record: IErrorApiRequest) => {
          const fullUrl =
            record.baseURL && !url.startsWith('http')
              ? `${record.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
              : url
          return (
            <Space direction='vertical' size={0} style={{ maxWidth: '100%' }}>
              <Space direction='horizontal' size={4} style={{ maxWidth: '100%' }}>
                <Text
                  code
                  copyable={{ text: fullUrl }}
                  style={{
                    fontSize: 12,
                    wordBreak: 'break-all',
                    whiteSpace: 'normal',
                  }}
                >
                  {url}
                </Text>
              </Space>
              {record.baseURL && (
                <Text type='secondary' style={{ fontSize: 11 }}>
                  Base: {record.baseURL}
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: 'HTTP Status',
        dataIndex: 'status',
        key: 'status',
        width: 105,
        align: 'center',
        sorter: (a, b) => (a.status || 0) - (b.status || 0),
        render: (status?: number, record?: IErrorApiRequest) =>
          renderStatusTag(status, record?.statusText),
      },
      {
        title: 'Thông điệp lỗi',
        dataIndex: 'errorMessage',
        key: 'errorMessage',
        ellipsis: true,
        render: (msg: string) => (
          <Tooltip title={msg}>
            <Text type='danger' style={{ fontSize: 12 }}>
              {msg}
            </Text>
          </Tooltip>
        ),
      },
      {
        title: 'Trạng thái thử lại',
        key: 'lastStatus',
        width: 140,
        align: 'center',
        sorter: (a, b) => (a.retryCount || 0) - (b.retryCount || 0),
        render: (_: any, record: IErrorApiRequest) => {
          if (record.lastStatus === 'success') {
            return (
              <Space direction='vertical' size={2} align='center'>
                <Tag color='success' icon={<CheckCircleOutlined />}>
                  Thành công
                </Tag>
                <Text type='secondary' style={{ fontSize: 10 }}>
                  ({record.retryCount} lần thử)
                </Text>
              </Space>
            )
          }
          if (record.lastStatus === 'retrying') {
            return (
              <Tag color='processing' icon={<SyncOutlined spin />}>
                Đang gửi...
              </Tag>
            )
          }
          if (record.retryCount > 0) {
            return (
              <Space direction='vertical' size={2} align='center'>
                <Tag color='error' icon={<CloseCircleOutlined />}>
                  Thất bại
                </Tag>
                <Text type='secondary' style={{ fontSize: 10 }}>
                  ({record.retryCount} lần thử)
                </Text>
              </Space>
            )
          }
          return <Tag color='default'>Chưa thử lại</Tag>
        },
      },
      {
        title: 'Thời gian',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 145,
        defaultSortOrder: 'descend',
        sorter: (a, b) => a.timestamp - b.timestamp,
        render: (ts: number, record: IErrorApiRequest) => (
          <Tooltip
            title={`${moment(ts).format('DD/MM/YYYY HH:mm:ss')}${
              record.lastRetryAt
                ? ` (Thử lại lần cuối: ${moment(record.lastRetryAt).fromNow()})`
                : ''
            }`}
          >
            <Space direction='vertical' size={0}>
              <span style={{ fontSize: 12 }}>{moment(ts).format('HH:mm:ss DD/MM')}</span>
              <Text type='secondary' style={{ fontSize: 10 }}>
                {moment(ts).fromNow()}
              </Text>
            </Space>
          </Tooltip>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 155,
        align: 'center',
        render: (_: any, record: IErrorApiRequest) => {
          const isThisRetrying = retryingId === record.id
          return (
            <Space size={4}>
              <Tooltip title='Gửi lại yêu cầu API này ngay lập tức'>
                <Button
                  type='primary'
                  size='small'
                  icon={<PlayCircleOutlined />}
                  loading={isThisRetrying}
                  disabled={isRetryingAll}
                  onClick={() => handleRetry(record)}
                  style={{
                    backgroundColor:
                      record.lastStatus === 'success' ? token.colorSuccess : undefined,
                  }}
                >
                  Thử lại
                </Button>
              </Tooltip>

              <Tooltip title='Xem chi tiết Headers, Payload và Response'>
                <Button
                  size='small'
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedRecord(record)
                    setIsDetailModalOpen(true)
                  }}
                />
              </Tooltip>

              <Popconfirm
                title='Xác nhận xóa'
                description='Xóa yêu cầu API lỗi này khỏi bảng lưu trữ?'
                onConfirm={() => handleDelete(record.id)}
                okText='Xóa'
                cancelText='Hủy'
                okButtonProps={{ danger: true }}
              >
                <Button size='small' danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )
        },
      },
    ],
    [token.colorSuccess, retryingId, isRetryingAll, handleRetry, handleDelete],
  )

  return (
    <div>
      <Alert
        message='Bảng lưu trữ yêu cầu API lỗi & Công cụ gửi lại (API Error Requests & Replay)'
        description={
          <span>
            Tất cả các yêu cầu HTTP/API bị lỗi (từ <code>axios</code>, mạng hoặc lỗi phản hồi từ máy
            chủ) sẽ được tự động ghi lại tại đây và lưu trong IndexedDB (bảng{' '}
            <code>errorApiRequests</code>). Bạn có thể bấm nút <b>Thử lại</b> trên từng hàng hoặc{' '}
            <b>Thử lại tất cả</b> để kiểm tra và debug thuận tiện.
          </span>
        }
        type='info'
        showIcon
        icon={<ApiOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size='small' hoverable onClick={() => setStatusFilter('ALL')}>
            <Statistic
              title='Tổng số yêu cầu lỗi'
              value={totalCount}
              prefix={<ApiOutlined style={{ color: token.colorPrimary }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small' hoverable onClick={() => setStatusFilter('failed')}>
            <Statistic
              title='Đang thất bại'
              value={failedCount}
              prefix={<CloseCircleOutlined style={{ color: token.colorError }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small' hoverable onClick={() => setStatusFilter('2xx')}>
            <Statistic
              title='Đã thử lại thành công'
              value={successCount}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small'>
            <Statistic
              title='Tổng lượt đã thử lại'
              value={totalRetries}
              prefix={<ReloadOutlined style={{ color: token.colorWarning }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align='middle' justify='space-between'>
          <Col xs={24} lg={12}>
            <Space wrap size={8}>
              <Tooltip title='Thử lại lần lượt tất cả các yêu cầu API trong bảng'>
                <Button
                  type='primary'
                  icon={<PlayCircleOutlined />}
                  loading={isRetryingAll}
                  disabled={requests.length === 0}
                  onClick={handleRetryAll}
                  style={{ fontWeight: 600 }}
                >
                  Thử lại tất cả ({filteredRequests.length})
                </Button>
              </Tooltip>

              <Dropdown menu={{ items: simulateMenuItems }} placement='bottomLeft'>
                <Button icon={<ThunderboltOutlined />}>
                  Mô phỏng lỗi API <DownOutlined />
                </Button>
              </Dropdown>

              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  manualForm.resetFields()
                  setIsManualModalOpen(true)
                }}
              >
                Thêm thủ công
              </Button>

              <Popconfirm
                title='Xóa tất cả yêu cầu lỗi?'
                description='Hành động này sẽ làm trống bảng errorApiRequests trong IndexedDB.'
                onConfirm={handleClearAll}
                okText='Xóa toàn bộ'
                cancelText='Hủy'
                okButtonProps={{ danger: true }}
                disabled={requests.length === 0}
              >
                <Button danger icon={<DeleteOutlined />} disabled={requests.length === 0}>
                  Xóa tất cả
                </Button>
              </Popconfirm>

              <Button icon={<SyncOutlined />} onClick={loadData} loading={loading}>
                Làm mới
              </Button>
            </Space>
          </Col>

          <Col xs={24} lg={12}>
            <Space
              direction='horizontal'
              style={{ width: '100%', justifyContent: 'flex-end' }}
              wrap
              size={8}
            >
              <Select
                value={methodFilter}
                onChange={(val) => setMethodFilter(val)}
                style={{ width: 110 }}
                options={[
                  { label: 'Tất cả Method', value: 'ALL' },
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' },
                  { label: 'PUT', value: 'PUT' },
                  { label: 'DELETE', value: 'DELETE' },
                  { label: 'PATCH', value: 'PATCH' },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                style={{ width: 140 }}
                options={[
                  { label: 'Tất cả Status', value: 'ALL' },
                  { label: 'Thành công (2xx)', value: '2xx' },
                  { label: 'Lỗi Client (4xx)', value: '4xx' },
                  { label: 'Lỗi Server (5xx)', value: '5xx' },
                  { label: 'Lỗi Mạng (0)', value: '0' },
                  { label: 'Đang thất bại', value: 'failed' },
                ]}
              />

              <Input
                placeholder='Tìm theo URL, lỗi, payload...'
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{ width: 220 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table<IErrorApiRequest>
        dataSource={filteredRequests}
        columns={columns}
        rowKey='id'
        loading={loading}
        size='small'
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} yêu cầu API lỗi`,
        }}
        locale={{
          emptyText: (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <ApiOutlined
                style={{ fontSize: 36, color: token.colorTextDisabled, marginBottom: 8 }}
              />
              <Paragraph type='secondary'>Không có yêu cầu API lỗi nào được ghi nhận.</Paragraph>
              <Button
                type='dashed'
                icon={<ThunderboltOutlined />}
                onClick={() => handleSimulate('404')}
              >
                Tạo một API lỗi giả lập để thử nghiệm
              </Button>
            </div>
          ),
        }}
      />

      {/* Detail Modal */}
      <Modal
        title={
          selectedRecord ? (
            <Space align='center'>
              <ApiOutlined style={{ color: token.colorPrimary }} />
              <span>Chi tiết yêu cầu API lỗi</span>
              {renderMethodTag(selectedRecord.method)}
              {renderStatusTag(selectedRecord.status, selectedRecord.statusText)}
            </Space>
          ) : (
            'Chi tiết'
          )
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false)
          setSelectedRecord(null)
        }}
        width={800}
        footer={
          selectedRecord ? (
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => selectedRecord && handleDelete(selectedRecord.id)}
              >
                Xóa mục này
              </Button>
              <Space>
                <Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>
                <Button
                  type='primary'
                  icon={<PlayCircleOutlined />}
                  loading={retryingId === selectedRecord.id}
                  onClick={() => selectedRecord && handleRetry(selectedRecord)}
                >
                  Thử lại yêu cầu này
                </Button>
              </Space>
            </Space>
          ) : null
        }
      >
        {selectedRecord && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <Descriptions bordered size='small' column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label='ID'>{selectedRecord.id}</Descriptions.Item>
              <Descriptions.Item label='Phương thức'>
                {renderMethodTag(selectedRecord.method)}
              </Descriptions.Item>
              <Descriptions.Item label='HTTP Status' span={2}>
                {renderStatusTag(selectedRecord.status, selectedRecord.statusText)}
                <span style={{ marginLeft: 8 }}>{selectedRecord.statusText || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label='URL / Endpoint' span={2}>
                <Text code copyable style={{ wordBreak: 'break-all' }}>
                  {selectedRecord.url}
                </Text>
              </Descriptions.Item>
              {selectedRecord.baseURL && (
                <Descriptions.Item label='Base URL' span={2}>
                  <Text code copyable style={{ wordBreak: 'break-all' }}>
                    {selectedRecord.baseURL}
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label='Thời gian xảy ra'>
                {moment(selectedRecord.timestamp).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label='Nguồn ghi nhận'>
                <Tag>{selectedRecord.source || 'unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='Số lần đã thử lại'>
                <Badge
                  count={selectedRecord.retryCount || 0}
                  showZero
                  color={
                    selectedRecord.lastStatus === 'success' ? token.colorSuccess : token.colorError
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label='Trạng thái lần cuối'>
                {selectedRecord.lastStatus === 'success' ? (
                  <Tag color='success'>Thành công</Tag>
                ) : selectedRecord.lastStatus === 'retrying' ? (
                  <Tag color='processing'>Đang gửi...</Tag>
                ) : (
                  <Tag color='error'>Thất bại</Tag>
                )}
                {selectedRecord.lastRetryAt && (
                  <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
                    ({moment(selectedRecord.lastRetryAt).fromNow()})
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label='Thông điệp lỗi' span={2}>
                <Text type='danger' strong>
                  {selectedRecord.errorMessage}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Request Headers */}
            {selectedRecord.headers && Object.keys(selectedRecord.headers).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text strong>Request Headers:</Text>
                  <Button
                    size='small'
                    icon={copiedKey === 'headers' ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() =>
                      selectedRecord &&
                      handleCopy(JSON.stringify(selectedRecord.headers, null, 2), 'headers')
                    }
                  >
                    Sao chép
                  </Button>
                </div>
                <pre
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  {JSON.stringify(selectedRecord.headers, null, 2)}
                </pre>
              </div>
            )}

            {/* Query Params */}
            {selectedRecord.params && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text strong>Query Parameters (Params):</Text>
                  <Button
                    size='small'
                    icon={copiedKey === 'params' ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() =>
                      selectedRecord &&
                      handleCopy(JSON.stringify(selectedRecord.params, null, 2), 'params')
                    }
                  >
                    Sao chép
                  </Button>
                </div>
                <pre
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  {typeof selectedRecord.params === 'string'
                    ? selectedRecord.params
                    : JSON.stringify(selectedRecord.params, null, 2)}
                </pre>
              </div>
            )}

            {/* Request Payload / Body */}
            {selectedRecord.body !== undefined && selectedRecord.body !== null && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text strong>Request Body / Payload:</Text>
                  <Button
                    size='small'
                    icon={copiedKey === 'body' ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() =>
                      selectedRecord &&
                      handleCopy(JSON.stringify(selectedRecord.body, null, 2), 'body')
                    }
                  >
                    Sao chép
                  </Button>
                </div>
                <pre
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {typeof selectedRecord.body === 'string'
                    ? selectedRecord.body
                    : JSON.stringify(selectedRecord.body, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Body */}
            {selectedRecord.responseBody !== undefined && selectedRecord.responseBody !== null && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text strong>Response Body:</Text>
                  <Button
                    size='small'
                    icon={copiedKey === 'res' ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() =>
                      selectedRecord &&
                      handleCopy(JSON.stringify(selectedRecord.responseBody, null, 2), 'res')
                    }
                  >
                    Sao chép
                  </Button>
                </div>
                <pre
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {typeof selectedRecord.responseBody === 'string'
                    ? selectedRecord.responseBody
                    : JSON.stringify(selectedRecord.responseBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Error Details */}
            {selectedRecord.errorDetails && (
              <div>
                <Text strong>Chi tiết lỗi hệ thống / Stack:</Text>
                <pre
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 11,
                    maxHeight: 140,
                    overflowY: 'auto',
                    color: token.colorError,
                  }}
                >
                  {typeof selectedRecord.errorDetails === 'string'
                    ? selectedRecord.errorDetails
                    : JSON.stringify(selectedRecord.errorDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Manual Add Request Modal */}
      <Modal
        title='Thêm yêu cầu API lỗi thủ công'
        open={isManualModalOpen}
        onCancel={() => setIsManualModalOpen(false)}
        onOk={() => manualForm.submit()}
        okText='Thêm vào bảng'
        cancelText='Hủy'
      >
        <Form
          form={manualForm}
          layout='vertical'
          initialValues={{
            method: 'GET',
            status: 500,
            statusText: 'Internal Server Error',
            errorMessage: 'Server returned error',
          }}
          onFinish={handleManualSubmit}
        >
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name='method' label='Method' rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'DELETE', value: 'DELETE' },
                    { label: 'PATCH', value: 'PATCH' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='status' label='HTTP Status'>
                <InputNumber style={{ width: '100%' }} placeholder='500' />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='statusText' label='Status Text'>
                <Input placeholder='Server Error' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='url'
            label='URL / Endpoint'
            rules={[{ required: true, message: 'Vui lòng nhập URL!' }]}
          >
            <Input placeholder='https://api.example.com/v1/items hoặc /api/item' />
          </Form.Item>

          <Form.Item name='errorMessage' label='Thông điệp lỗi'>
            <Input placeholder='Mô tả lỗi gặp phải...' />
          </Form.Item>

          <Form.Item name='body' label='Request Body / Payload (JSON nếu có)'>
            <Input.TextArea rows={3} placeholder='{"name": "test", "value": 123}' />
          </Form.Item>

          <Form.Item name='headers' label='Headers (JSON nếu có)'>
            <Input.TextArea rows={2} placeholder='{"Authorization": "Bearer token..."}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ApiErrorRequestsTab
