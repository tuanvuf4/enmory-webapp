import { CloseOutlined, SyncOutlined } from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/api'
import { theme, Space, Row, Col, Button, Select, Flex } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { PropsWithChildren, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import clsx from 'clsx'
import globalStyle from '@/style/appStyle'
import { Mode } from '@/models/example.model'

interface IProps {
  data?: IExample
  themeMode?: 'dark' | 'light'
  onSuccess?: (data: IExample) => void
}

export const ExampleFormAdd: React.FC<PropsWithChildren & IProps> = ({
  themeMode = 'dark',
  data,
  onSuccess,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const [loading, setLoading] = useState<boolean>(false)
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [answer, setAnswer] = useState<string>('')
  const [mode, setMode] = useState<Mode>(Mode.Translation)
  const gClasses = globalStyle()

  const showTranslation = mode === Mode.Default || (isChecked && mode === Mode.Translation)

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
      const { content, isSuccess } = await exampleApi.createExample({
        ...data,
        ...(isChecked
          ? {
              original: answer,
            }
          : {}),
      })
      setAnswer('')
      setLoading(false)
      setIsChecked(false)
      reset({
        original: '',
        translation: '',
      })
      if (isSuccess) onSuccess?.(content)
    } catch (error) {
      console.log(`error: `, error)
    } finally {
      setLoading(false)
      reset()
    }
  }

  const onReload = () => {
    setIsChecked(false)
    setAnswer('')
    reset({ original: '', translation: '' })
    getRandomExamples()
  }

  const getRandomExamples = async () => {
    setLoading(true)

    const { content } = await exampleApi.getRandomExamples({
      page: 0,
      size: 1,
    })
    reset({ ...content[0] })
    setLoading(false)
  }

  return (
    <form
      className={clsx(classes.exampleFormAdd, themeMode === 'light' ? 'active' : '')}
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%' }}
    >
      <Space direction='vertical' style={{ display: 'flex', width: '100%' }} size={token.size}>
        <Row>
          <Col xs={24}>
            <Flex
              gap={token.size / 2}
              justify={mode === Mode.Translation ? 'space-between' : 'flex-end'}
            >
              {mode === Mode.Translation && (
                <Button
                  variant='outlined'
                  style={{
                    background: 'transparent',
                    color: themeMode === 'dark' ? token.colorWhite : token.colorTextBase,
                  }}
                  onClick={onReload}
                >
                  <SyncOutlined />
                  <span className={gClasses.fromTablet}>Reload</span>
                </Button>
              )}

              <Select
                value={mode}
                onChange={setMode}
                style={{
                  minWidth: 120,
                }}
                options={[
                  {
                    value: Mode.Translation,
                    id: Mode.Translation,
                  },
                  {
                    value: Mode.Default,
                    id: Mode.Default,
                  },
                ]}
              />
            </Flex>
          </Col>
        </Row>

        {showTranslation && (
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
        )}

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

        {mode === Mode.Default && (
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

        {mode === Mode.Translation && (
          <Row align={'middle'} gutter={[token.size, token.size / 2]} justify={'end'}>
            <Col xs={24}>Your Translation:</Col>

            <Col xs={24}>
              <TextArea
                value={answer}
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

        <Row align={'middle'} gutter={[token.size, token.size / 2]} justify={'end'}>
          <Col xs={24}>
            <Flex
              justify={mode === Mode.Translation ? 'space-between' : 'flex-start'}
              className={'pt-4'}
              style={{
                borderTop: '1px solid',
              }}
            >
              {mode === Mode.Translation && (
                <Button
                  disabled={isChecked}
                  variant='outlined'
                  style={{
                    background: 'transparent',
                    minWidth: 120,
                    color: themeMode === 'dark' ? token.colorWhite : token.colorTextBase,
                  }}
                  onClick={() => setIsChecked(true)}
                >
                  Check
                </Button>
              )}

              <Button
                type='primary'
                htmlType='submit'
                loading={loading}
                disabled={!isValid}
                style={{ minWidth: 120 }}
              >
                {mode === Mode.Translation ? 'Update' : 'Save'}
              </Button>
            </Flex>
          </Col>
        </Row>
      </Space>
    </form>
  )
}
