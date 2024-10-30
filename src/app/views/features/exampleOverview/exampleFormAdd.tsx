import { CloseOutlined } from '@ant-design/icons'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/api'
import { theme, Space, Row, Col, Button } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { PropsWithChildren, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import clsx from 'clsx'

interface IProps {
  data?: IExample
  mode?: 'dark' | 'light'
  onSuccess?: (data: IExample) => void
}

export const ExampleFormAdd: React.FC<PropsWithChildren & IProps> = ({
  mode = 'dark',
  data,
  onSuccess,
}) => {
  const { token } = theme.useToken()

  const classes = styles()

  const [loading, setLoading] = useState<boolean>(false)

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
      setLoading(false)
      reset()
      if (isSuccess) onSuccess?.(content)
    } catch (error) {
      console.log(`error: `, error)
    } finally {
      setLoading(false)
      reset()
    }
  }

  return (
    <form
      className={clsx(classes.exampleFormAdd, mode === 'light' ? 'active' : '')}
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%' }}
    >
      <Space direction='vertical' style={{ display: 'flex', width: '100%' }}>
        <Row align={'middle'} gutter={[token.size, token.size]}>
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

        <Row align={'middle'} gutter={[token.size, token.size]}>
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

        <Row align={'middle'} gutter={[token.size, token.size]}>
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

        <Row align={'middle'} gutter={[token.size, token.size]} justify={'end'}>
          <Col>
            <Button
              type='primary'
              htmlType='submit'
              loading={loading}
              disabled={!isValid}
              style={{ minWidth: 120, marginTop: token.size }}
            >
              Save
            </Button>
          </Col>
        </Row>
      </Space>
    </form>
  )
}
