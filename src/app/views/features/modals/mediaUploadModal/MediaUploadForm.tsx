import { initMediaForm, msgErrors } from '@/constant/index'
import { RobotOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { theme, Input, Space, Row, Col, Button, Select, Flex, Switch, Tag, Spin } from 'antd'
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
import { GEMINI_VOICES, geminiVocabClassifierService } from '@/services/gemini'
import { IClassifiedVocabItem } from '@/models/vocabClassification.model'

interface IMediaUploadFormProps {
  onConfirm?: (track: ITracks) => void
  onCancel?: () => void
  trackData?: ITracks
}

export const MediaUploadForm: React.FC<IMediaUploadFormProps> = ({
  onCancel,
  onConfirm,
  trackData,
}) => {
  const { message } = usePrompt()
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [autoClassifyVocab, setAutoClassifyVocab] = useState<boolean>(true)
  const dispatch = useDispatch()

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
      <form onSubmit={handleSubmit(onSubmit)}>
        <Space direction='vertical' size={[token.size / 2, token.size]} style={{ display: 'flex' }}>
          {/* title */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              Title: <span style={{ color: 'red' }}>*</span>
            </Col>

            <Col xs={24}>
              <Controller
                control={control}
                name={`title`}
                render={({ field }) => (
                  <>
                    <Input {...field} />

                    {errors.title && (
                      <div style={{ color: 'red', fontSize: '12px' }}>{errors.title.message}</div>
                    )}
                  </>
                )}
              />
            </Col>
          </Row>

          {/* tags */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <Flex align={'center'} gap={token.size / 2}>
                <span>Tags:</span>
              </Flex>
            </Col>
            <Col xs={24}>
              <Controller
                control={control}
                name={`tags`}
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
          </Row>

          {/* relation */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>Relation:</Col>
            <Col xs={24}>
              <Controller
                control={control}
                name={`relation`}
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
          </Row>

          {/* description */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>Description:</Col>

            <Col xs={24}>
              <Controller
                control={control}
                name={`description`}
                render={({ field }) => (
                  <>
                    <TextEditor content={field.value} onChange={field.onChange} />

                    {errors.description && (
                      <div style={{ color: 'red', fontSize: '12px' }}>
                        {errors.description.message}
                      </div>
                    )}
                  </>
                )}
              />
            </Col>
          </Row>

          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col xs={24}>
                  Source URL:
                  {errors.srcUrl && (
                    <span style={{ color: 'red', fontSize: '12px' }}>{errors.srcUrl.message}</span>
                  )}
                </Col>

                <Col xs={24}>
                  <Controller
                    control={control}
                    name={`srcUrl`}
                    render={({ field }) => (
                      <TextArea
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        placeholder='Source URL (hoặc để trống nếu tạo bài nghe từ Transcript)'
                        {...field}
                      />
                    )}
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          {/* Transcript section */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <Flex justify='space-between' align='center' style={{ width: '100%' }}>
                <span>
                  Transcript:{' '}
                  {errors.transcript && (
                    <span style={{ color: 'red', fontSize: '12px' }}>
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
                  Tự động tạo transcript
                </Button>
              </Flex>
            </Col>

            <Col xs={24}>
              <Controller
                control={control}
                name={`transcript`}
                render={({ field }) => (
                  <TextArea
                    autoSize={{ minRows: 4, maxRows: 12 }}
                    placeholder={'0:00\nSpeaker: Dialogue here...\n\n0:25\nSpeaker: Next line...'}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Col>
          </Row>

          {/* AI Vocabulary Classification on Save */}
          {watch('transcript')?.trim() && (
            <Row gutter={[token.size / 2, token.size / 2]}>
              <Col xs={24}>
                <div
                  style={{
                    padding: '10px 14px',
                    background: token.colorFillQuaternary,
                    borderRadius: 8,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
                    <Flex align='center' gap={8}>
                      <RobotOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          Tự động phân loại từ vựng (A1 → C2)
                        </div>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                          Trích xuất từ vựng từ transcript và phân loại theo chuẩn CEFR. (Chỉ lưu
                          khi bạn nhấn nút Save/Update)
                        </div>
                      </div>
                    </Flex>
                    <Switch
                      checked={autoClassifyVocab}
                      onChange={(checked) => setAutoClassifyVocab(checked)}
                    />
                  </Flex>
                  {trackData?.vocabClassification && trackData.vocabClassification.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
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
              </Col>
            </Row>
          )}

          {(!watch('srcUrl') || watch('srcUrl') === 'transcript') && (
            <Row gutter={[token.size / 2, token.size / 2]}>
              <Col xs={24}>
                <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
                  <span>Giọng đọc Gemini TTS (cho bài nghe AI / Transcript):</span>
                  <Controller
                    control={control}
                    name='voice'
                    render={({ field }) => (
                      <Select
                        {...field}
                        value={field.value || 'auto'}
                        style={{ minWidth: 260 }}
                        options={GEMINI_VOICES.map((v) => ({
                          value: v.value,
                          label: v.label,
                        }))}
                      />
                    )}
                  />
                </Flex>
              </Col>
            </Row>
          )}

          {/* button */}
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
                <div>
                  {saveStatus && (
                    <Flex
                      align='center'
                      gap={6}
                      style={{ color: token.colorPrimary, fontSize: 12 }}
                    >
                      <Spin size='small' />
                      <span>{saveStatus}</span>
                    </Flex>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button htmlType='button' onClick={handleCancel} disabled={loading}>
                    Cancel
                  </Button>

                  <Button
                    htmlType='submit'
                    type='primary'
                    loading={loading}
                    icon={
                      autoClassifyVocab && watch('transcript')?.trim() ? (
                        <ThunderboltOutlined />
                      ) : undefined
                    }
                  >
                    {trackData?.id ? 'Update' : 'Save'}
                  </Button>
                </div>
              </Flex>
            </Col>
          </Row>
        </Space>
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
