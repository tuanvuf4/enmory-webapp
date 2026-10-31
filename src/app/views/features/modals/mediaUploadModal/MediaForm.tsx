import { initMediaForm, msgErrors } from '@/constant/index'
import {
  RobotOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
  FileTextOutlined,
  LinkOutlined,
  SoundOutlined,
  LoadingOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { theme, Input, Row, Col, Button, Select, Flex, Switch, Tag, Typography, Spin } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { appSetting } from '@/config/appConfig'
import { IMediaForm, ITracks } from '@/models/media.model'
import { tracksApi } from '@/services/firebase'
import { useState, useEffect } from 'react'
import { TextEditor, InputTag, TagSelect } from '@/views/components'
import { usePrompt } from '@/helpers/hooks'
import { useSelector, useDispatch } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { GenerateTranscriptModal } from '../generateTranscriptModal'
import {
  GEMINI_VOICES,
  geminiVocabClassifierService,
  geminiTranscriptService,
} from '@/services/gemini'
import { IClassifiedVocabItem } from '@/models/vocabClassification.model'
import { useModal, useCurrentModal } from '@/context/modal.context'
import styles from './mediaUploadModal.module.scss'
import moment from 'moment'

interface IMediaUploadFormProps {
  onConfirm?: (track: ITracks) => void
  onCancel?: () => void
  trackData?: ITracks
}

export type IMediaFormProps = IMediaUploadFormProps

export const MediaForm: React.FC<IMediaFormProps> = ({ onCancel, onConfirm, trackData }) => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [autoClassifyVocab, setAutoClassifyVocab] = useState<boolean>(true)
  const [isTranslating, setIsTranslating] = useState(false)
  const dispatch = useDispatch()
  const { updateModal, minimizeModal } = useModal()
  const currentModal = useCurrentModal()

  const handleMinimize = () => {
    if (currentModal?.minimize) {
      currentModal.minimize()
    } else {
      minimizeModal()
    }
  }

  const { currentTrack, tracks } = useSelector((state) => state.listening)

  const { TextArea } = Input

  const schema = yup.object().shape({
    title: yup
      .string()
      .required(msgErrors.required)
      .max(
        appSetting.listening.maxLengthShortInput,
        msgErrors.maxLength('Title', appSetting.listening.maxLengthShortInput),
      ),
    description: yup
      .string()
      .max(
        appSetting.listening.maxLengthTranscript,
        msgErrors.maxLength('Description', appSetting.listening.maxLengthTranscript),
      ),
    transcript: yup
      .string()
      .max(
        appSetting.listening.maxLengthTranscript,
        msgErrors.maxLength('Transcript', appSetting.listening.maxLengthTranscript),
      ),
    translation: yup
      .string()
      .max(
        appSetting.listening.maxLengthTranscript,
        msgErrors.maxLength('Translation', appSetting.listening.maxLengthTranscript),
      ),
    tags: yup.array().of(yup.string()).optional(),
    relation: yup.array().of(yup.string()).optional(),
    srcUrl: yup.string(),
    srcType: yup.number(),
    voice: yup.string().optional(),
    vocabClassification: yup.array().optional(),
  }) as yup.ObjectSchema<IMediaForm>

  const [openGenerateModal, setOpenGenerateModal] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<IMediaForm>({
    defaultValues: trackData || initMediaForm,
    mode: 'all',
    resolver: yupResolver(schema),
  })

  const isEditing = !!trackData?.id

  useEffect(() => {
    updateModal({
      tag: isEditing ? <Tag color={'yellow'}>UPDATE</Tag> : <Tag color={'green'}>CREATE</Tag>,
    })
  }, [isEditing])

  const trackTitle = watch('title')
  useEffect(() => {
    if (trackTitle?.trim()) {
      updateModal({
        minimizeInfo: {
          title: `Track: ${trackTitle.trim()}`,
          tooltip: `Mở lại bài nghe: ${trackTitle.trim()}`,
          icon: <SoundOutlined />,
        },
      })
    }
  }, [trackTitle])

  const handleApplyGeneratedTranscript = (data: {
    title: string
    description: string
    transcript: string
    translation?: string
    voice?: string
  }) => {
    setValue('transcript', data.transcript, { shouldValidate: true, shouldDirty: true })
    if (data.title && !getValues('title')) {
      setValue('title', data.title, { shouldValidate: true, shouldDirty: true })
    }
    if (data.description && (!getValues('description') || getValues('description') === '<p></p>')) {
      setValue('description', data.description, { shouldValidate: true, shouldDirty: true })
    }
    if (data.translation) {
      setValue('translation', data.translation, { shouldValidate: true, shouldDirty: true })
    }
    if (!getValues('srcUrl')) {
      setValue('srcUrl', '', { shouldValidate: true, shouldDirty: true })
    }
    if (data.voice) {
      setValue('voice', data.voice, { shouldValidate: true, shouldDirty: true })
    }
  }

  // Handle translation from current transcript
  const handleTranslateFromTranscript = async () => {
    const transcript = (getValues('transcript') || '').trim()
    if (!transcript) {
      message({
        type: 'warning',
        content: 'Vui lòng nhập hoặc tạo nội dung Transcript trước khi dịch.',
      })
      return
    }

    try {
      setIsTranslating(true)
      updateModal({
        isMinimized: true,
        minimizeInfo: {
          title: 'Dịch transcript',
          tooltip: 'Gemini AI đang dịch transcript...',
          status: 'processing',
          icon: <TranslationOutlined spin style={{ color: '#1677ff' }} />,
        },
      })
      message({
        type: 'info',
        content: 'Biểu mẫu đã thu nhỏ xuống nút tròn góc phải trong khi Gemini đang dịch...',
        duration: 3,
      })
      const result = await geminiTranscriptService.translateTranscript(transcript)
      if (result) {
        setValue('translation', result, { shouldValidate: true, shouldDirty: true })
        updateModal({
          minimizeInfo: {
            title: 'Dịch transcript',
            tooltip: 'Gemini đã dịch xong transcript!',
            status: 'success',
            icon: <SoundOutlined />,
          },
        })
        message({
          type: 'success',
          content: 'Đã dịch transcript sang tiếng Việt thành công! Nhấn nút tròn để mở lại.',
          key: 'translating-transcript',
        })
      }
    } catch (err: any) {
      updateModal({
        minimizeInfo: {
          title: 'Dịch transcript',
          tooltip: 'Có lỗi xảy ra khi dịch transcript.',
          status: 'error',
          icon: <SoundOutlined />,
        },
      })
      message({
        type: 'error',
        content: err?.message || 'Có lỗi xảy ra khi dịch transcript.',
        key: 'translating-transcript',
      })
    } finally {
      setIsTranslating(false)
    }
  }

  // Reset form when trackData changes
  useEffect(() => {
    if (trackData?.id) {
      reset({
        title: trackData.title,
        description: trackData.description,
        transcript: trackData.transcript,
        translation: trackData.translation,
        tags: trackData.tags || [],
        relation: trackData.relation || [],
        srcUrl: trackData.srcUrl || '',
        srcType: trackData.srcType,
        voice: trackData.voice || 'auto',
        vocabClassification: trackData.vocabClassification || [],
      })
    } else {
      reset(initMediaForm)
    }
  }, [trackData, reset])

  const onSubmit = async (data: IMediaForm) => {
    try {
      setLoading(true)
      setSaveStatus('Đang chuẩn bị lưu bài nghe...')

      let classifiedVocab: IClassifiedVocabItem[] = trackData?.vocabClassification || []
      const currentTranscript = (data.transcript || '').trim()
      const originalTranscript = (trackData?.transcript || '').trim()
      const transcriptChanged = currentTranscript !== originalTranscript

      // Run Gemini vocabulary classification on save if enabled and transcript exists
      if (
        currentTranscript &&
        autoClassifyVocab &&
        (!classifiedVocab.length || transcriptChanged)
      ) {
        try {
          setSaveStatus('Đang phân loại từ vựng (A1 → C2)...')
          const classifyRes = await geminiVocabClassifierService.classifyTranscript(
            currentTranscript,
            trackData?.id,
          )
          if (classifyRes.isSuccess && classifyRes.content?.items?.length) {
            classifiedVocab = classifyRes.content.items
          }
        } catch (classifyErr) {
          console.warn('[MediaUploadForm] Auto classification failed on save:', classifyErr)
        }
      }

      setSaveStatus('Đang lưu bài nghe và dữ liệu từ vựng lên Firestore...')

      const dataSubmit: any = {
        ...data,
        srcUrl: data.srcUrl?.trim() || '',
        tags: data.tags || [],
        relation: data.relation || [],
        voice: data.voice || 'auto',
        vocabClassification: classifiedVocab,
      }

      let result: any

      if (trackData?.id) {
        result = await tracksApi.updateTrack(String(trackData.id), dataSubmit)
      } else {
        result = await tracksApi.addTrack(dataSubmit)
      }

      if (result.isSuccess && result.content) {
        // Cache locally for instant offline/fast access
        if (classifiedVocab.length > 0) {
          geminiVocabClassifierService.setCached(String(result.content.id), {
            trackId: result.content.id,
            items: classifiedVocab,
            summary: `Đã phân loại ${classifiedVocab.length} từ vựng, cụm từ & collocation theo chuẩn CEFR.`,
            updatedAt: Date.now(),
          })
        }

        const successMsg =
          classifiedVocab.length > 0
            ? `${result.message || 'Đã lưu bài nghe thành công!'} (Đã phân loại & lưu ${classifiedVocab.length} từ vựng lên Firestore)`
            : result.message || 'Đã lưu bài nghe thành công!'

        message({ type: 'success', content: successMsg })
        if (trackData?.id) {
          dispatch(listeningAction.updateTrack(result.content))
        } else {
          const trackIndex = tracks.findIndex((t) => t.id === currentTrack?.id)
          dispatch(listeningAction.addTrack(result.content))
          dispatch(settingAction.setTrackIndex(trackIndex + 1))
        }
        reset()
        onConfirm?.(result.content)
      } else {
        message({ type: 'error', content: result.message || 'Failed to save track' })
      }
    } catch (error: any) {
      message({ type: 'error', content: error.message || 'Error saving track' })
    } finally {
      setLoading(false)
      setSaveStatus('')
    }
  }

  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  const handleTagUpdated = (previousValue: string, nextValue: string) => {
    const currentTags = getValues('tags') || []
    const nextTags = Array.from(
      new Set(currentTags.map((tag) => (tag === previousValue ? nextValue : tag))),
    )
    setValue('tags', nextTags)
  }

  const handleTagDeleted = (deletedValue: string) => {
    const currentTags = getValues('tags') || []
    setValue(
      'tags',
      currentTags.filter((tag) => tag !== deletedValue),
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer}>
        {/* ── Section 1: Thông tin cơ bản ── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FileTextOutlined className={styles.sectionIcon} />
              <span>Thông tin bài nghe</span>
            </div>
          </div>

          <Row gutter={[16, 12]}>
            {/* Title */}
            <Col xs={24}>
              <div className={styles.fieldLabel}>
                <span>
                  Tiêu đề bài nghe: <span className={styles.requiredAsterisk}>*</span>
                </span>
                {errors.title && (
                  <span style={{ color: 'red', fontSize: '12px' }}>{errors.title.message}</span>
                )}
              </div>
              <Controller
                control={control}
                name='title'
                render={({ field }) => (
                  <Input
                    size='large'
                    placeholder='Nhập tiêu đề bài nghe (ví dụ: Frontend Daily Standup Meeting)...'
                    {...field}
                  />
                )}
              />
            </Col>

            {/* Tags */}
            <Col xs={24} md={12}>
              <div className={styles.fieldLabel}>
                <span>Tags:</span>
              </div>
              <Controller
                control={control}
                name='tags'
                render={({ field }) => (
                  <TagSelect
                    style={{ width: '100%' }}
                    value={field.value || []}
                    onChange={field.onChange}
                    onTagUpdated={handleTagUpdated}
                    onTagDeleted={handleTagDeleted}
                  />
                )}
              />
            </Col>

            {/* Relation */}
            <Col xs={24} md={12}>
              <div className={styles.fieldLabel}>
                <span>Relation:</span>
              </div>
              <Controller
                control={control}
                name='relation'
                render={({ field }) => (
                  <InputTag
                    tags={field.value || []}
                    onChange={(value: string[]) => {
                      field.onChange(value)
                    }}
                  />
                )}
              />
            </Col>

            {/* Description */}
            <Col xs={24}>
              <div className={styles.fieldLabel}>
                <span>Mô tả bài nghe:</span>
                {errors.description && (
                  <span style={{ color: 'red', fontSize: '12px' }}>
                    {errors.description.message}
                  </span>
                )}
              </div>
              <Controller
                control={control}
                name='description'
                render={({ field }) => (
                  <TextEditor content={field.value} onChange={field.onChange} />
                )}
              />
            </Col>
          </Row>
        </div>

        {/* ── Section 2: Nguồn phát & Giọng đọc ── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <LinkOutlined className={styles.sectionIcon} />
              <span>Nguồn âm thanh & Giọng đọc</span>
            </div>
          </div>

          <Row gutter={[16, 12]}>
            <Col xs={24} md={!watch('srcUrl') || watch('srcUrl') === 'transcript' ? 14 : 24}>
              <div className={styles.fieldLabel}>
                <span>Source URL:</span>
                {errors.srcUrl && (
                  <span style={{ color: 'red', fontSize: '12px' }}>{errors.srcUrl.message}</span>
                )}
              </div>
              <Controller
                control={control}
                name='srcUrl'
                render={({ field }) => (
                  <Input
                    placeholder='Nhập link YouTube, Spotify, mp3... (hoặc để trống nếu tạo từ Transcript)'
                    {...field}
                  />
                )}
              />
              <div className={styles.helperText}>
                Để trống nếu muốn bài nghe được đọc tự động bằng giọng AI Gemini TTS từ Transcript.
              </div>
            </Col>

            {(!watch('srcUrl') || watch('srcUrl') === 'transcript') && (
              <Col xs={24} md={10}>
                <div className={styles.fieldLabel}>
                  <span>
                    <SoundOutlined style={{ marginRight: 4, color: token.colorPrimary }} />
                    Giọng đọc Gemini TTS:
                  </span>
                </div>
                <Controller
                  control={control}
                  name='voice'
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value || 'auto'}
                      style={{ width: '100%' }}
                      options={GEMINI_VOICES.map((v) => ({
                        value: v.value,
                        label: v.label,
                      }))}
                    />
                  )}
                />
              </Col>
            )}
          </Row>
        </div>

        {/* ── Section 3: Nội dung bài nghe & Bản dịch song ngữ ── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <TranslationOutlined className={styles.sectionIcon} />
              <span>Nội dung bài nghe & Bản dịch song ngữ</span>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            {/* Transcript Column */}
            <Col xs={24} md={12}>
              <div className={styles.transcriptCol}>
                <div className={styles.transcriptHeader}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    Transcript:
                    {errors.transcript && (
                      <span style={{ color: 'red', fontSize: '12px', marginLeft: 6 }}>
                        {errors.transcript.message}
                      </span>
                    )}
                  </span>

                  <Button
                    type='primary'
                    size='small'
                    icon={<RobotOutlined />}
                    onClick={() => setOpenGenerateModal(true)}
                  >
                    Tự động tạo (AI)
                  </Button>
                </div>

                <Controller
                  control={control}
                  name='transcript'
                  render={({ field }) => (
                    <TextArea
                      autoSize={{ minRows: 8, maxRows: 16 }}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <div className={styles.helperText}>
                  Mỗi câu thoại nên bắt đầu bằng mốc thời gian dạng <code>0:00</code> hoặc{' '}
                  <code>1:25</code> để đồng bộ Karaoke.
                </div>
              </div>
            </Col>

            {/* Translation Column */}
            <Col xs={24} md={12}>
              <div className={styles.transcriptCol}>
                <div className={styles.transcriptHeader}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    Translation:
                    {errors.translation && (
                      <span style={{ color: 'red', fontSize: '12px', marginLeft: 6 }}>
                        {errors.translation.message}
                      </span>
                    )}
                  </span>

                  <Button
                    type='primary'
                    ghost
                    size='small'
                    icon={isTranslating ? <LoadingOutlined /> : <TranslationOutlined />}
                    loading={isTranslating}
                    onClick={handleTranslateFromTranscript}
                  >
                    Dịch từ Transcript (AI)
                  </Button>
                </div>

                <Controller
                  control={control}
                  name='translation'
                  render={({ field }) => (
                    <TextArea
                      autoSize={{ minRows: 8, maxRows: 16 }}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <div className={styles.helperText}>
                  Bản dịch giữ nguyên các mốc thời gian để hiển thị phụ đề song ngữ cho bài nghe.
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* ── Section 4: Phân loại từ vựng tự động (CEFR A1 → C2) ── */}
        {watch('transcript')?.trim() && (
          <div
            style={{
              padding: '12px 16px',
              background: token.colorFillQuaternary,
              borderRadius: 10,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
              <Flex align='center' gap={10}>
                <RobotOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    Tự động phân loại từ vựng theo chuẩn CEFR (A1 → C2)
                  </div>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                    Trích xuất từ vựng từ transcript và phân loại theo chuẩn CEFR (sẽ tự động phân
                    tích và lưu khi nhấn Update/Save).
                  </div>
                </div>
              </Flex>
              <Switch
                checked={autoClassifyVocab}
                onChange={(checked) => setAutoClassifyVocab(checked)}
              />
            </Flex>
            {trackData?.vocabClassification && trackData.vocabClassification.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag color='success' icon={<CheckCircleOutlined />}>
                  Đã có {trackData.vocabClassification.length} mục từ vựng lưu trên Firestore
                </Tag>
                {autoClassifyVocab && (
                  <span style={{ fontSize: 11, color: token.colorTextTertiary }}>
                    (Sẽ giữ nguyên từ vựng đã lưu trừ khi bạn sửa nội dung transcript)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Section 5: Footer Actions ── */}
        <div className={styles.footerActions}>
          <div>
            {trackData?.last_update && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                Last update: {moment(trackData.last_update).fromNow()}
              </Typography.Text>
            )}

            {saveStatus && (
              <Flex align='center' gap={6} style={{ color: token.colorPrimary, fontSize: 12 }}>
                <span>{saveStatus}</span>
                <Spin size='small' />
              </Flex>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button htmlType='button' icon={<MinusOutlined />} onClick={handleMinimize}>
              Minimize
            </Button>

            <Button htmlType='button' onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>

            <Button
              htmlType='submit'
              type='primary'
              size='middle'
              loading={loading}
              icon={
                autoClassifyVocab && watch('transcript')?.trim() ? (
                  <ThunderboltOutlined />
                ) : undefined
              }
            >
              {trackData?.id ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </form>

      <GenerateTranscriptModal
        open={openGenerateModal}
        onClose={() => setOpenGenerateModal(false)}
        initialDescription={watch('description')}
        onApply={handleApplyGeneratedTranscript}
      />
    </>
  )
}

export const MediaUploadForm = MediaForm
