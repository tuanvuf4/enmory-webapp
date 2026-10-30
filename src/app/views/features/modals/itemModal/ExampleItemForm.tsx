import appStyle from '@/style/appStyle.module.scss'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { usePrompt } from '@/helpers/hooks'
import { IItem } from '@/models/item.model'
import { theme, Space, Col, Row, Button } from 'antd'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { exampleItem } from './data'
import TextArea from 'antd/es/input/TextArea'
import { removeLineBreaks } from '@/core/utils'

interface IProps {
  nestIndex: number
}

export const ExampleItemForm: React.FC<IProps> = ({ nestIndex }) => {
  const { token } = theme.useToken()

  const { confirm } = usePrompt()

  const { control } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({
    control,
    name: `meanings.${nestIndex}.examples`,
  })

  const addExample = (): void => {
    prepend({ ...exampleItem })
  }

  return (
    <>
      <Space direction='vertical' size={[token.size / 2, token.size / 2]} className={appStyle.full}>
        <Col xs={24}>
          <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
            <Col md={4} xs={6}>
              Example:
            </Col>

            <Col md={20} xs={16}>
              <Button onClick={addExample} type='primary' icon={<PlusOutlined />} />
            </Col>
          </Row>
        </Col>

        <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
          {fields.map((example, key) => {
            return (
              <Col
                key={example.id || key}
                md={{ span: 20, offset: 4 }}
                xs={{ span: 24, offset: 0 }}
              >
                <div
                  style={{
                    padding: token.size / 2,
                    paddingRight: 50,
                    position: 'relative',
                    border: `1px solid ${token.colorBorder}`,
                  }}
                >
                  <Button
                    style={{
                      position: 'absolute',
                      right: 5,
                      color: token.palette?.red?.[6],
                    }}
                    type={'text'}
                    onClick={() => {
                      confirm({ onOk: () => remove(key) })
                    }}
                    icon={<DeleteOutlined />}
                  />
                  <Space
                    size={[token.size / 2, token.size / 2]}
                    direction='vertical'
                    className={appStyle.full}
                  >
                    <Row gutter={[token.size / 4, token.size / 4]} align={'middle'}>
                      <Col md={24} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${nestIndex}.examples.${key}.origin`}
                          render={({ field }) => (
                            <TextArea
                              placeholder='Origin:'
                              autoSize={{ minRows: 1, maxRows: 4 }}
                              {...field}
                              onBlur={() => {
                                field.onChange(removeLineBreaks(field.value))
                              }}
                            />
                          )}
                        />
                      </Col>
                    </Row>

                    <Row gutter={[token.size / 4, token.size / 4]} align={'middle'}>
                      <Col md={24} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${nestIndex}.examples.${key}.translation`}
                          render={({ field }) => (
                            <TextArea
                              autoSize={{ minRows: 1, maxRows: 4 }}
                              placeholder='Translation:'
                              {...field}
                              onBlur={() => {
                                field.onChange(removeLineBreaks(field.value))
                              }}
                            />
                          )}
                        />
                      </Col>
                    </Row>
                  </Space>
                </div>
              </Col>
            )
          })}
        </Row>
      </Space>
    </>
  )
}
