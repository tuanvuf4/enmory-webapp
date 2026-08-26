import appStyle from '@/style/appStyle.module.scss'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IItem } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Space, Col, Row, Button, AutoComplete } from 'antd'
import { useState } from 'react'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { exampleItem } from './data'
import TextArea from 'antd/es/input/TextArea'
import { removeLineBreaks } from '@/core/utils'

interface IProps {
  nestIndex: number
}

export const ExampleItem: React.FC<IProps> = ({ nestIndex }) => {
  const { token } = theme.useToken()

  const [currentSearch, setCurrentSearch] = useState<string>('')
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null)

  const { confirm } = usePrompt()

  const { options } = useAutoComplete(
    {
      keyword: currentSearch || '',
    },
    'example',
  )

  const { control, setValue } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({
    control,
    name: `meanings.${nestIndex}.examples`,
  })

  const onSearch = (searchText: string, fieldIndex: number) => {
    setCurrentSearch(searchText)
    setActiveFieldIndex(fieldIndex)
  }

  const addExample = (): void => {
    prepend({ ...exampleItem })
  }

  const onSelect = (idxNested: number, idxExp: number, value: string, option?: any) => {
    const exampleId = option?.id || value
    exampleApi.getExampleById(exampleId).then(({ isSuccess, content }) => {
      if (isSuccess && content) {
        setValue(
          `meanings.${idxNested}.examples.${idxExp}.origin`,
          removeLineBreaks(content.origin),
        )
        setValue(
          `meanings.${idxNested}.examples.${idxExp}.translation`,
          removeLineBreaks(content.translation),
        )
        setValue(`meanings.${idxNested}.examples.${idxExp}.id`, content.id)
        setCurrentSearch('')
        setActiveFieldIndex(null)
      }
    })
  }

  return (
    <>
      <Space
        direction='vertical'
        size={[token.size / 2, token.size / 2]}
        className={appStyle.fulWidth}
      >
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
                    className={appStyle.fulWidth}
                  >
                    <Row gutter={[token.size / 4, token.size / 4]} align={'middle'}>
                      <Col md={24} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${nestIndex}.examples.${key}.origin`}
                          render={({ field }) => (
                            <AutoComplete
                              value={field.value}
                              options={activeFieldIndex === key ? options : []}
                              onSearch={(text) => onSearch(text, key)}
                              onSelect={(value, option) => onSelect(nestIndex, key, value, option)}
                              onChange={(text) => {
                                field.onChange(text)
                                onSearch(text, key)
                              }}
                              onFocus={() => {
                                setActiveFieldIndex(key)
                                setCurrentSearch(field.value || '')
                              }}
                              onBlur={() => {
                                field.onChange(removeLineBreaks(field.value))
                              }}
                              placeholder='Origin:'
                              className={'w-full'}
                            >
                              <TextArea
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                placeholder='Origin:'
                              />
                            </AutoComplete>
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
