import globalStyle from '@/style/appStyle'
import { PlusOutlined, DeleteOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IItem } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Space, Col, Row, Button, AutoComplete, Flex } from 'antd'
import { useState } from 'react'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { exampleItem } from './data'
import styles from './style'
import TextArea from 'antd/es/input/TextArea'

interface IProps {
  nestIndex: number
}

export const ExampleItem: React.FC<IProps> = ({ nestIndex }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const globalClasses = globalStyle()

  const [currentSearch, setCurrentSearch] = useState<string>('')
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null)

  const { confirmDeleteModal } = usePrompt()

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

  const onSelect = (idxNested: number, idxExp: number, value: string) => {
    exampleApi.getExampleById(value).then(({ isSuccess, content }) => {
      if (isSuccess && content) {
        setValue(`meanings.${idxNested}.examples.${idxExp}.origin`, content.origin)
        setValue(`meanings.${idxNested}.examples.${idxExp}.translation`, content.translation)
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
        className={globalClasses.fulWidth}
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

        {fields.map((example, key) => {
          return (
            <Col md={24} key={example.id || key}>
              <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                <Col md={{ span: 20, offset: 4 }} xs={{ span: 24, offset: 0 }}>
                  <div className={classes.contentStyle}>
                    <Space
                      size={[token.size / 2, token.size / 2]}
                      direction='vertical'
                      className={globalClasses.fulWidth}
                    >
                      <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                        <Flex
                          justify={'space-between'}
                          align={'center'}
                          className={'w-full'}
                          gap={token.size}
                        >
                          <AutoComplete
                            value={activeFieldIndex === key ? currentSearch : ''}
                            autoFocus={true}
                            allowClear={{
                              clearIcon: <CloseCircleOutlined style={{ fontSize: 14 }} />,
                            }}
                            options={activeFieldIndex === key ? options : []}
                            onSearch={(text) => onSearch(text, key)}
                            onSelect={(value) => onSelect(nestIndex, key, value)}
                            placeholder='Search an example...'
                            className={'w-full'}
                          />

                          <Button
                            className={'min-w-10'}
                            danger
                            style={{ color: token.colorTextSecondary }}
                            onClick={() => {
                              confirmDeleteModal({
                                onOk: () => {
                                  remove(key)
                                },
                              })
                            }}
                            icon={<DeleteOutlined />}
                          />
                        </Flex>
                      </Row>

                      <Row gutter={[token.size / 4, token.size / 4]} align={'middle'}>
                        <Col md={24} xs={24}>
                          <Controller
                            control={control}
                            name={`meanings.${nestIndex}.examples.${key}.origin`}
                            render={({ field }) => (
                              <TextArea
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                placeholder='Original:'
                                {...field}
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
                              />
                            )}
                          />
                        </Col>
                      </Row>
                    </Space>
                  </div>
                </Col>
              </Row>
            </Col>
          )
        })}
      </Space>
    </>
  )
}
