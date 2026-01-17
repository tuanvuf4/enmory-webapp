import globalStyle from '@/style/appStyle'
import { PlusOutlined, DeleteOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IItem } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { theme, Space, Col, Row, Button, Switch, AutoComplete, Flex } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useState } from 'react'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { exampleItem } from '.'
import styles from './style'
import clsx from 'clsx'

interface IProps {
  nestIndex: number
}

export const ExampleItem: React.FC<IProps> = ({ nestIndex }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const [currentSearch, setCurrentSearch] = useState<string>('')

  const { confirmDeleteModal } = usePrompt()

  const { options } = useAutoComplete(currentSearch, 'example')

  const { control, setValue, getValues, trigger } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({
    control,
    name: `meanings.${nestIndex}.examples`,
  })

  const onSearch = (searchText: string) => {
    setCurrentSearch(searchText)
  }

  const addExample = (): void => {
    prepend({ ...exampleItem })
  }

  const onSelect = (idxNested: number, idxExp: number, value: string) => {
    exampleApi.getExampleById(value).then(({ isSuccess, content }) => {
      if (isSuccess && content) {
        setCurrentSearch(content.original)
        setValue(`meanings.${idxNested}.examples.${idxExp}.original`, content.original)
        setValue(`meanings.${idxNested}.examples.${idxExp}.translation`, content.translation)
        setValue(`meanings.${idxNested}.examples.${idxExp}.id`, content.id)
      }
    })
  }

  return (
    <>
      <Space
        direction='vertical'
        size={[token.size / 2, token.size / 2]}
        className={gClasses.fulWidth}
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
                      className={gClasses.fulWidth}
                    >
                      <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                        <Flex
                          justify={'space-between'}
                          align={'center'}
                          className={'w-full'}
                          gap={token.size}
                        >
                          <Controller
                            control={control}
                            name={`meanings.${nestIndex}.examples.${key}.auto`}
                            render={({ field: { onChange, value, ref } }) => (
                              <Switch
                                ref={ref}
                                title={'Type to search...' + value + ''}
                                checked={value}
                                defaultChecked={value}
                                onChange={(e) => {
                                  onChange(e)
                                  trigger()
                                }}
                              />
                            )}
                          />

                          <AutoComplete
                            value={currentSearch}
                            disabled={!getValues(`meanings.${nestIndex}.examples.${key}.auto`)}
                            autoFocus={true}
                            allowClear={{
                              clearIcon: <CloseCircleOutlined style={{ fontSize: 14 }} />,
                            }}
                            options={options}
                            onSearch={onSearch}
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
                            name={`meanings.${nestIndex}.examples.${key}.original`}
                            render={({ field }) => (
                              <TextArea
                                disabled={getValues(`meanings.${nestIndex}.examples.${key}.auto`)}
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
                                disabled={getValues(`meanings.${nestIndex}.examples.${key}.auto`)}
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
