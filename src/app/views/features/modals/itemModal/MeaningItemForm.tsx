import globalStyles from '@/style/appStyle.module.scss'
import {
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { patternValidation } from '@/core/utils'
import { ECategory, EType, IItem } from '@/models/item.model'
import { InputTag } from '@/views/components'
import { theme, Space, Col, Row, Button, Select, Checkbox, Input, Flex } from 'antd'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { meaningItem } from './data'
import { ExampleItem } from './ExampleItemForm'
import styles from './style.module.scss'
import clsx from 'clsx'
import { TextEditor } from '@/views/components'
import { usePrompt } from '@/helpers/hooks'
import { useEffect, useState } from 'react'
import { getType } from '@/helpers/item'
import { useSelector } from '@/core/hooks'

interface IProps {
  origin?: string
  loading?: boolean
  catType: ECategory
  onSubmit?: () => void
}

export const MeaningItemForm: React.FC<IProps> = ({ catType, loading = false, onSubmit }) => {
  const { token } = theme.useToken()

  const [show, setShow] = useState<boolean[]>([])

  const { types } = useSelector((state) => state.setting)

  const { confirmDeleteModal } = usePrompt()

  const { control, getValues, trigger, watch } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({ control, name: 'meanings' })

  useEffect(() => {
    setShow(new Array(fields?.length).fill(false))
  }, [])

  return (
    <Space
      direction='vertical'
      size={[token.size / 2, token.size / 2]}
      className={globalStyles.fulWidth}
      style={{ marginBottom: `${token.size}px` }}
    >
      <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
        <Col md={4} xs={6}>
          <label htmlFor=''>Meaning:</label>
        </Col>

        <Col md={20} xs={16}>
          <Button
            onClick={() => {
              setShow((prev) => [true, ...prev])
              fields.length > 0
                ? prepend({
                    ...meaningItem,
                    pronunciation: {
                      uk: getValues(`meanings.0.pronunciation.uk`),
                      us: getValues(`meanings.0.pronunciation.us`),
                      common: getValues(`meanings.0.pronunciation.common`),
                    },
                  })
                : prepend({ ...meaningItem })
            }}
            type='primary'
            icon={<PlusOutlined />}
          />
        </Col>
      </Row>

      {fields.map((field, index) => {
        const enable = watch(`meanings.${index}.enable`)
        const definition = watch(`meanings.${index}.definition`)
        const translation = watch(`meanings.${index}.translation`)

        return (
          <div
            className={clsx(
              styles.contentStyle,
              !enable && styles.disableMeaning,
              !definition && !translation && styles.disableMeaning,
            )}
            key={field.id || index}
          >
            <Space
              direction='vertical'
              size={[token.size / 2, token.size]}
              className={globalStyles.fulWidth}
            >
              <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                <Col
                  xs={{ span: show[index] ? 6 : 3 }}
                  sm={{ span: show[index] ? 6 : 2 }}
                  style={{ display: 'flex' }}
                >
                  <Button
                    type={'text'}
                    onClick={() => {
                      setShow((prev) => {
                        const previous = [...prev]
                        previous[index] = !prev[index]
                        return previous
                      })
                    }}
                    icon={show[index] ? <CaretDownOutlined /> : <CaretRightOutlined />}
                    style={{ color: token.colorPrimary }}
                  />
                </Col>

                <Col
                  xs={{ span: show[index] ? 12 : 15 }}
                  sm={{ span: show[index] ? 12 : 18 }}
                  style={{ display: 'flex' }}
                >
                  {show[index] && catType === ECategory.WORD && (
                    <Controller
                      control={control}
                      name={`meanings.${index}.typeId`}
                      render={({ field }) => (
                        <Select
                          className={globalStyles.fulWidth}
                          rootClassName={'text-center'}
                          {...field}
                          options={types
                            .filter((item) => item.value !== EType.ALL)
                            .map((item) => ({
                              ...item,
                              label: getType(item.value).origin,
                            }))}
                          defaultValue={EType.NOUN}
                        />
                      )}
                    />
                  )}

                  {!show[index] && (
                    <Flex
                      align={'center'}
                      gap={token.size / 2}
                      wrap={'wrap'}
                      className={'max-w-full'}
                    >
                      {catType === ECategory.WORD && (
                        <div
                          className={'text-xs self-center'}
                        >{`(${getType(getValues(`meanings.${index}.typeId`)).abbr})`}</div>
                      )}

                      <div
                        className={clsx('text-sm self-center flex-1', styles.showMeaningOption)}
                        dangerouslySetInnerHTML={{
                          __html: getValues(`meanings.${index}.translation`),
                        }}
                      />
                    </Flex>
                  )}
                </Col>

                <Col
                  xs={{ span: 6 }}
                  sm={{ span: show[index] ? 6 : 4 }}
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Flex gap={token.size / 4} justify={'flex-end'}>
                    <Button
                      type={'text'}
                      onClick={onSubmit}
                      disabled={loading}
                      icon={<SaveOutlined />}
                      style={{ color: token.colorPrimary }}
                    />

                    <Button
                      style={{ color: token.colorTextSecondary }}
                      type={'text'}
                      onClick={() => {
                        confirmDeleteModal({
                          onOk: () => {
                            remove(index)
                            setShow((prev) => prev.filter((_, key) => key !== index))
                          },
                        })
                      }}
                      icon={<DeleteOutlined />}
                    />
                  </Flex>
                </Col>
              </Row>

              {show[index] && (
                <Space
                  direction='vertical'
                  size={[token.size / 2, token.size / 2]}
                  className={clsx(globalStyles.fulWidth)}
                >
                  <Row gutter={[token.size / 2, token.size]} align={'middle'}>
                    <Col
                      md={{
                        span: 10,
                        offset: 4,
                        order: 2,
                      }}
                      xs={{
                        span: 12,
                        order: 1,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.enable`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox
                            checked={value}
                            onChange={(e) => {
                              onChange(e)
                              trigger()
                            }}
                          >
                            Enable
                          </Checkbox>
                        )}
                      />
                    </Col>

                    <Col
                      md={{
                        span: 5,
                        order: 2,
                      }}
                      xs={{
                        span: 8,
                        order: 2,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.common`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox checked={value} onChange={onChange}>
                            Common
                          </Checkbox>
                        )}
                      />
                    </Col>
                  </Row>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      {catType !== ECategory.WORD && (
                        <>
                          <Col md={4} xs={24}>
                            <label htmlFor=''>
                              Pronunciation:
                              {/* {!getValues(`meanings.${index}.pronunciation.common`) && (
                              <Popover title={msgWarning.empty}>
                                <WarningOutlined className={styles.alertIcon} />
                              </Popover>
                            )} */}
                            </label>
                          </Col>

                          <Col md={20} xs={24}>
                            <Controller
                              control={control}
                              name={`meanings.${index}.pronunciation.common`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  onBlur={() => trigger()}
                                  onInput={(e) => {
                                    const input = e.target as HTMLInputElement
                                    input.value = input.value
                                      .toLowerCase()
                                      .replace(patternValidation.specialCharacterPronouns, '')
                                  }}
                                />
                              )}
                            />
                          </Col>
                        </>
                      )}

                      {catType === ECategory.WORD && (
                        <>
                          <Col md={4} xs={24}>
                            <label htmlFor=''>Pronunciation:</label>
                          </Col>

                          <Col md={10} xs={12}>
                            <Row gutter={[token.size / 4, token.size / 4]}>
                              {/* <Col xs={24}>
                              UK
                              {!getValues(`meanings.${index}.pronunciation.uk`) && (
                                <Popover title={msgWarning.empty}>
                                  <WarningOutlined className={styles.alertIcon} />
                                </Popover>
                              )}
                            </Col> */}
                              <Col xs={24}>
                                <Controller
                                  control={control}
                                  name={`meanings.${index}.pronunciation.uk`}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      // placeholder='UK'
                                      onBlur={() => trigger()}
                                      onInput={(e) => {
                                        const input = e.target as HTMLInputElement
                                        input.value = input.value
                                          .toLowerCase()
                                          .replace(patternValidation.specialCharacterPronouns, '')
                                      }}
                                    />
                                  )}
                                />
                              </Col>
                            </Row>
                          </Col>

                          <Col md={10} xs={12}>
                            <Row gutter={[token.size / 4, token.size / 4]}>
                              {/* <Col xs={24}>
                              US
                              {!getValues(`meanings.${index}.pronunciation.us`) && (
                                <Popover title='This field is missing!'>
                                  <WarningOutlined className={styles.alertIcon} />
                                </Popover>
                              )}
                            </Col> */}
                              <Col xs={24}>
                                <Controller
                                  control={control}
                                  name={`meanings.${index}.pronunciation.us`}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      // placeholder='US'
                                      onBlur={() => trigger()}
                                      onInput={(e) => {
                                        const input = e.target as HTMLInputElement
                                        input.value = input.value
                                          .toLowerCase()
                                          .replace(patternValidation.specialCharacterPronouns, '')
                                      }}
                                    />
                                  )}
                                />
                              </Col>
                            </Row>
                          </Col>
                        </>
                      )}
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={24}>
                        <label htmlFor=''>Note:</label>
                      </Col>

                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.note`}
                          render={({ field: { onChange, value } }) => (
                            <TextEditor content={value} onChange={onChange} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={24}>
                        <label htmlFor=''>Definition:</label>
                      </Col>

                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.definition`}
                          render={({ field: { onChange, value } }) => (
                            <TextEditor content={value} onChange={onChange} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={24}>
                        <label htmlFor=''>Translation:</label>
                      </Col>

                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.translation`}
                          render={({ field: { onChange, value } }) => (
                            <TextEditor content={value} onChange={onChange} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={24}>
                        <label htmlFor=''>Collocations:</label>
                      </Col>

                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.collocations`}
                          render={({ field: { onChange, value } }) => (
                            <TextEditor content={value} onChange={onChange} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={24}>
                        <label htmlFor=''>Grammar:</label>
                      </Col>

                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.grammar`}
                          render={({ field: { onChange, value } }) => (
                            <TextEditor content={value} onChange={onChange} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={6}>
                        Synonyms:
                      </Col>

                      <Col md={20} xs={18}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.synonyms`}
                          render={({ field: { onChange, value } }) => (
                            <InputTag tags={value} onChange={(val: string[]) => onChange(val)} />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                      <Col md={4} xs={6}>
                        Antonyms:
                      </Col>

                      <Col md={20} xs={18}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.antonyms`}
                          render={({ field: { onChange, value } }) => (
                            <InputTag
                              onChange={(value: string[]) => onChange(value)}
                              tags={value}
                            />
                          )}
                        />
                      </Col>
                    </Row>
                  </Col>

                  <ExampleItem nestIndex={index} />
                </Space>
              )}
            </Space>
          </div>
        )
      })}
    </Space>
  )
}
