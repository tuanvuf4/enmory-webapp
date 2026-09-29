import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  Input,
  Button,
  Space,
  Typography,
  Card,
  Tag,
  Alert,
  Flex,
  Collapse,
  Spin,
  theme,
} from 'antd'
import {
  RobotOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckOutlined,
  EditOutlined,
  ThunderboltOutlined,
  SoundOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import {
  DEFAULT_TRANSCRIPT_DESCRIPTION,
  transcriptService,
  IGenerateTranscriptResponse,
} from '@/services/openai/transcript.service'
import { parseTranscript, formatSegmentTime } from '../../player/transcriptUtils'
import { usePrompt } from '@/helpers/hooks'

const { TextArea } = Input
const { Text } = Typography

export interface IGenerateTranscriptModalProps {
  open: boolean
  onClose: () => void
  initialDescription?: string
  onApply: (data: {
    title: string
    description: string
    transcript: string
    translation?: string
  }) => void
}

export const GenerateTranscriptModal: React.FC<IGenerateTranscriptModalProps> = ({
  open,
  onClose,
  initialDescription,
  onApply,
}) => {
  const { token } = theme.useToken()
  const { message } = usePrompt()

  // Form states
  const [description, setDescription] = useState(
    initialDescription?.trim() ? initialDescription : DEFAULT_TRANSCRIPT_DESCRIPTION,
  )
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState<string>('')
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')
  const [result, setResult] = useState<IGenerateTranscriptResponse | null>(null)

  // Preview TTS player state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [previewSegmentIndex, setPreviewSegmentIndex] = useState<number>(-1)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset or update description when modal opens
  useEffect(() => {
    if (open) {
      if (initialDescription?.trim()) {
        // Strip HTML if it contains tags
        const cleanDesc = initialDescription.replace(/<[^>]*>?/gm, '').trim()
        setDescription(cleanDesc || DEFAULT_TRANSCRIPT_DESCRIPTION)
      } else {
        setDescription(DEFAULT_TRANSCRIPT_DESCRIPTION)
      }
      setIsPlayingPreview(false)
      stopPreview()
    } else {
      stopPreview()
    }
  }, [open, initialDescription])

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopPreview()
    }
  }, [])

  const stopPreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    setIsPlayingPreview(false)
    setPreviewSegmentIndex(-1)
  }

  // Play preview of generated transcript using Web Speech API
  const handleTogglePlayPreview = () => {
    if (isPlayingPreview) {
      stopPreview()
      return
    }

    if (!result?.transcript) return

    const segments = parseTranscript(result.transcript)
    if (!segments.length) {
      message({ type: 'warning', content: 'Không tìm thấy phân đoạn transcript hợp lệ để phát.' })
      return
    }

    if (!('speechSynthesis' in window)) {
      message({ type: 'error', content: 'Trình duyệt của bạn không hỗ trợ Web Speech API.' })
      return
    }

    setIsPlayingPreview(true)
    let currentIdx = 0

    const speakNext = () => {
      if (currentIdx >= segments.length) {
        stopPreview()
        return
      }

      setPreviewSegmentIndex(currentIdx)
      const seg = segments[currentIdx]
      const utterance = new SpeechSynthesisUtterance(seg.text)
      utterance.lang = 'en-US'
      utterance.rate = 1.0

      const voices = window.speechSynthesis.getVoices()
      const enVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('US')),
        ) || voices.find((v) => v.lang.startsWith('en'))

      if (enVoice) {
        utterance.voice = enVoice
      }

      utterance.onend = () => {
        currentIdx++
        if (currentIdx < segments.length) {
          // Pause slightly between segments
          previewTimerRef.current = setTimeout(speakNext, 500)
        } else {
          stopPreview()
        }
      }

      utterance.onerror = () => {
        stopPreview()
      }

      window.speechSynthesis.speak(utterance)
    }

    window.speechSynthesis.cancel()
    speakNext()
  }

  // One-click Auto Generation: 1. Generate prompt from description -> 2. Generate transcript
  const handleAutoGenerate = async () => {
    try {
      setLoading(true)
      stopPreview()
      setStatusText('Bước 1/2: Đang sử dụng OpenAI tạo prompt chuyên biệt từ description...')

      // Step 1: Create prompt from description
      const prompt = await transcriptService.generatePromptFromDescription(description)
      setGeneratedPrompt(prompt)

      // Step 2: Generate transcript based on prompt
      setStatusText('Bước 2/2: Đang tạo bài nghe tiếng Anh 5-10 phút (kèm timestamps M:SS)...')
      const genResult = await transcriptService.generateTranscriptFromPrompt(prompt)

      setResult(genResult)
      message({ type: 'success', content: 'Đã tạo transcript bài nghe thành công!' })
    } catch (error: any) {
      console.error(error)
      message({
        type: 'error',
        content: error?.message || 'Không thể tạo transcript. Vui lòng kiểm tra API key.',
      })
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  // Step 1 only: generate prompt
  const handleGeneratePromptOnly = async () => {
    try {
      setLoading(true)
      setStatusText('Đang sử dụng OpenAI tạo prompt từ description...')
      const prompt = await transcriptService.generatePromptFromDescription(description)
      setGeneratedPrompt(prompt)
      message({ type: 'success', content: 'Tạo prompt thành công! Bạn có thể chỉnh sửa bên dưới.' })
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Lỗi khi tạo prompt.' })
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  // Step 2: generate transcript from existing prompt
  const handleGenerateTranscriptFromPrompt = async () => {
    if (!generatedPrompt.trim()) {
      message({ type: 'warning', content: 'Vui lòng tạo hoặc nhập prompt trước.' })
      return
    }

    try {
      setLoading(true)
      stopPreview()
      setStatusText('Đang tạo bài nghe tiếng Anh 5-10 phút từ prompt...')
      const genResult = await transcriptService.generateTranscriptFromPrompt(generatedPrompt)
      setResult(genResult)
      message({ type: 'success', content: 'Tạo transcript thành công!' })
    } catch (error: any) {
      message({ type: 'error', content: error?.message || 'Lỗi khi tạo transcript.' })
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  // Apply results to parent MediaUploadForm
  const handleApply = () => {
    if (!result) return

    onApply({
      title: result.title,
      description: result.description || description,
      transcript: result.transcript,
      translation: result.translation,
    })

    stopPreview()
    onClose()
  }

  // Calculate parsed segments info
  const segments = result?.transcript ? parseTranscript(result.transcript) : []
  const durationEstimate =
    segments.length > 0 ? formatSegmentTime(segments[segments.length - 1].timeSeconds + 20) : '0:00'

  return (
    <Modal
      title={
        <Flex align='center' gap={8}>
          <RobotOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
          <span>Tự động tạo Transcript bài nghe bằng AI (OpenAI)</span>
        </Flex>
      }
      open={open}
      onCancel={() => {
        stopPreview()
        onClose()
      }}
      width={850}
      footer={
        <Flex justify='space-between' align='center'>
          <Button
            onClick={() => {
              stopPreview()
              onClose()
            }}
          >
            Đóng
          </Button>

          <Space>
            {result && (
              <Button
                icon={isPlayingPreview ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handleTogglePlayPreview}
              >
                {isPlayingPreview ? 'Dừng nghe thử' : 'Nghe thử Audio (TTS)'}
              </Button>
            )}

            <Button
              type='primary'
              icon={<CheckOutlined />}
              disabled={!result?.transcript}
              onClick={handleApply}
            >
              Áp dụng vào Media
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* Description Section */}
        <div>
          <Flex justify='space-between' align='center' style={{ marginBottom: 6 }}>
            <Text strong>
              <FileTextOutlined style={{ marginRight: 6 }} />
              Chủ đề & Mô tả bài nghe (Description):
            </Text>
            <Button
              size='small'
              type='link'
              onClick={() => setDescription(DEFAULT_TRANSCRIPT_DESCRIPTION)}
            >
              Dùng mô tả mặc định
            </Button>
          </Flex>

          <TextArea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Nhập yêu cầu, chủ đề cuộc trò chuyện, tình huống giao tiếp...'
            disabled={loading}
          />
          <Text type='secondary' style={{ fontSize: 12 }}>
            OpenAI sẽ phân tích mô tả này để tạo prompt chuyên nghiệp, sau đó viết kịch bản hội
            thoại 5-10 phút kèm mốc thời gian (timestamps M:SS).
          </Text>
        </div>

        {/* Action Buttons */}
        <Flex gap={8} wrap='wrap'>
          <Button
            type='primary'
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={handleAutoGenerate}
            size='middle'
          >
            Tạo tự động ngay (1-Click)
          </Button>

          <Button
            icon={<EditOutlined />}
            loading={loading}
            onClick={handleGeneratePromptOnly}
            size='middle'
          >
            Chỉ tạo Prompt bằng OpenAI
          </Button>
        </Flex>

        {/* Loading Spinner with status message */}
        {loading && (
          <Alert
            message={
              <Flex align='center' gap={12}>
                <Spin size='small' />
                <Text strong>{statusText || 'Đang xử lý...'}</Text>
              </Flex>
            }
            type='info'
            showIcon={false}
          />
        )}

        {/* Generated Prompt Accordion (View/Edit) */}
        {generatedPrompt && (
          <Collapse
            defaultActiveKey={!result ? ['prompt'] : []}
            items={[
              {
                key: 'prompt',
                label: (
                  <Flex
                    align='center'
                    justify='space-between'
                    style={{ width: '100%', paddingRight: 12 }}
                  >
                    <span>
                      <RobotOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                      <strong>Prompt do OpenAI tạo dựa trên Description</strong>
                    </span>
                    <Tag color='processing'>Prompt Ready</Tag>
                  </Flex>
                ),
                children: (
                  <Space direction='vertical' style={{ width: '100%' }} size='small'>
                    <TextArea
                      rows={6}
                      value={generatedPrompt}
                      onChange={(e) => setGeneratedPrompt(e.target.value)}
                      placeholder='Prompt do OpenAI tạo...'
                    />
                    <Flex justify='flex-end'>
                      <Button
                        type='primary'
                        size='small'
                        icon={<ThunderboltOutlined />}
                        loading={loading}
                        onClick={handleGenerateTranscriptFromPrompt}
                      >
                        Tạo Transcript từ Prompt này
                      </Button>
                    </Flex>
                  </Space>
                ),
              },
            ]}
          />
        )}

        {/* Results Preview */}
        {result && (
          <Card
            size='small'
            title={
              <Flex justify='space-between' align='center'>
                <Flex align='center' gap={8}>
                  <SoundOutlined style={{ color: token.colorPrimary }} />
                  <span>Kết quả bài nghe đã tạo</span>
                </Flex>
                <Space>
                  <Tag color='cyan'>{segments.length} phân đoạn</Tag>
                  <Tag color='purple'>Thời lượng ~{durationEstimate}</Tag>
                </Space>
              </Flex>
            }
            style={{ borderColor: token.colorPrimaryBorder }}
          >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div>
                <Text strong>Tiêu đề: </Text>
                <Text>{result.title}</Text>
              </div>

              {result.description && (
                <div>
                  <Text strong>Tóm tắt: </Text>
                  <Text type='secondary'>{result.description}</Text>
                </div>
              )}

              <div>
                <Flex justify='space-between' align='center' style={{ marginBottom: 4 }}>
                  <Text strong>Transcript preview ({segments.length} segments):</Text>
                  <Button
                    size='small'
                    icon={isPlayingPreview ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={handleTogglePlayPreview}
                  >
                    {isPlayingPreview ? 'Dừng phát' : 'Nghe thử TTS'}
                  </Button>
                </Flex>

                <div
                  style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: token.colorFillAlter,
                    padding: 12,
                    borderRadius: token.borderRadiusSM,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  {segments.map((seg, idx) => {
                    const isCurrent = previewSegmentIndex === idx
                    return (
                      <div
                        key={idx}
                        style={{
                          marginBottom: 8,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: isCurrent ? token.colorPrimaryBg : 'transparent',
                          borderLeft: isCurrent ? `3px solid ${token.colorPrimary}` : 'none',
                        }}
                      >
                        <Tag color='blue' style={{ fontFamily: 'monospace' }}>
                          {formatSegmentTime(seg.timeSeconds)}
                        </Tag>
                        <Text style={{ fontWeight: isCurrent ? 600 : 'normal' }}>{seg.text}</Text>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  )
}
