import { CloseOutlined, SyncOutlined } from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Space, Row, Col, Button, Select, Flex } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { PropsWithChildren, useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import clsx from 'clsx'
import { ExampleMode } from '@/models/example.model'
import { usePrompt } from '@/helpers/hooks'

interface IProps {
  data?: IExample
  themeMode?: 'dark' | 'light'
  mode?: ExampleMode
  showSelectMode?: boolean
  onSuccess?: (data: IExample) => void
}

export const ExampleForm: React.FC<PropsWithChildren & IProps> = ({
  themeMode = 'dark',
  mode = ExampleMode.Default,
  data,
  showSelectMode = false,
  onSuccess,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const { openNotification } = usePrompt()

  const [loading, setLoading] = useState<boolean>(false)
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [answer, setAnswer] = useState<string>('')
  const [exMode, setMode] = useState<ExampleMode>(mode)

  const showTranslation =
    mode === ExampleMode.Default || (isChecked && mode === ExampleMode.Translation)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<IExample>({
    defaultValues: data || {
      original: '',
      translation: '',
      note: '',
    },
  })

  const onSubmit = async (data: IExample) => {
    setLoading(true)
    try {
      const { content, isSuccess } = await exampleApi.createExample(data)
      setAnswer('')
      setLoading(false)
      setIsChecked(false)
      reset({ original: '', translation: '' })
      if (isSuccess) {
        onSuccess?.(content)
        data.id
          ? openNotification({ type: 'success', message: 'Update example successful!' })
          : openNotification({ type: 'success', message: 'Add example successful!' })
      }
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    } finally {
      setLoading(false)
      reset()
    }
  }

  const onReload = async () => {
    setAnswer('')
    reset({ original: '', translation: '' })
    await getRandomExamples()
    setIsChecked(false)
  }

  const getRandomExamples = useCallback(async () => {
    setLoading(true)

    const { content } = await exampleApi.getRandomExamples({
      page: 0,
      size: 1,
    })
    reset({ ...content[0] })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (exMode === ExampleMode.Translation) getRandomExamples()
  }, [])

  return (
    <form
      className={clsx(classes.exampleFormAdd, themeMode === 'light' ? 'active' : '')}
      onSubmit={handleSubmit(onSubmit)}
      style={{ padding: token.size, width: '100%' }}
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
              name={`original`}
              rules={{
                required: {
                  value: true,
                  message: 'Required',
                },
              }}
              render={({ field: { onChange, value } }) => {
                return (
                  <TextArea
                    disabled={!showTranslation && exMode === ExampleMode.Translation}
                    autoSize
                    value={value}
                    placeholder='Origin'
                    className={classes.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                    allowClear={{
                      clearIcon: (
                        <CloseOutlined
                          style={{
                            background: token.colorWhite,
                            padding: token.size / 8,
                            borderRadius: '50%',
                            color: token.colorBgLayout,
                            fontSize: 10,
                          }}
                        />
                      ),
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
                  <TextArea
                    value={value}
                    autoSize
                    placeholder='Translation'
                    className={classes.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                    allowClear={{
                      clearIcon: (
                        <CloseOutlined
                          style={{
                            background: token.colorWhite,
                            padding: token.size / 8,
                            borderRadius: '50%',
                            color: token.colorBgLayout,
                            fontSize: 10,
                          }}
                        />
                      ),
                    }}
                  />
                )
              }}
            />
          </Col>
        </Row>

        {exMode === ExampleMode.Default && (
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
                      autoSize
                      placeholder='Note'
                      className={classes.autoSearchInput}
                      onChange={(text) => onChange(text.target.value)}
                      allowClear={{
                        clearIcon: (
                          <CloseOutlined
                            style={{
                              background: token.colorWhite,
                              padding: token.size / 8,
                              borderRadius: '50%',
                              color: token.colorBgLayout,
                              fontSize: 10,
                            }}
                          />
                        ),
                      }}
                    />
                  )
                }}
              />
            </Col>
          </Row>
        )}

        {exMode === ExampleMode.Translation && (
          <Row align={'middle'} gutter={[token.size, token.size / 2]} justify={'end'}>
            <Col xs={24}>Your Translation:</Col>

            <Col xs={24}>
              <TextArea
                value={answer}
                autoSize
                placeholder='Text here...'
                className={classes.autoSearchInput}
                onChange={(text) => setAnswer(text.target.value)}
                allowClear={{
                  clearIcon: (
                    <CloseOutlined
                      style={{
                        background: token.colorWhite,
                        padding: token.size / 8,
                        borderRadius: '50%',
                        color: token.colorBgLayout,
                        fontSize: 10,
                      }}
                    />
                  ),
                }}
              />
            </Col>
          </Row>
        )}

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>
            <Flex
              justify={exMode === ExampleMode.Translation ? 'space-between' : 'flex-start'}
              className={'pt-4'}
            >
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
