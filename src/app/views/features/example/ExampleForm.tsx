import { useDispatch, useSelector } from '@/core/hooks'
import { useCreateExample, useUpdateExample } from '@/core/hooks/useExamples'
import { useExampleModal, usePrompt } from '@/helpers/hooks'
import { ExampleMode } from '@/models/example.model'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { exampleAction } from '@/store/reducers/example.reducer'
import { SyncOutlined } from '@ant-design/icons'
import { Button, Col, Flex, Row, Space, theme } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import clsx from 'clsx'
import { PropsWithChildren, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import styles from './example.module.scss'
import { initExampleData } from '@/constant/example'
import { ReviewableTextArea } from '@/views/components'

interface IProps {
  data?: IExample
  mode?: ExampleMode
  resetAfterSave?: boolean
  onSuccess?: (data: IExample) => void
  onCancel?: () => void
}

export const ExampleForm: React.FC<PropsWithChildren & IProps> = ({
  mode = ExampleMode.Default,
  data,
  resetAfterSave = true,
  onSuccess,
  onCancel,
}) => {
  const { token } = theme.useToken()

  const { notification } = usePrompt()
  const { closeExampleModal } = useExampleModal()

  const dispatch = useDispatch()

  const { translate } = useSelector((state) => state.example)

  const [loading, setLoading] = useState<boolean>(false)
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [answer, setAnswer] = useState<string>('')

  const { mutateAsync: createMutation } = useCreateExample()
  const { mutateAsync: updateMutation } = useUpdateExample()

  const showTranslation =
    mode === ExampleMode.Default || (isChecked && mode === ExampleMode.Translation)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<IExample>({
    defaultValues: data || (translate as IExample),
  })

  const onSubmit = async (formData: IExample) => {
    setLoading(true)
    try {
      let result: IExample | null

      const updatedData = {
        ...formData,
        note: formData.note || '',
      }

      if (formData.id) {
        result = await updateMutation({ ...updatedData })
        dispatch(exampleAction.setTranslate(result))
        // update example list in Redux store
        dispatch(exampleAction.batchUpdate(result ? [result] : []))
        notification({ type: 'success', message: 'Update example successful!' })
      } else {
        result = await createMutation({ ...updatedData })
        notification({ type: 'success', message: 'Add example successful!' })
      }

      closeExampleModal()
      setAnswer('')
      if (resetAfterSave) reset(initExampleData)
      if (result) {
        onSuccess?.(result)
      }
    } catch (error: Error | any) {
      notification({ type: 'error', message: JSON.stringify(error.message) })
    } finally {
      setLoading(false)
    }
  }

  const onReload = async () => {
    setAnswer('')
    reset({ ...initExampleData })
    dispatch(exampleAction.setTranslate(null))
    setIsChecked(false)
    await getRandomExamples()
  }

  const getRandomExamples = async () => {
    try {
      setLoading(true)
      const { isSuccess, content } = await exampleApi.getRandomExamples(1)
      if (isSuccess && content && content[0]) {
        const example = content[0]
        dispatch(exampleAction.setTranslate(example))
        reset({ ...example })
      }
    } catch (error) {
      console.error('Failed to load random examples:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if translate example already exists in Redux
    if (translate && !data) {
      reset({ ...translate })
      return
    }
    if (mode === ExampleMode.Translation) {
      getRandomExamples()
    }
  }, [])

  return (
    <form
      className={clsx(styles.exampleForm)}
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%' }}
    >
      <Space direction='vertical' style={{ display: 'flex', width: '100%' }} size={token.size}>
        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Origin:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`origin`}
              rules={{
                required: {
                  value: true,
                  message: 'Required',
                },
              }}
              render={({ field: { onChange, value } }) => {
                return (
                  <ReviewableTextArea
                    disabled={!showTranslation && mode === ExampleMode.Translation}
                    autoSize={{ minRows: 2 }}
                    value={value}
                    placeholder='Origin'
                    className={styles.autoSearchInput}
                    onChange={onChange}
                    language='en'
                    enableReview={true}
                  />
                )
              }}
            />
          </Col>
        </Row>

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Translation:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`translation`}
              rules={{
                required: {
                  value: true,
                  message: 'Required',
                },
              }}
              render={({ field: { onChange, value } }) => {
                return (
                  <TextArea
                    value={value}
                    autoSize={{ minRows: 2 }}
                    placeholder='Translation'
                    className={styles.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                  />
                )
              }}
            />
          </Col>
        </Row>

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Note:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`note`}
              render={({ field: { onChange, value } }) => {
                return (
                  <TextArea
                    value={value}
                    autoSize={{ minRows: 2 }}
                    placeholder='Note'
                    className={styles.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                  />
                )
              }}
            />
          </Col>
        </Row>

        {mode === ExampleMode.Translation && (
          <Row align={'middle'} gutter={[token.size, token.size / 2]} justify={'end'}>
            <Col xs={24}>Your Translation:</Col>

            <Col xs={24}>
              <TextArea
                value={answer}
                autoSize={{ minRows: 2 }}
                placeholder='Text here...'
                onChange={(text) => setAnswer(text.target.value)}
              />
            </Col>
          </Row>
        )}

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>
            <Flex
              justify={mode === ExampleMode.Translation ? 'space-between' : 'flex-end'}
              gap={token.size}
            >
              {onCancel && (
                <Button
                  type='default'
                  style={{ minWidth: 120 }}
                  onClick={() => {
                    closeExampleModal()
                    onCancel?.()
                  }}
                >
                  Cancel
                </Button>
              )}

              {mode === ExampleMode.Translation && (
                <Button
                  variant='outlined'
                  style={{ minWidth: 120 }}
                  onClick={() => (isChecked ? onReload() : setIsChecked(true))}
                  icon={isChecked ? <SyncOutlined spin={loading} /> : null}
                >
                  {!isChecked ? 'Check' : 'Reload'}
                </Button>
              )}

              <Button
                type='primary'
                htmlType='submit'
                loading={loading}
                disabled={!isValid}
                style={{ minWidth: 120 }}
              >
                Save
              </Button>
            </Flex>
          </Col>
        </Row>
      </Space>
    </form>
  )
}
