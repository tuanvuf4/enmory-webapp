import { initMediaForm, msgErrors, TSourceTypes } from '@/constant/index'
import { CloseSquareOutlined } from '@ant-design/icons'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { theme, Input, Modal, Space, Row, Col, Button, Select, message } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { appSetting } from '@/config/appConfig'
import { IMediaForm, ITracks } from '@/models/media.model'
import { tracksApi } from '@/services/firebase'
import { useState, useEffect } from 'react'

interface IProps {
  onConfirm?: (track: ITracks) => void
  onCancel?: () => void
  open: boolean
  title?: string
  description?: string
  trackData?: ITracks
}

export const MediaUploadModal: React.FC<IProps> = ({
  open,
  title,
  onCancel,
  onConfirm,
  trackData,
}) => {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(false)

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
    srcUrl: yup
      .string()
      .required(msgErrors.required)
      .max(
        appSetting.listening.maxLengthInput,
        msgErrors.maxLength('Source URL', appSetting.listening.maxLengthInput),
      ),
    srcType: yup.number(),
  }) as yup.ObjectSchema<IMediaForm>

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IMediaForm>({
    defaultValues: trackData || initMediaForm,
    mode: 'all',
    resolver: yupResolver(schema),
  })

  // Reset form when trackData changes
  useEffect(() => {
    if (open) {
      if (trackData?.id) {
        // Edit mode - reset with track data
        reset({
          title: trackData.title,
          description: trackData.description,
          transcript: trackData.transcript,
          translation: trackData.translation,
          srcUrl: trackData.srcUrl,
          srcType: trackData.srcType,
        })
        console.log('[MediaUploadModal] Form loaded with track data:', trackData)
      } else {
        // Add mode - reset to empty form
        reset(initMediaForm)
        console.log('[MediaUploadModal] Form reset to empty')
      }
    }
  }, [open, trackData, reset])

  const srcOptions: { id: number; value: TSourceTypes; label: string }[] = [
    {
      id: 1,
      value: TSourceTypes.IFRAME,
      label: 'Iframe',
    },
    {
      id: 2,
      value: TSourceTypes.EMBED,
      label: 'Embed',
    },
  ]

  const onSubmit = async (data: IMediaForm) => {
    try {
      setLoading(true)
      console.log('[MediaUploadModal] Form submitted with data:', data)

      let result: any

      if (trackData?.id) {
        // Update existing track
        console.log('[MediaUploadModal] Updating track with ID:', trackData.id)
        result = await tracksApi.updateTrack(String(trackData.id), {
          title: data.title,
          description: data.description,
          transcript: data.transcript,
          translation: data.translation,
          srcUrl: data.srcUrl,
          srcType: data.srcType,
        })
      } else {
        // Add new track
        console.log('[MediaUploadModal] Adding new track')
        result = await tracksApi.addTrack({
          title: data.title,
          description: data.description,
          transcript: data.transcript,
          translation: data.translation,
          srcUrl: data.srcUrl,
          srcType: data.srcType,
        })
      }

      console.log('[MediaUploadModal] API Result:', result)

      if (result.isSuccess && result.content) {
        message.success(result.message)
        reset()
        onConfirm?.(result.content)
      } else {
        message.error(result.message || 'Failed to save track')
      }
    } catch (error: any) {
      console.error('[MediaUploadModal] Error saving track:', error)
      message.error(error.message || 'Error saving track')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  return (
    <Modal
      title={trackData?.id ? `Edit Track` : title || 'Upload'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      onCancel={handleCancel}
      width={1000}
      footer={false}
      maskClosable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Space direction='vertical' size={[token.size / 2, token.size]} style={{ display: 'flex' }}>
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
                    <Input
                      maxLength={
                        appSetting.listening.maxLengthShortInput + appSetting.listening.threshold
                      }
                      {...field}
                    />

                    {errors.title && (
                      <div style={{ color: 'red', fontSize: '12px' }}>{errors.title.message}</div>
                    )}
                  </>
                )}
              />
            </Col>
          </Row>

          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>Description:</Col>

            <Col xs={24}>
              <Controller
                control={control}
                name={`description`}
                render={({ field }) => (
                  <>
                    <TextArea
                      rows={2}
                      maxLength={
                        appSetting.listening.maxLengthTranscript + appSetting.listening.threshold
                      }
                      placeholder='Description'
                      {...field}
                    />

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
            <Col xs={4}>
              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col xs={24}>Source:</Col>

                <Col xs={24}>
                  <Controller
                    control={control}
                    name={`srcType`}
                    render={({ field }) => (
                      <>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          options={srcOptions}
                          placeholder='Source'
                          optionLabelProp='label'
                          style={{ width: '100%' }}
                        />

                        {errors.srcType && (
                          <div style={{ color: 'red', fontSize: '12px' }}>
                            {errors.srcType.message}
                          </div>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>
            </Col>
            <Col xs={20}>
              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col xs={24}>Source URL:</Col>

                <Col xs={24}>
                  <Controller
                    control={control}
                    name={`srcUrl`}
                    render={({ field }) => (
                      <>
                        <TextArea
                          rows={1}
                          maxLength={
                            appSetting.listening.maxLengthTranscript +
                            appSetting.listening.threshold
                          }
                          placeholder='Source URL'
                          {...field}
                        />

                        {errors.srcUrl && (
                          <div style={{ color: 'red', fontSize: '12px' }}>
                            {errors.srcUrl.message}
                          </div>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p>Transcript:</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p>Translation:</p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'top',
                  justifyContent: 'center',
                  maxHeight: 450,
                  minHeight: 450,
                  overflow: 'auto',
                  border: `1px solid ${token.colorBorder}`,
                }}
              >
                <div style={{ flex: 1, padding: '8px' }}>
                  <Controller
                    control={control}
                    name={`transcript`}
                    render={({ field }) => (
                      <>
                        <TextArea
                          autoSize={true}
                          rows={4}
                          maxLength={
                            appSetting.listening.maxLengthTranscript +
                            appSetting.listening.threshold
                          }
                          placeholder='Transcript'
                          {...field}
                        />

                        {errors.transcript && (
                          <div style={{ color: 'red', fontSize: '12px' }}>
                            {errors.transcript.message}
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>

                <div style={{ flex: 1, padding: '8px' }}>
                  <Controller
                    control={control}
                    name={`translation`}
                    render={({ field }) => (
                      <>
                        <TextArea
                          autoSize={true}
                          rows={4}
                          maxLength={
                            appSetting.listening.maxLengthTranscript +
                            appSetting.listening.threshold
                          }
                          placeholder='Translation'
                          {...field}
                        />

                        {errors.translation && (
                          <div style={{ color: 'red', fontSize: '12px' }}>
                            {errors.translation.message}
                          </div>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button htmlType='button' onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>

                <Button
                  htmlType='submit'
                  type='primary'
                  // disabled={!isValid || loading}
                  loading={loading}
                >
                  {trackData?.id ? 'Update' : 'Save'}
                </Button>
              </div>
            </Col>
          </Row>
        </Space>
      </form>
    </Modal>
  )
}
