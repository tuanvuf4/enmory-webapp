import { initMediaForm, msgErrors } from '@/constant/index'
import { UnorderedListOutlined } from '@ant-design/icons'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { theme, Input, Space, Row, Col, Button, Select, Flex } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { appSetting } from '@/config/appConfig'
import { IMediaForm, ITracks } from '@/models/media.model'
import { tracksApi } from '@/services/firebase'
import { useState, useEffect, useMemo } from 'react'
import { TextEditor, InputTag } from '@/views/components'
import { usePrompt, useTagManagerModal } from '@/helpers/hooks'
import { useSelector, useDispatch } from '@/core/hooks'
import { listeningAction } from '@/store/reducers/listening.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'

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
  const { openTagManagerModal } = useTagManagerModal()
  const dispatch = useDispatch()

  const { tags: allTags } = useSelector((state) => state.setting)
  const { currentTrack, tracks } = useSelector((state) => state.listening)

  const tagOptions = useMemo(
    () =>
      (allTags || [])
        .map((tag) => String(tag.value))
        .filter(Boolean)
        .map((tag) => ({ label: tag, value: tag })),
    [allTags],
  )

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
    if (trackData?.id) {
      reset({
        title: trackData.title,
        description: trackData.description,
        transcript: trackData.transcript,
        translation: trackData.translation,
        tags: trackData.tags || [],
        relation: trackData.relation || [],
        srcUrl: trackData.srcUrl,
        srcType: trackData.srcType,
      })
    } else {
      reset(initMediaForm)
    }
  }, [trackData, reset])

  // const srcOptions: { id: number; value: TSourceTypes; label: string }[] = [
  //   {
  //     id: 1,
  //     value: TSourceTypes.IFRAME,
  //     label: 'Iframe',
  //   },
  //   {
  //     id: 2,
  //     value: TSourceTypes.EMBED,
  //     label: 'Embed',
  //   },
  //   {
  //     id: 3,
  //     value: TSourceTypes.LINK,
  //     label: 'Link',
  //   },
  // ]

  const onSubmit = async (data: IMediaForm) => {
    try {
      setLoading(true)

      let result: any

      const dataSubmit = {
        ...data,
        tags: data.tags || [],
        relation: data.relation || [],
      }

      console.log(`*** dataSubmit ***`, dataSubmit)

      if (trackData?.id) {
        result = await tracksApi.updateTrack(String(trackData.id), dataSubmit)
      } else {
        result = await tracksApi.addTrack(dataSubmit)
      }

      console.log(`*** result ***`, result)

      if (result.isSuccess && result.content) {
        message({ type: 'success', content: result.message })
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
    }
  }

  const handleCancel = () => {
    reset()
    onCancel?.()
  }

  const handleOpenTagModal = () => {
    openTagManagerModal()
  }

  return (
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
              <Button
                size={'small'}
                icon={<UnorderedListOutlined />}
                onClick={handleOpenTagModal}
              />
            </Flex>
          </Col>
          <Col xs={24}>
            <Controller
              control={control}
              name={`tags`}
              render={({ field }) => (
                <Select
                  mode='multiple'
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                  value={field.value || []}
                  placeholder='Select tags'
                  options={tagOptions}
                  optionFilterProp='label'
                  filterOption={(input, option) =>
                    String(option?.label || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={field.onChange}
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
          {/* <Col xs={4}>
            <Row gutter={[token.size / 2, token.size / 2]}>
              <Col xs={24}>Type:</Col>

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
                        style={{ width: '100%', height: '100%' }}
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
          </Col> */}
          <Col xs={24}>
            <Row gutter={[token.size / 2, token.size / 2]}>
              <Col xs={24}>
                Source URL:{' '}
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
                      placeholder='Source URL'
                      {...field}
                    />
                  )}
                />
              </Col>
            </Row>
          </Col>
        </Row>

        <Row gutter={[token.size / 2, token.size / 2]}>
          <Col xs={24}>
            Transcript:{' '}
            {errors.transcript && (
              <span style={{ color: 'red', fontSize: '12px' }}>{errors.transcript.message}</span>
            )}
          </Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`transcript`}
              render={({ field }) => (
                <TextArea
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Col>
        </Row>

        {/* button */}
        <Row gutter={[token.size / 2, token.size / 2]}>
          <Col xs={24}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button htmlType='button' onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>

              <Button htmlType='submit' type='primary' loading={loading}>
                {trackData?.id ? 'Update' : 'Save'}
              </Button>
            </div>
          </Col>
        </Row>
      </Space>
    </form>
  )
}
