import { msgErrors } from '@/constant/index'
import globalStyle, { appStyleConfig } from '@/style/appStyle'
import { CloseSquareOutlined, UploadOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppSelector, useAppDispatch } from '@/core/hooks'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { EMediaSrc } from '@/models/dictation.model'
import { IPair } from '@/models/item.model'
import { mediaApi } from '@/services/api'
import { actionAsyncMedia } from '@/store/async/media.async'
import { mediaAction } from '@/store/reducers/media.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { theme, Input, UploadProps, Modal, Space, Row, Col, Radio, Upload, Button } from 'antd'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { TExternalSource, IMediaForm, initMediaForm } from '.'
import { styles } from './style'
import clsx from 'clsx'

interface IProps {
  onConfirm?: () => void
  onCancel?: () => void
  open: boolean
  title?: string
  content?: string
}

export const MediaUploadModal: React.FC<IProps> = ({ open, title }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { TextArea } = Input

  const { mediaSrc, isUpdating, list, currentUpdating } = useAppSelector((state) => state.media)

  const dispatch = useAppDispatch()

  const extSrcOptions: IPair<string, TExternalSource>[] = [
    {
      id: 1,
      value: TExternalSource.IFRAME,
      label: 'iframe',
    },
    {
      id: 2,
      value: TExternalSource.EMBED,
      label: 'embed',
    },
  ]

  const schema = (
    yup.object().shape(
      {
        title: yup
          .string()
          .required(msgErrors.required)
          .max(
            defaultSetting.listening.maxLengthShortInput,
            msgErrors.maxLength('Title', defaultSetting.listening.maxLengthShortInput),
          ),
        description: yup
          .string()
          .max(
            defaultSetting.listening.maxLengthTranscript,
            msgErrors.maxLength('Description', defaultSetting.listening.maxLengthTranscript),
          ),
        transcript: yup
          .string()
          .max(
            defaultSetting.listening.maxLengthTranscript,
            msgErrors.maxLength('Transcript', defaultSetting.listening.maxLengthTranscript),
          ),
        externalUrl: yup
          .string()
          .max(
            defaultSetting.listening.maxLengthInput,
            msgErrors.maxLength('External url', defaultSetting.listening.maxLengthInput),
          ),
        file: yup.mixed().test(
          'maxSize',
          msgErrors.maxSize('File', defaultSetting.listening.maxMediaSize),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (file: any) => {
            if (file && file.size > defaultSetting.listening.maxMediaSize * 1024 * 1024) {
              setError('file', {
                message: msgErrors.maxSize('File', defaultSetting.listening.maxMediaSize),
              })
              return false
            }
            clearErrors('file')
            return true
          },
        ),
      },
      [['file', 'externalUrl']],
    ) as yup.ObjectSchema<IMediaForm>
  )
    .test({
      name: 'required',
      test: (parent, option) => {
        if (!parent.externalUrl && mediaSrc === EMediaSrc.EXTERNAL) {
          return option.createError({
            path: 'externalUrl',
            message: msgErrors.required,
          })
        } else {
          return true
        }
      },
    })
    .test({
      name: 'required',
      test: (parent, option) => {
        if (!parent.file && mediaSrc === EMediaSrc.INTERNAL && !isUpdating) {
          return option.createError({
            path: 'file',
            message: msgErrors.required,
          })
        } else {
          return true
        }
      },
    })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { isValid, errors },
  } = useForm<IMediaForm>({
    defaultValues: initMediaForm,
    mode: 'all',
    resolver: yupResolver(schema),
  })

  const onSubmit = async (data: IMediaForm) => {
    try {
      isUpdating
        ? (await mediaApi.updateMedia(data), await dispatch(actionAsyncMedia.fetchMedias(mediaSrc)))
        : (await mediaApi.uploadMedia(data), await dispatch(actionAsyncMedia.fetchMedias(mediaSrc)))
    } catch (error) {
      console.log(`error: `, error)
    } finally {
      dispatch(settingAction.toggleMediaModal())
      dispatch(mediaAction.setUpdating(false))
    }
  }

  const handleCancel = () => {
    dispatch(settingAction.toggleMediaModal())
    dispatch(mediaAction.setCurrentUpdating(-1))
    dispatch(mediaAction.setUpdating(false))
  }

  const uploadProps: UploadProps = {
    accept: '.mp3, .mp4',
    name: 'file',
    headers: {
      authorization: 'authorization-text',
    },
    maxCount: 1,
    beforeUpload() {
      return false
    },
  }

  useEffect(() => {
    if (isUpdating) {
      const tmp: IMediaForm[] = list.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description as string,
        transcript: item.transcript,
        translation: item.translation,
        externalUrl: item.externalUrl,
        externalSource: item.externalSource,
        file: undefined,
      }))
      reset(tmp.find((item) => item.id === currentUpdating))
    }
  }, [isUpdating])

  return (
    <Modal
      title={title || 'Upload'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      okType={isValid ? 'primary' : 'danger'}
      onCancel={handleCancel}
      okText={'Upload'}
      width={appStyleConfig.modal.large}
      footer={false}
      maskClosable={false}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Space direction='vertical' size={[token.size / 2, token.size]} style={{ display: 'flex' }}>
          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              Title: <span className={clsx(gClasses.errorMsg)}>*</span>
            </Col>

            <Col xs={24}>
              <Controller
                control={control}
                name={`title`}
                render={({ field }) => (
                  <>
                    <Input
                      maxLength={
                        defaultSetting.listening.maxLengthShortInput +
                        defaultSetting.listening.threshold
                      }
                      {...field}
                    />

                    {errors.title && (
                      <div className={clsx(gClasses.errorMsg)}>{errors.title.message}</div>
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
                      rows={6}
                      maxLength={
                        defaultSetting.listening.maxLengthTranscript +
                        defaultSetting.listening.threshold
                      }
                      placeholder='Description'
                      {...field}
                    />

                    {errors.description && (
                      <div className={clsx(gClasses.errorMsg)}>{errors.description.message}</div>
                    )}
                  </>
                )}
              />
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
                <div className={classes.texture}>
                  <Controller
                    control={control}
                    name={`transcript`}
                    render={({ field }) => (
                      <>
                        <TextArea
                          autoSize={true}
                          maxLength={
                            defaultSetting.listening.maxLengthTranscript +
                            defaultSetting.listening.threshold
                          }
                          placeholder='Transcript'
                          {...field}
                        />

                        {errors.transcript && (
                          <div className={clsx(gClasses.errorMsg)}>{errors.transcript.message}</div>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className={classes.texture}>
                  <Controller
                    control={control}
                    name={`translation`}
                    render={({ field }) => (
                      <>
                        <TextArea
                          autoSize={true}
                          maxLength={
                            defaultSetting.listening.maxLengthTranscript +
                            defaultSetting.listening.threshold
                          }
                          placeholder='Translation'
                          {...field}
                        />

                        {errors.transcript && (
                          <div className={clsx(gClasses.errorMsg)}>{errors.transcript.message}</div>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>
            </Col>
          </Row>

          {mediaSrc === EMediaSrc.EXTERNAL && (
            <>
              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col xs={24}>
                  <span style={{ marginRight: token.size / 2 }}>Source:</span>
                  <Controller
                    control={control}
                    name={`externalSource`}
                    render={({ field }) => (
                      <Radio.Group {...field}>
                        {extSrcOptions.map((item, key) => (
                          <Radio key={key} value={item.value}>
                            {item.label}
                          </Radio>
                        ))}
                      </Radio.Group>
                    )}
                  />
                </Col>
              </Row>

              <Row gutter={[token.size / 2, token.size / 2]}>
                <Col xs={24}>
                  External Url: <span className={clsx(gClasses.errorMsg)}>*</span>
                </Col>

                <Col xs={24}>
                  <Controller
                    control={control}
                    name={`externalUrl`}
                    render={({ field }) => (
                      <>
                        <Input
                          maxLength={
                            defaultSetting.listening.maxLengthInput +
                            defaultSetting.listening.threshold
                          }
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            setValue('externalUrl', e.target.value)
                            trigger()
                          }}
                        />

                        {errors.externalUrl && (
                          <div className={clsx(gClasses.errorMsg)}>
                            {errors.externalUrl.message}
                          </div>
                        )}
                      </>
                    )}
                  />
                </Col>
              </Row>
            </>
          )}

          {mediaSrc === EMediaSrc.INTERNAL && (
            <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
              <Col xs={24} sm={6}>
                {isUpdating && <>Change File:</>}

                {!isUpdating && (
                  <>
                    Upload:
                    <span className={clsx(gClasses.errorMsg)}>*</span>
                  </>
                )}
              </Col>

              <Col xs={24} sm={18}>
                <Controller
                  control={control}
                  name={`file`}
                  render={() => (
                    <>
                      <Upload
                        {...uploadProps}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(e: any) => {
                          e.fileList.length === 0 ? setValue('file', '') : setValue('file', e.file)
                          trigger()
                        }}
                      >
                        <Button icon={<UploadOutlined />}>Select File</Button>
                      </Upload>

                      {errors.file && (
                        <div className={clsx(gClasses.errorMsg)}>{errors.file.message}</div>
                      )}
                    </>
                  )}
                />
              </Col>
            </Row>
          )}

          <Row gutter={[token.size / 2, token.size / 2]}>
            <Col xs={24}>
              <div className={classes.action}>
                <Button htmlType='button' onClick={handleCancel}>
                  Cancel
                </Button>

                <Button htmlType='submit' type='primary' disabled={!isValid}>
                  Save
                </Button>
              </div>
            </Col>
          </Row>
        </Space>
      </form>
    </Modal>
  )
}
