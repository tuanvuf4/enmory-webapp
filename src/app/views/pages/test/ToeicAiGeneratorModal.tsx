import React, { useMemo, useRef, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Col,
  Divider,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd'
import {
  CloseOutlined,
  ExpandAltOutlined,
  LoadingOutlined,
  MinusOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { IToeicExam } from '@/models/toeic.model'
import {
  IGenerateProgress,
  IGenerateToeicExamConfig,
  MINI_TOEIC_CONFIG,
  STANDARD_ETS_CONFIG,
  ToeicDifficulty,
  generateFullToeicExamWithAI,
} from '@/services/gemini/geminiToeic.service'

const { Text } = Typography

interface ToeicAiGeneratorModalProps {
  open: boolean
  onClose: () => void
  onGenerated: (exam: IToeicExam) => void
}

type PresetType = 'standard_200' | 'mini_50' | 'custom'

const TOPIC_OPTIONS = [
  'Tổng hợp chuẩn ETS (Văn phòng, Kinh doanh, Du lịch, Mua sắm, Nhân sự)',
  'Kinh doanh, Tài chính & Hợp đồng thương mại',
  'Công nghệ thông tin & Chuyển đổi số',
  'Du lịch, Hàng không, Khách sạn & Sự kiện',
  'Nhân sự, Tuyển dụng & Đào tạo nội bộ',
  'Sản xuất, Chuỗi cung ứng & Logistics',
]

export const ToeicAiGeneratorModal: React.FC<ToeicAiGeneratorModalProps> = ({
  open,
  onClose,
  onGenerated,
}) => {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [preset, setPreset] = useState<PresetType>('standard_200')
  const [config, setConfig] = useState<IGenerateToeicExamConfig>({ ...STANDARD_ETS_CONFIG })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [progress, setProgress] = useState<IGenerateProgress | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const counts = useMemo(() => {
    const listening =
      config.part1Count + config.part2Count + config.part3Groups * 3 + config.part4Groups * 3
    // For single passages: if 10 -> 29 Qs, otherwise approximate 3 Qs avg
    const p7SingleQs =
      config.part7SingleGroups === 10
        ? 29
        : Array.from({ length: config.part7SingleGroups }, (_, i) =>
            i % 3 === 0 ? 2 : i % 3 === 1 ? 3 : 4,
          ).reduce((a, b) => a + b, 0)
    const p7Qs = p7SingleQs + config.part7DoubleGroups * 5 + config.part7TripleGroups * 5
    const reading = config.part5Count + config.part6Groups * 4 + p7Qs
    return {
      listening,
      reading,
      total: listening + reading,
    }
  }, [config])

  const handlePresetChange = (val: PresetType) => {
    setPreset(val)
    if (val === 'standard_200') {
      setConfig({ ...STANDARD_ETS_CONFIG })
    } else if (val === 'mini_50') {
      setConfig({ ...MINI_TOEIC_CONFIG })
    }
  }

  const handleGenerate = async () => {
    if (counts.total === 0) {
      message.warning('Vui lòng chọn ít nhất 1 câu hỏi để tạo đề')
      return
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsGenerating(true)
    setProgress({ stepIndex: 0, totalSteps: 7, currentLabel: 'Đang khởi tạo Gemini AI...' })

    try {
      const exam = await generateFullToeicExamWithAI(
        config,
        (p) => setProgress(p),
        controller.signal,
      )
      message.success(`Đã tạo thành công "${exam.title}" với ${counts.total} câu hỏi!`)
      onGenerated(exam)
      onClose()
    } catch (err: any) {
      if (!controller.signal.aborted) {
        message.error(err?.message || 'Không thể tạo đề bằng AI. Vui lòng kiểm tra Gemini API Key.')
      }
    } finally {
      setIsGenerating(false)
      setIsMinimized(false)
      setProgress(null)
      abortControllerRef.current = null
    }
  }

  const handleAbortGeneration = () => {
    abortControllerRef.current?.abort()
    setIsGenerating(false)
    setIsMinimized(false)
    setProgress(null)
    message.info('Đã hủy quá trình tạo đề AI')
  }

  const handleCancelModal = () => {
    if (isGenerating) {
      setIsMinimized(true)
      return
    }
    onClose()
  }

  const progressPercent =
    progress && progress.totalSteps > 0
      ? Math.round((progress.stepIndex / progress.totalSteps) * 100)
      : 0

  return (
    <>
      <Modal
        open={open && !isMinimized}
        onCancel={handleCancelModal}
        width={720}
        title={
          <div className='flex items-center justify-between pr-8'>
            <Space>
              <RobotOutlined style={{ color: token.colorPrimary }} />
              <span>Tự động tạo đề thi TOEIC bằng Gemini AI</span>
            </Space>
            {isGenerating && (
              <Button
                size='small'
                type='text'
                icon={<MinusOutlined />}
                onClick={() => setIsMinimized(true)}
              >
                Thu nhỏ
              </Button>
            )}
          </div>
        }
        footer={[
          isGenerating ? (
            <Button key='minimize' icon={<MinusOutlined />} onClick={() => setIsMinimized(true)}>
              Thu nhỏ
            </Button>
          ) : null,
          <Button
            key='cancel'
            danger={isGenerating}
            onClick={isGenerating ? handleAbortGeneration : onClose}
          >
            {isGenerating ? 'Hủy tạo đề' : 'Đóng'}
          </Button>,
          <Button
            key='submit'
            type='primary'
            icon={<ThunderboltOutlined />}
            loading={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Đang tạo đề...' : `Tạo đề (${counts.total} câu)`}
          </Button>,
        ]}
      >
        <Space direction='vertical' size={14} style={{ width: '100%' }}>
          <Segmented
            block
            disabled={isGenerating}
            value={preset}
            onChange={(v) => handlePresetChange(v as PresetType)}
            options={[
              { label: 'Full Test Chuẩn ETS (200 câu)', value: 'standard_200' },
              { label: 'Mini Test Nhanh (50 câu)', value: 'mini_50' },
              { label: 'Tùy chỉnh số câu', value: 'custom' },
            ]}
          />

          <Row gutter={[12, 12]}>
            <Col xs={24} md={16}>
              <Text strong>Tên đề thi</Text>
              <Input
                disabled={isGenerating}
                style={{ marginTop: 4 }}
                value={config.title}
                onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Thời gian (phút)</Text>
              <InputNumber
                disabled={isGenerating}
                style={{ width: '100%', marginTop: 4 }}
                min={5}
                max={180}
                value={config.durationMinutes}
                onChange={(v) => setConfig((prev) => ({ ...prev, durationMinutes: v || 120 }))}
              />
            </Col>
            <Col xs={24} md={16}>
              <Text strong>Chủ đề / Ngữ cảnh</Text>
              <Select
                disabled={isGenerating}
                style={{ width: '100%', marginTop: 4 }}
                value={config.topic}
                onChange={(val) => setConfig((prev) => ({ ...prev, topic: val }))}
                options={TOPIC_OPTIONS.map((t) => ({ value: t, label: t }))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Mục tiêu điểm</Text>
              <Select
                disabled={isGenerating}
                style={{ width: '100%', marginTop: 4 }}
                value={config.difficulty}
                onChange={(val) =>
                  setConfig((prev) => ({ ...prev, difficulty: val as ToeicDifficulty }))
                }
                options={[
                  { value: '450-600', label: 'Cơ bản (450–600)' },
                  { value: '600-750', label: 'Trung cấp (600–750)' },
                  { value: '750-900+', label: 'Nâng cao (750–900+)' },
                ]}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
              <Text strong>Cấu trúc số câu hỏi:</Text>
              <Space size={6}>
                <Tag color='blue'>Listening: {counts.listening} câu</Tag>
                <Tag color='green'>Reading: {counts.reading} câu</Tag>
                <Tag color='geekblue'>Tổng: {counts.total} câu</Tag>
              </Space>
            </div>

            <Row gutter={[10, 10]}>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 1 (Mô tả tranh - câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={10}
                  value={config.part1Count}
                  onChange={(v) => setConfig((p) => ({ ...p, part1Count: v ?? 0 }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 2 (Hỏi-Đáp - câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={30}
                  value={config.part2Count}
                  onChange={(v) => setConfig((p) => ({ ...p, part2Count: v ?? 0 }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 3 (Cụm 3 câu = {config.part3Groups * 3} câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={15}
                  value={config.part3Groups}
                  onChange={(v) => setConfig((p) => ({ ...p, part3Groups: v ?? 0 }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 4 (Cụm 3 câu = {config.part4Groups * 3} câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={12}
                  value={config.part4Groups}
                  onChange={(v) => setConfig((p) => ({ ...p, part4Groups: v ?? 0 }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 5 (Điền câu - câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={40}
                  value={config.part5Count}
                  onChange={(v) => setConfig((p) => ({ ...p, part5Count: v ?? 0 }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 6 (Đoạn 4 câu = {config.part6Groups * 4} câu)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={6}
                  value={config.part6Groups}
                  onChange={(v) => setConfig((p) => ({ ...p, part6Groups: v ?? 0 }))}
                />
              </Col>
              <Col xs={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 7 Đoạn đơn
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={12}
                  value={config.part7SingleGroups}
                  onChange={(v) => setConfig((p) => ({ ...p, part7SingleGroups: v ?? 0 }))}
                />
              </Col>
              <Col xs={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 7 Đoạn kép (x5)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={5}
                  value={config.part7DoubleGroups}
                  onChange={(v) => setConfig((p) => ({ ...p, part7DoubleGroups: v ?? 0 }))}
                />
              </Col>
              <Col xs={8}>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Part 7 Đoạn ba (x5)
                </Text>
                <InputNumber
                  disabled={isGenerating || preset !== 'custom'}
                  style={{ width: '100%' }}
                  min={0}
                  max={5}
                  value={config.part7TripleGroups}
                  onChange={(v) => setConfig((p) => ({ ...p, part7TripleGroups: v ?? 0 }))}
                />
              </Col>
            </Row>
          </div>

          {isGenerating && progress ? (
            <Alert
              type='info'
              showIcon
              message={progress.currentLabel}
              description={<Progress percent={progressPercent} status='active' />}
            />
          ) : (
            <Alert
              type='info'
              showIcon
              message='Tạo đề chuẩn cấu trúc ETS bằng Gemini AI'
              description='Đề Full Test 200 câu được tạo theo từng Part (Part 1–7) kèm kịch bản đọc giọng Gemini TTS và giải thích tiếng Việt cho từng câu.'
            />
          )}
        </Space>
      </Modal>

      {isGenerating && isMinimized && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 1050,
            background: token.colorBgElevated,
            border: `1px solid ${token.colorPrimaryBorder}`,
            borderRadius: token.borderRadiusLG,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
            padding: '12px 16px',
          }}
        >
          <div className='flex items-center justify-between gap-2 mb-1.5'>
            <Space size={8}>
              <LoadingOutlined style={{ color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 13 }}>
                Đang tạo đề TOEIC AI ({progressPercent}%)
              </Text>
            </Space>
            <Space size={4}>
              <Button
                size='small'
                type='text'
                icon={<ExpandAltOutlined />}
                title='Mở rộng modal'
                onClick={() => setIsMinimized(false)}
              />
              <Button
                size='small'
                type='text'
                danger
                icon={<CloseOutlined />}
                title='Hủy tạo đề'
                onClick={handleAbortGeneration}
              />
            </Space>
          </div>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            {progress?.currentLabel || 'Đang xử lý...'}
          </Text>
          <Progress percent={progressPercent} size='small' status='active' showInfo={false} />
        </div>
      )}
    </>
  )
}
