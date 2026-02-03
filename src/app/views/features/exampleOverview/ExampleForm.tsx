import { SyncOutlined } from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Space, Row, Col, Button, Select, Flex } from 'antd'
import { PropsWithChildren, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import clsx from 'clsx'
import { ExampleMode } from '@/models/example.model'
import { useExampleModal, usePrompt } from '@/helpers/hooks'
import { useCreateExample, useUpdateExample } from '@/core/hooks/useExamples'
import { TextEditor } from '@/views/components'
import { useDispatch } from '@/core/hooks'
import { exampleAction } from '@/store/reducers/example.reducer'

interface IProps {
  data?: IExample
  theme?: 'dark' | 'light'
  mode?: ExampleMode
  resetAfterSave?: boolean
  showSelectMode?: boolean
  onSuccess?: (data: IExample) => void
  onCancel?: () => void
}

export const ExampleForm: React.FC<PropsWithChildren & IProps> = ({
  theme: themeMode = 'light',
  mode = ExampleMode.Default,
  data,
  showSelectMode = false,
  resetAfterSave = true,
  onSuccess,
  onCancel,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const { openNotification } = usePrompt()
  const { closeExampleModal } = useExampleModal()

  const dispatch = useDispatch()

  const [loading, setLoading] = useState<boolean>(false)
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [answer, setAnswer] = useState<string>('')
  const [exMode, setMode] = useState<ExampleMode>(mode)

  const createMutation = useCreateExample()
  const updateMutation = useUpdateExample()

  const showTranslation =
    mode === ExampleMode.Default || (isChecked && mode === ExampleMode.Translation)

  const initValues: IExample = {
    origin: '',
    translation: '',
    note: '',
  }

  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<IExample>({
    defaultValues: data || initValues,
  })

  const onSubmit = async (formData: IExample) => {
    setLoading(true)
    try {
      let result: IExample | null

      const updatedData = {
        ...formData,
        id: data?.id ?? '',
        origin_lowercase: formData.origin.toLowerCase(),
        note: formData.note || '',
      }

      if (data?.id) {
        result = await updateMutation.mutateAsync({ ...updatedData })
        dispatch(exampleAction.batchUpdate(result ? [result] : []))
        openNotification({ type: 'success', message: 'Update example successful!' })
      } else {
        result = await createMutation.mutateAsync({ ...updatedData })
        openNotification({ type: 'success', message: 'Add example successful!' })
      }

      closeExampleModal()
      setAnswer('')
      if (resetAfterSave) reset(initValues)
      if (result) {
        onSuccess?.(result)
      }
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    } finally {
      setLoading(false)
    }
  }

  const onReload = async () => {
    setAnswer('')
    reset({ origin: '', translation: '' })
    await getRandomExamples()
    setIsChecked(false)
  }

  const getRandomExamples = async () => {
    setLoading(true)

    try {
      const { isSuccess, content } = await exampleApi.getRandomExamples(1)
      if (isSuccess && content) {
        reset(content ? { ...content[0] } : { ...initValues })
      }
    } catch (error) {
      console.error('Failed to load random examples:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (exMode === ExampleMode.Translation) {
      getRandomExamples()
    }
  }, [])

  return (
    <form
      className={clsx(classes.exampleFormAdd, themeMode === 'dark' ? 'active' : '')}
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%' }}
    >
      <Space direction='vertical' style={{ display: 'flex', width: '100%' }} size={token.size}>
        <Row>
          <Col xs={24}>
            <Flex gap={token.size / 2} justify={'flex-end'}>
              {showSelectMode && (
                <Select
                  value={exMode}
                  onChange={setMode}
                  style={{
                    minWidth: 120,
                  }}
                  options={[
                    {
                      id: ExampleMode.Default,
                      value: ExampleMode.Default,
                      label: 'Default',
                    },
                    {
                      id: ExampleMode.Translation,
                      value: ExampleMode.Translation,
                      label: 'Translation',
                    },
                  ]}
                />
              )}
            </Flex>
          </Col>
        </Row>

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
                  <TextEditor
                    content={value}
                    disabled={!showTranslation && exMode === ExampleMode.Translation}
                    onChange={(content: any) => {
                      setValue('origin', content ?? '')
                      onChange(content)
                    }}
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
                  <TextEditor
                    content={value}
                    onChange={(content: any) => {
                      setValue('translation', content ?? '')
                      onChange(content)
                    }}
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
                  <TextEditor
                    content={value}
                    onChange={(content: any) => {
                      setValue('note', content ?? '')
                      onChange(content)
                    }}
                  />
                )
              }}
            />
          </Col>
        </Row>

        {exMode === ExampleMode.Translation && (
          <Row align={'middle'} gutter={[token.size, token.size / 2]} justify={'end'}>
            <Col xs={24}>Your Translation:</Col>

            <Col xs={24}>
              <TextEditor content={answer} onChange={(content: any) => setAnswer(content)} />
            </Col>
          </Row>
        )}

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>
            <Flex
              justify={exMode === ExampleMode.Translation ? 'space-between' : 'flex-end'}
              gap={token.size}
              className={'pt-4'}
            >
              {onCancel && (
                <Button
                  type='default'
                  style={{
                    minWidth: 120,
                  }}
                  onClick={() => {
                    closeExampleModal()
                    onCancel?.()
                  }}
                >
                  Cancel
                </Button>
              )}

              {exMode === ExampleMode.Translation && (
                <Button
                  variant='outlined'
                  style={{
                    background: 'transparent',
                    minWidth: 120,
                    color: themeMode === 'dark' ? token.colorWhite : token.colorTextBase,
                  }}
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
